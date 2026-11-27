import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { appServices } from '../../../core/container'
import type { ContactDealer } from '../../../domain/contact/contact'
import { AUTOMATION_EVENTS, validateWorkflow, type AutomationEvent, type ConditionField, type ConditionOperator, type WorkflowDefinition, type WorkflowEdge, type WorkflowNode, type WorkflowNodeType, type WorkflowRecord } from '../../../domain/automation/workflow'
import Icon from '../../components/Icon'
import './automation-workflows.css'

const FIELD_OPTIONS: Array<{ value: ConditionField; label: string }> = [
  { value: 'event.type', label: 'Tipo de evento' }, { value: 'event.origin', label: 'Origen del evento' },
  { value: 'contact.source', label: 'Origen del contacto' }, { value: 'message.channel', label: 'Canal del mensaje' },
  { value: 'conversation.status', label: 'Estado de conversación' }, { value: 'opportunity.stage', label: 'Etapa de oportunidad' },
  { value: 'appointment.status', label: 'Estado de cita' },
]
const OPERATOR_OPTIONS: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'equals', label: 'es igual a' }, { value: 'not_equals', label: 'no es igual a' }, { value: 'contains', label: 'contiene' },
  { value: 'is_empty', label: 'está vacío' }, { value: 'is_not_empty', label: 'tiene un valor' },
]
const OPPORTUNITY_STAGE_OPTIONS = [
  { value: 'new', label: 'Nuevo' }, { value: 'working', label: 'En proceso' }, { value: 'closing', label: 'Cierre' },
  { value: 'won', label: 'Ganada' }, { value: 'lost', label: 'Perdida' },
] as const
const NODE_WIDTH = 250
const NODE_HEIGHT = 136

type Props = { search: string }
type DragState = { id: string; pointerId: number; x: number; y: number; originX: number; originY: number }
type PanState = { pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number }
const CANVAS_WIDTH = 1800
const CANVAS_HEIGHT = 1150
const MINIMAP_INSET = 12
const MINIMAP_WIDTH = 124
const MINIMAP_HEIGHT = 70
const EDITOR_WORKFLOW_KEY = 'bdc-os:automation-editor:'

