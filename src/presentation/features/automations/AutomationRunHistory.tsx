import { useCallback, useEffect, useState } from 'react'
import { appServices } from '../../../core/container'
import type { AutomationRun, AutomationRunStatus, AutomationRunStep } from '../../../domain/automation/workflow'

type Props = { dealerId: string; workflowId: string }
type Action = 'cancel' | 'retry' | 'replay'

const STATUS_LABELS: Record<AutomationRunStatus, string> = {
  queued: 'En cola', running: 'Procesando', waiting: 'En espera', succeeded: 'Completada',
  failed: 'Fallida', dead_letter: 'Dead-letter', cancelled: 'Cancelada',
}
const STEP_LABELS: Record<AutomationRunStep['status'], string> = { running: 'Procesando', succeeded: 'Completado', failed: 'Fallido', cancelled: 'Cancelado' }
const NODE_LABELS: Record<AutomationRunStep['nodeType'], string> = {
  'trigger.event': 'Trigger de evento', 'condition.if': 'Condición IF', 'condition.switch': 'Condición Switch', 'flow.wait': 'Esperar',
  'opportunity.update_stage': 'Cambiar etapa', 'opportunity.assign': 'Asignar oportunidad', 'appointment.update_status': 'Cambiar estado de cita', 'contact.manage_tag': 'Gestionar etiqueta', 'contact.update_field': 'Actualizar campo', 'conversation.assign': 'Asignar conversación', 'flow.end': 'Fin de ruta',
}