export default function AutomationWorkflowsView({ search }: Props) {
  const [dealers, setDealers] = useState<ContactDealer[]>([])
  const [dealerId, setDealerId] = useState('')
  const [items, setItems] = useState<Array<{ id: string; name: string; draftRevision: number; publishedRevision: number | null; updatedAt: string }>>([])
  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null)
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [zoom, setZoom] = useState(0.9)
  const [connectFrom, setConnectFrom] = useState<{ nodeId: string; port: 'next' | 'true' | 'false' } | null>(null)
  const [connectMessage, setConnectMessage] = useState('')
  const [savedNotice, setSavedNotice] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const minimapViewportRef = useRef<HTMLSpanElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const panRef = useRef<PanState | null>(null)
  const editorOpen = definition !== null

  useEffect(() => {
    const shell = canvasRef.current
    if (!shell) return

    const updateViewport = () => {
      const viewport = minimapViewportRef.current
      if (!viewport) return
      const contentWidth = Math.max(shell.scrollWidth, shell.clientWidth)
      const contentHeight = Math.max(shell.scrollHeight, shell.clientHeight)
      const width = Math.min(MINIMAP_WIDTH, shell.clientWidth / contentWidth * MINIMAP_WIDTH)
      const height = Math.min(MINIMAP_HEIGHT, shell.clientHeight / contentHeight * MINIMAP_HEIGHT)
      const horizontalRange = Math.max(1, shell.scrollWidth - shell.clientWidth)
      const verticalRange = Math.max(1, shell.scrollHeight - shell.clientHeight)
      viewport.style.left = `${MINIMAP_INSET + shell.scrollLeft / horizontalRange * (MINIMAP_WIDTH - width)}px`
      viewport.style.top = `${MINIMAP_INSET + shell.scrollTop / verticalRange * (MINIMAP_HEIGHT - height)}px`
      viewport.style.width = `${width}px`
      viewport.style.height = `${height}px`
    }

    const updateFrame = window.requestAnimationFrame(updateViewport)
    shell.addEventListener('scroll', updateViewport, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateViewport)
    observer?.observe(shell)
    return () => { window.cancelAnimationFrame(updateFrame); shell.removeEventListener('scroll', updateViewport); observer?.disconnect() }
  }, [editorOpen, zoom])

  useEffect(() => {
    let mounted = true
    appServices.contacts.listDealers().then((result) => {
      if (!mounted) return
      setDealers(result)
      if (result[0]) setDealerId(result[0].id)
      else { setLoading(false); setError('Tu usuario no tiene un dealer activo asignado.') }
    }).catch((cause: unknown) => {
      if (mounted) { setLoading(false); setError(cause instanceof Error ? cause.message : 'No pudimos cargar tus dealers.') }
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!dealerId) return
    let mounted = true
    setLoading(true); setError(''); setWorkflow(null); setDefinition(null)
    const savedWorkflowId = (() => { try { return window.sessionStorage.getItem(`${EDITOR_WORKFLOW_KEY}${dealerId}`) } catch { return null } })()
    if (savedWorkflowId) appServices.automationWorkflows.get(dealerId, savedWorkflowId).then((result) => {
      if (mounted) { setWorkflow(result.workflow); setDefinition(result.workflow.draft.definition) }
    }).catch(() => {
      try { window.sessionStorage.removeItem(`${EDITOR_WORKFLOW_KEY}${dealerId}`) } catch { /* The editor can still open without browser storage. */ }
    })
    appServices.automationWorkflows.list(dealerId).then((result) => { if (mounted) setItems(result) })
      .catch((cause: unknown) => { if (mounted) setError(cause instanceof Error ? cause.message : 'No pudimos cargar las automatizaciones.') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [dealerId])

  const localIssues = useMemo(() => definition ? validateWorkflow(definition) : [], [definition])
  const selectedNode = definition?.nodes.find((node) => node.id === selectedNodeId) ?? null
  const visibleItems = items.filter((item) => item.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))

  async function openWorkflow(id: string) {
    setError(''); setSavedNotice(''); setConnectFrom(null); setConnectMessage('')
    try {
      const result = await appServices.automationWorkflows.get(dealerId, id)
      setWorkflow(result.workflow); setDefinition(result.workflow.draft.definition); setSelectedNodeId(null)
      try { window.sessionStorage.setItem(`${EDITOR_WORKFLOW_KEY}${dealerId}`, id) } catch { /* The editor can still open without browser storage. */ }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos abrir el borrador.') }
  }

  async function createWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = nameDraft.trim()
    if (!dealerId || !name) return
    setSaving(true); setError('')
    try {
      const result = await appServices.automationWorkflows.create(dealerId, name)
      setWorkflow(result.workflow); setDefinition(result.workflow.draft.definition)
      try { window.sessionStorage.setItem(`${EDITOR_WORKFLOW_KEY}${dealerId}`, result.workflow.id) } catch { /* The editor can still open without browser storage. */ }
      setItems((current) => [{ id: result.workflow.id, name: result.workflow.name, draftRevision: result.workflow.draft.revision, publishedRevision: null, updatedAt: result.workflow.draft.updatedAt }, ...current])
      setNameDraft(''); setShowCreate(false); setSelectedNodeId(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos crear el borrador.') }
    finally { setSaving(false) }
  }

  async function saveDraft() {
    if (!workflow || !definition || !dealerId) return
    setSaving(true); setError(''); setSavedNotice('')
    try {
      const result = await appServices.automationWorkflows.saveDraft(dealerId, workflow, definition.name, definition)
      setWorkflow(result.workflow); setDefinition(result.workflow.draft.definition)
      setItems((current) => current.map((item) => item.id === workflow.id ? { ...item, name: result.workflow.name, draftRevision: result.workflow.draft.revision, updatedAt: result.workflow.draft.updatedAt } : item))
      setSavedNotice('Borrador guardado')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar el borrador.') }
    finally { setSaving(false) }
  }

  function changeNode(nodeId: string, update: (node: WorkflowNode) => WorkflowNode) {
    setDefinition((current) => current ? { ...current, nodes: current.nodes.map((node) => node.id === nodeId ? update(node) : node) } : current)
  }

  function addNode(type: WorkflowNodeType) {
    if (!definition) return
    if (type === 'trigger.event' && definition.nodes.some((node) => node.type === 'trigger.event')) { setConnectMessage('Este workflow admite un solo trigger.'); return }
    const id = crypto.randomUUID()
    const offset = definition.nodes.length * 24
    const node: WorkflowNode = type === 'trigger.event'
      ? { id, type, position: { x: 100 + offset, y: 100 + offset }, config: { eventType: 'message.received' } }
      : type === 'condition.if'
        ? { id, type, position: { x: 400 + offset, y: 100 + offset }, config: { field: 'message.channel', operator: 'equals', value: 'messenger' } }
        : type === 'flow.wait'
          ? { id, type, position: { x: 650 + offset, y: 100 + offset }, config: { durationSeconds: 60 } }
          : type === 'opportunity.update_stage'
            ? { id, type, position: { x: 430 + offset, y: 100 + offset }, config: { stage: 'working' } }
          : { id, type, position: { x: 760 + offset, y: 100 + offset }, config: { outcome: 'complete' } }
    setDefinition((current) => current ? { ...current, nodes: [...current.nodes, node] } : current)
    setSelectedNodeId(id); setConnectMessage('')
  }

  function removeSelectedNode() {
    if (!selectedNodeId) return
    const id = selectedNodeId
    setDefinition((current) => current ? { ...current, nodes: current.nodes.filter((node) => node.id !== id), edges: current.edges.filter((edge) => edge.source !== id && edge.target !== id) } : current)
    setSelectedNodeId(null)
  }

  function clickOutput(nodeId: string, port: 'next' | 'true' | 'false') {
    setConnectFrom({ nodeId, port })
    setConnectMessage('Ahora elige la entrada del nodo de destino.')
  }

  function clickInput(targetId: string) {
    if (!connectFrom || !definition) return
    if (connectFrom.nodeId === targetId) { setConnectMessage('Un nodo no puede conectarse consigo mismo.'); return }
    if (definition.edges.some((edge) => edge.target === targetId)) { setConnectMessage('Ese nodo ya tiene una entrada conectada.'); return }
    const edge: WorkflowEdge = { id: crypto.randomUUID(), source: connectFrom.nodeId, sourcePort: connectFrom.port, target: targetId, targetPort: 'in' }
    setDefinition((current) => current ? { ...current, edges: [...current.edges, edge] } : current)
    setConnectFrom(null); setConnectMessage('Conexión creada.')
  }

  function startMove(event: PointerEvent<HTMLButtonElement>, node: WorkflowNode) {
    if (event.button !== 0) return
    event.preventDefault(); event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id: node.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: node.position.x, originY: node.position.y }
  }

  function moveNode(event: PointerEvent<HTMLElement>) {
    const pan = panRef.current
    if (pan && pan.pointerId === event.pointerId) {
      const shell = canvasRef.current
      if (shell) { shell.scrollLeft = pan.scrollLeft - (event.clientX - pan.x); shell.scrollTop = pan.scrollTop - (event.clientY - pan.y) }
      return
    }
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = (event.clientX - drag.x) / zoom; const dy = (event.clientY - drag.y) / zoom
    setDefinition((current) => current ? { ...current, nodes: current.nodes.map((node) => node.id === drag.id ? { ...node, position: { x: Math.max(0, drag.originX + dx), y: Math.max(0, drag.originY + dy) } } : node) } : current)
  }

  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('button,input,select,textarea,a,[role="button"],.automation-node')) return
    const shell = event.currentTarget
    event.preventDefault()
    shell.setPointerCapture(event.pointerId)
    panRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: shell.scrollLeft, scrollTop: shell.scrollTop }
    setIsPanning(true)
  }

  function endMove(event: PointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
    if (panRef.current?.pointerId === event.pointerId) { panRef.current = null; setIsPanning(false) }
  }

  if (workflow && definition) return <section className="automation-editor automation-editor--fullscreen">
    <header className="automation-editor-header">
      <button className="automation-back" onClick={() => { setWorkflow(null); setDefinition(null); setConnectFrom(null); setError(''); try { window.sessionStorage.removeItem(`${EDITOR_WORKFLOW_KEY}${dealerId}`) } catch { /* Navigation still works without browser storage. */ } }} aria-label="Volver a automatizaciones"><Icon name="arrow-left" size={16} /><span>Volver</span></button>
      <div className="automation-title-group"><label className="automation-name-label" htmlFor="workflow-name">Nombre del borrador</label><input id="workflow-name" value={definition.name} maxLength={120} onChange={(event) => setDefinition((current) => current ? { ...current, name: event.target.value } : current)} /></div>
      <span className="automation-draft-badge">Borrador · v{workflow.draft.revision}</span>
      <div className="automation-save-actions"><span role="status">{saving ? 'Guardando…' : savedNotice}</span><button className="primary" disabled={saving || !definition.name.trim()} onClick={() => void saveDraft()}>Guardar borrador</button><button className="secondary" disabled title="Disponible cuando el motor y los nodos CRM estén listos.">Publicar</button></div>
    </header>
    {error && <div className="automation-alert" role="alert">{error}</div>}
    <div className="automation-editor-body">
      <aside className="automation-palette" aria-label="Agregar nodos"><p className="eyebrow">NODOS DEL CANVAS</p><h2>Agregar nodo</h2>
        <button onClick={() => addNode('trigger.event')} disabled={definition.nodes.some((node) => node.type === 'trigger.event')}><span className="palette-symbol trigger-symbol">↳</span><span><strong>Trigger de evento</strong><small>Entrada del workflow</small></span><Icon name="plus" size={15} /></button>
        <button onClick={() => addNode('condition.if')}><span className="palette-symbol condition-symbol">◇</span><span><strong>Condición IF</strong><small>Rutas verdadero / falso</small></span><Icon name="plus" size={15} /></button>
        <button onClick={() => addNode('flow.wait')}><span className="palette-symbol condition-symbol">◷</span><span><strong>Esperar</strong><small>Pausa y reanuda el workflow</small></span><Icon name="plus" size={15} /></button>
        <button onClick={() => addNode('opportunity.update_stage')}><span className="palette-symbol condition-symbol">↗</span><span><strong>Cambiar etapa</strong><small>Actualizar oportunidad del evento</small></span><Icon name="plus" size={15} /></button>
        <button onClick={() => addNode('flow.end')}><span className="palette-symbol end-symbol">■</span><span><strong>Fin</strong><small>Cierra una ruta</small></span><Icon name="plus" size={15} /></button>
        <div className="automation-palette-note"><Icon name="clock" size={15} /><span>Cambiar etapa ya se ejecuta dentro del dealer del evento. La publicación sigue bloqueada mientras cerramos la validación del motor.</span></div>
      </aside>
      <div className="automation-workspace">
        <div className="automation-canvas-toolbar"><div><span className="automation-status-dot" /> Borrador sin publicar <span className="automation-separator">·</span> Nueva York</div><div className="automation-canvas-tools"><button aria-label="Alejar" onClick={() => setZoom((value) => Math.max(.55, Math.round((value - .1) * 10) / 10))}>−</button><span>{Math.round(zoom * 100)}%</span><button aria-label="Acercar" onClick={() => setZoom((value) => Math.min(1.35, Math.round((value + .1) * 10) / 10))}>+</button><button onClick={() => { setZoom(.9); if (canvasRef.current) canvasRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' }) }}>Ajustar</button></div></div>
        <div className={`automation-canvas-shell${isPanning ? ' is-panning' : ''}`} ref={canvasRef} onPointerDown={startPan} onPointerMove={moveNode} onPointerUp={endMove} onPointerCancel={endMove}>
          <div className="automation-canvas" style={{ transform: `scale(${zoom})` }} onClick={(event) => { if (event.target === event.currentTarget) { setSelectedNodeId(null); setConnectMessage('') } }}>
            <svg className="automation-edges" width="1800" height="1150" aria-hidden="true">{definition.edges.map((edge) => {
              const source = definition.nodes.find((node) => node.id === edge.source); const target = definition.nodes.find((node) => node.id === edge.target)
              if (!source || !target) return null
              const sourceY = source.position.y + (source.type === 'condition.if' ? edge.sourcePort === 'true' ? 103 : 122 : NODE_HEIGHT - 20)
              const x1 = source.position.x + NODE_WIDTH; const y1 = sourceY; const x2 = target.position.x; const y2 = target.position.y + 26; const bend = Math.max(50, (x2 - x1) * .45)
              return <g key={edge.id}><path className="automation-edge-shadow" d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} /><path className="automation-edge-line" d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8}>{edge.sourcePort === 'true' ? 'Verdadero' : edge.sourcePort === 'false' ? 'Falso' : ''}</text></g>
            })}</svg>
            {!definition.nodes.length && <div className="automation-canvas-empty"><span className="automation-canvas-glyph"><Icon name="workflow" size={22} /></span><h2>Empieza con un trigger</h2><p>Elige qué evento de CRM inicia este workflow. Después puedes añadir condiciones y conectar sus salidas.</p><button className="primary" onClick={() => addNode('trigger.event')}><Icon name="plus" size={15} /> Añadir trigger</button></div>}
            {definition.nodes.map((node) => <article key={node.id} className={`automation-node automation-node--${node.type.replace('.', '-')} ${selectedNodeId === node.id ? 'is-selected' : ''}`} style={{ left: node.position.x, top: node.position.y }} onClick={() => setSelectedNodeId(node.id)}>
              {node.type !== 'trigger.event' && <button className={`automation-port automation-port--input ${definition.edges.some((edge) => edge.target === node.id) ? 'is-connected' : ''}`} aria-label={`Entrada de ${nodeTitle(node)}`} onClick={(event) => { event.stopPropagation(); clickInput(node.id) }} />}
              <header className="automation-node-header"><span className={`automation-node-icon node-icon--${node.type.replace('.', '-')}`}>{node.type === 'trigger.event' ? '↳' : node.type === 'condition.if' ? '◇' : node.type === 'flow.wait' ? '◷' : node.type === 'opportunity.update_stage' ? '↗' : '■'}</span><span><small>{node.type === 'trigger.event' ? 'TRIGGER' : node.type === 'condition.if' ? 'CONDICIÓN' : node.type === 'opportunity.update_stage' ? 'ACCIÓN CRM' : 'CONTROL'}</small><strong>{nodeTitle(node)}</strong></span><button className="automation-node-menu" aria-label={`Seleccionar ${nodeTitle(node)}`} onClick={(event) => { event.stopPropagation(); setSelectedNodeId(node.id) }}>•••</button></header>
              <div className="automation-node-detail">{node.type === 'trigger.event' ? <><span>Cuando ocurra</span><b>{node.config.eventType}</b></> : node.type === 'condition.if' ? <><span>{fieldTitle(node.config.field)} {OPERATOR_OPTIONS.find((item) => item.value === node.config.operator)?.label}</span><b>{node.config.value || 'sin valor'}</b></> : node.type === 'flow.wait' ? <><span>Pausar durante</span><b>{node.config.durationSeconds} segundos</b></> : node.type === 'opportunity.update_stage' ? <><span>Etapa objetivo</span><b>{OPPORTUNITY_STAGE_OPTIONS.find((stage) => stage.value === node.config.stage)?.label}</b></> : <><span>Resultado de la ruta</span><b>{node.config.outcome === 'complete' ? 'Completar' : 'Detener'}</b></>}</div>
              {node.type === 'trigger.event' || node.type === 'flow.wait' || node.type === 'opportunity.update_stage' ? <button className={`automation-port automation-port--output ${connectFrom?.nodeId === node.id ? 'is-armed' : ''}`} aria-label={`Salida siguiente de ${nodeTitle(node)}`} onClick={(event) => { event.stopPropagation(); clickOutput(node.id, 'next') }} /> : node.type === 'condition.if' ? <div className="automation-branch-ports"><button className={`automation-port automation-port--branch ${connectFrom?.nodeId === node.id && connectFrom.port === 'true' ? 'is-armed' : ''}`} aria-label="Salida verdadero" onClick={(event) => { event.stopPropagation(); clickOutput(node.id, 'true') }}><span>V</span></button><button className={`automation-port automation-port--branch automation-port--false ${connectFrom?.nodeId === node.id && connectFrom.port === 'false' ? 'is-armed' : ''}`} aria-label="Salida falso" onClick={(event) => { event.stopPropagation(); clickOutput(node.id, 'false') }}><span>F</span></button></div> : null}
              {node.type !== 'flow.end' && <button className="automation-node-drag" aria-label={`Mover ${nodeTitle(node)}`} onPointerDown={(event) => startMove(event, node)} onPointerMove={moveNode} onPointerUp={endMove}><Icon name="dots" size={14} /></button>}
            </article>)}
          </div>
        </div>
        <div className="automation-minimap" aria-label="Minimapa del workflow">
          <span ref={minimapViewportRef} style={{ left: MINIMAP_INSET, top: MINIMAP_INSET, width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }} />
          {definition.nodes.map((node) => <i key={node.id} style={{ left: `${MINIMAP_INSET + node.position.x / CANVAS_WIDTH * MINIMAP_WIDTH}px`, top: `${MINIMAP_INSET + node.position.y / CANVAS_HEIGHT * MINIMAP_HEIGHT}px` }} />)}
        </div>
        <footer className="automation-canvas-footer"><span>{connectMessage || (connectFrom ? 'Selecciona un nodo de destino.' : 'Selecciona un nodo para configurar. Arrástralo desde el control de movimiento.')}</span><span>{definition.nodes.length} nodos · {definition.edges.length} conexiones</span></footer>
      </div>
      <aside className="automation-inspector" aria-label="Configuración del nodo"><p className="eyebrow">CONFIGURACIÓN</p>{selectedNode ? <>
        <div className="automation-inspector-title"><span className={`automation-node-icon node-icon--${selectedNode.type.replace('.', '-')}`}>{selectedNode.type === 'trigger.event' ? '↳' : selectedNode.type === 'condition.if' ? '◇' : selectedNode.type === 'flow.wait' ? '◷' : selectedNode.type === 'opportunity.update_stage' ? '↗' : '■'}</span><div><h2>{nodeTitle(selectedNode)}</h2><small>{selectedNode.type}</small></div></div>
        {selectedNode.type === 'trigger.event' && <label className="automation-field">Evento que inicia el workflow<select value={selectedNode.config.eventType} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'trigger.event' ? { ...node, config: { eventType: event.target.value as AutomationEvent } } : node)}>{AUTOMATION_EVENTS.map((item) => <option key={item} value={item}>{item}</option>)}</select><small>Los datos entran desde el evento versionado de CRM.</small></label>}
        {selectedNode.type === 'condition.if' && <><label className="automation-field">Campo<select value={selectedNode.config.field} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'condition.if' ? { ...node, config: { ...node.config, field: event.target.value as ConditionField } } : node)}>{FIELD_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label className="automation-field">Operador<select value={selectedNode.config.operator} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'condition.if' ? { ...node, config: { ...node.config, operator: event.target.value as ConditionOperator, ...(['is_empty', 'is_not_empty'].includes(event.target.value) ? { value: undefined } : {}) } } : node)}>{OPERATOR_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>{!['is_empty', 'is_not_empty'].includes(selectedNode.config.operator) && <label className="automation-field">Valor<input value={selectedNode.config.value ?? ''} maxLength={200} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'condition.if' ? { ...node, config: { ...node.config, value: event.target.value } } : node)} /></label>}</>}
        {selectedNode.type === 'flow.wait' && <label className="automation-field">Duración (segundos)<input type="number" min={1} max={31536000} step={1} value={selectedNode.config.durationSeconds} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'flow.wait' ? { ...node, config: { durationSeconds: Number(event.target.value) } } : node)} /><small>Entre 1 segundo y 365 días. El run se guarda y se reanuda automáticamente.</small></label>}
        {selectedNode.type === 'opportunity.update_stage' && <label className="automation-field">Nueva etapa<select aria-label="Nueva etapa de la oportunidad" value={selectedNode.config.stage} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'opportunity.update_stage' ? { ...node, config: { stage: event.target.value as typeof node.config.stage } } : node)}>{OPPORTUNITY_STAGE_OPTIONS.map((stage) => <option value={stage.value} key={stage.value}>{stage.label}</option>)}</select><small>Actualiza la oportunidad que originó el evento, dentro del dealer del workflow.</small></label>}
        {selectedNode.type === 'flow.end' && <label className="automation-field">Al terminar<select value={selectedNode.config.outcome} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'flow.end' ? { ...node, config: { outcome: event.target.value as 'complete' | 'stop' } } : node)}><option value="complete">Completar workflow</option><option value="stop">Detener esta ruta</option></select></label>}
        <button className="automation-delete-node" onClick={removeSelectedNode}>Eliminar nodo</button>
      </> : <div className="automation-inspector-empty"><span>⌖</span><strong>Selecciona un nodo</strong><p>Sus opciones de configuración aparecerán aquí.</p></div>}
        {localIssues.length > 0 && <div className="automation-issues"><h3>Validación · {localIssues.length}</h3><ul>{localIssues.slice(0, 8).map((issue, index) => <li key={`${issue.code}-${issue.nodeId ?? ''}-${index}`}>{issue.message}</li>)}</ul></div>}
        {connectMessage && <p className="automation-connect-hint" role="status">{connectMessage}</p>}
      </aside>
    </div>
    <p className="automation-editor-footnote">Los borradores se guardan por dealer. La publicación aparecerá cuando el motor de ejecución y las acciones estén implementados.</p>
  </section>

  return <section className="automation-list-view">
    <header className="automation-page-heading"><div><p className="eyebrow">AUTOMATIZA EL TRABAJO DEL DEALER</p><h1>Automatizaciones</h1><p>Diseña flujos visuales con eventos y condiciones de tu CRM.</p></div><div className="automation-page-actions">{dealers.length > 1 && <label className="automation-dealer-select">Dealer<select value={dealerId} onChange={(event) => setDealerId(event.target.value)}>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</select></label>}<button className="primary" onClick={() => { setNameDraft(''); setShowCreate(true) }} disabled={!dealerId}><Icon name="plus" size={15} /> Nueva automatización</button></div></header>
    {error && <div className="automation-alert" role="alert">{error}<button className="secondary" onClick={() => { setError(''); setLoading(true); void appServices.automationWorkflows.list(dealerId).then(setItems).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No pudimos cargar las automatizaciones.')).finally(() => setLoading(false)) }}>Reintentar</button></div>}
    {loading ? <div className="automation-list-loading" aria-live="polite">Cargando automatizaciones…</div> : visibleItems.length ? <div className="automation-list-panel"><div className="automation-list-columns"><span>Workflow</span><span>Estado</span><span>Borrador</span><span>Última actualización</span><span /></div>{visibleItems.map((item) => <button className="automation-list-row" key={item.id} onClick={() => void openWorkflow(item.id)}><span className="automation-list-name"><i><Icon name="workflow" size={17} /></i><strong>{item.name}</strong></span><span><b className="automation-draft-label">Borrador</b></span><span>v{item.draftRevision}</span><span>{new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><Icon name="arrow" size={16} /></button>)}</div> : <div className="automation-empty"><span className="automation-empty-mark"><Icon name="workflow" size={24} /></span><h2>Empieza con un borrador</h2><p>Construye un workflow en el canvas y guárdalo para continuar después. Aún no activará cambios en el CRM.</p><button className="primary" onClick={() => setShowCreate(true)}><Icon name="plus" size={15} /> Crear automatización</button></div>}
    {showCreate && <div className="automation-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false) }}><section className="automation-create-dialog" role="dialog" aria-modal="true" aria-labelledby="automation-create-title"><button className="automation-dialog-close" aria-label="Cerrar" onClick={() => setShowCreate(false)}>×</button><p className="eyebrow">NUEVO WORKFLOW</p><h2 id="automation-create-title">Crea un borrador</h2><p>Ponle un nombre y abre el canvas para conectar su primer trigger.</p><form onSubmit={(event) => void createWorkflow(event)}><label htmlFor="automation-create-name">Nombre</label><input id="automation-create-name" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={120} required autoFocus placeholder="Ej. Seguimiento de mensajes entrantes" /><div><button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancelar</button><button className="primary" disabled={saving || !nameDraft.trim()}>{saving ? 'Creando…' : 'Crear borrador'}</button></div></form></section></div>}
  </section>
}

function nodeTitle(node: WorkflowNode): string {
  if (node.type === 'trigger.event') return 'Evento de CRM'
  if (node.type === 'condition.if') return 'Condición IF'
  if (node.type === 'flow.wait') return 'Esperar'
  if (node.type === 'opportunity.update_stage') return 'Cambiar etapa de oportunidad'
  return 'Fin de ruta'
}

function fieldTitle(field: ConditionField): string { return FIELD_OPTIONS.find((item) => item.value === field)?.label ?? field }