export default function AutomationRunHistory({ dealerId, workflowId }: Props) {
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [pendingAction, setPendingAction] = useState<Action | null>(null)
  const selectedRun = runs.find((run) => run.id === selectedId) ?? runs[0] ?? null

  const refresh = useCallback(async (preferredId?: string, initialLoad = false) => {
    if (!initialLoad) { setLoading(true); setError('') }
    try {
      const nextRuns = await appServices.automationWorkflows.listRuns(dealerId, workflowId)
      setRuns(nextRuns)
      setSelectedId((current) => preferredId && nextRuns.some((run) => run.id === preferredId) ? preferredId : current && nextRuns.some((run) => run.id === current) ? current : nextRuns[0]?.id ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar el historial de ejecuciones.') }
    finally { setLoading(false) }
  }, [dealerId, workflowId])

  useEffect(() => {
    const request = window.setTimeout(() => { void refresh(undefined, true) }, 0)
    return () => window.clearTimeout(request)
  }, [refresh])

  async function runAction() {
    if (!pendingAction || !selectedRun) return
    setActionBusy(true); setActionError('')
    try {
      let result: { run: { id: string } }
      if (pendingAction === 'cancel') result = await appServices.automationWorkflows.cancelRun(dealerId, selectedRun.id)
      else if (pendingAction === 'retry') result = await appServices.automationWorkflows.retryRun(dealerId, selectedRun.id)
      else result = await appServices.automationWorkflows.replayRun(dealerId, selectedRun.id, crypto.randomUUID())
      setPendingAction(null)
      await refresh(result.run.id)
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No pudimos completar la acción.'); setPendingAction(null) }
    finally { setActionBusy(false) }
  }

  const canCancel = selectedRun ? ['queued', 'running', 'waiting'].includes(selectedRun.status) : false
  const canRetry = selectedRun ? ['failed', 'dead_letter'].includes(selectedRun.status) : false

  return <section className="automation-runs" aria-label="Historial de ejecuciones">
    <aside className="automation-runs-list">
      <div className="automation-runs-heading"><div><p className="eyebrow">HISTORIAL</p><h2>Ejecuciones</h2></div><button className="secondary" onClick={() => void refresh()} disabled={loading} aria-label="Actualizar historial">↻ Actualizar</button></div>
      {loading && !runs.length ? <p className="automation-runs-message" role="status">Cargando ejecuciones…</p> : error ? <div className="automation-runs-message"><p role="alert">{error}</p><button className="secondary" onClick={() => void refresh()}>Reintentar</button></div> : runs.length ? <div className="automation-run-cards">{runs.map((run) => <button key={run.id} className={`automation-run-card${selectedRun?.id === run.id ? ' is-selected' : ''}`} onClick={() => setSelectedId(run.id)} aria-pressed={selectedRun?.id === run.id}>
        <span className={`automation-run-status status--${run.status}`}>{STATUS_LABELS[run.status]}</span><strong>{run.eventType}</strong><span>Generación {run.generation} · {run.steps.length} pasos</span><time dateTime={run.createdAt}>{formatDate(run.createdAt)}</time>
      </button>)}</div> : <div className="automation-runs-empty"><span>◷</span><strong>Aún no hay ejecuciones</strong><p>Cuando un workflow genere actividad, aparecerá aquí.</p></div>}
    </aside>

    <div className="automation-run-detail">
      {actionError && <p className="automation-run-error" role="alert">{actionError}</p>}
      {selectedRun ? <>
        <header className="automation-run-detail-heading"><div><p className="eyebrow">DETALLE DE EJECUCIÓN</p><h2>{selectedRun.eventType}</h2><p>Generación {selectedRun.generation} · Workflow v{selectedRun.workflowRevision}</p></div><span className={`automation-run-status status--${selectedRun.status}`}>{STATUS_LABELS[selectedRun.status]}</span></header>
        <div className="automation-run-facts"><div><span>Creada</span><strong>{formatDate(selectedRun.createdAt)}</strong></div><div><span>Inició</span><strong>{formatDate(selectedRun.startedAt)}</strong></div><div><span>Próxima ejecución</span><strong>{selectedRun.status === 'queued' || selectedRun.status === 'waiting' ? formatDate(selectedRun.availableAt) : '—'}</strong></div><div><span>Intentos</span><strong>{selectedRun.attempts}</strong></div></div>
        {selectedRun.lastError && <div className="automation-run-last-error"><strong>Último error</strong><p>{selectedRun.lastError}</p></div>}
        <div className="automation-run-steps-heading"><h3>Pasos</h3><span>{selectedRun.steps.length}</span></div>
        {selectedRun.steps.length ? <ol className="automation-run-steps">{selectedRun.steps.map((step, index) => <li key={`${step.nodeId}-${index}`} className={`automation-run-step step--${step.status}`}>
          <span className="automation-run-step-marker">{index + 1}</span><div className="automation-run-step-body"><div className="automation-run-step-title"><strong>{NODE_LABELS[step.nodeType]}</strong><span>{STEP_LABELS[step.status]}</span></div><small>{formatDate(step.startedAt)}{step.finishedAt ? ` · ${formatDate(step.finishedAt)}` : ''} · {step.attempts} intentos</small>
            {step.error && <p className="automation-run-step-error">{step.error}</p>}{step.output !== null && step.output !== undefined && <details className="automation-run-output"><summary>Ver salida</summary><pre>{formatOutput(step.output)}</pre></details>}
          </div>
        </li>)}</ol> : <p className="automation-runs-message">Esta ejecución todavía no tiene pasos registrados.</p>}
        <footer className="automation-run-actions">{canCancel && <button className="secondary" onClick={() => setPendingAction('cancel')}>Cancelar ejecución</button>}{canRetry && <button className="primary" onClick={() => setPendingAction('retry')}>Reintentar</button>}<button className="secondary" onClick={() => setPendingAction('replay')}>Reproducir desde el inicio</button></footer>
      </> : !loading && !error ? <div className="automation-runs-empty automation-runs-empty--detail"><span>◷</span><strong>Selecciona una ejecución</strong><p>Verás el estado, los pasos y las acciones disponibles.</p></div> : null}
    </div>

    {pendingAction && selectedRun && <div className="automation-modal-backdrop" role="presentation"><section className="automation-run-confirm" role="dialog" aria-modal="true" aria-labelledby="automation-run-confirm-title"><p className="eyebrow">CONFIRMAR ACCIÓN</p><h2 id="automation-run-confirm-title">{actionTitle(pendingAction)}</h2><p>{pendingAction === 'replay' ? 'Esto crea una nueva ejecución desde el trigger y puede volver a ejecutar acciones CRM.' : pendingAction === 'retry' ? 'La ejecución fallida volverá a la cola para procesarse.' : 'La ejecución en curso se marcará como cancelada.'}</p><div><button className="secondary" onClick={() => setPendingAction(null)} disabled={actionBusy}>Volver</button><button className="primary" onClick={() => void runAction()} disabled={actionBusy}>{actionBusy ? 'Procesando…' : 'Confirmar'}</button></div></section></div>}
  </section>
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatOutput(value: unknown): string {
  try { const serialized = JSON.stringify(value, null, 2); return serialized.length > 1600 ? `${serialized.slice(0, 1600)}\n…` : serialized }
  catch { return 'La salida no se pudo mostrar.' }
}

function actionTitle(action: Action): string { return action === 'cancel' ? '¿Cancelar esta ejecución?' : action === 'retry' ? '¿Reintentar esta ejecución?' : '¿Reproducir esta ejecución?' }
