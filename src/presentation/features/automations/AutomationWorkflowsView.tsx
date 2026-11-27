import { useEffect, useMemo, useRef, useState } from 'react'
import { appServices } from '../../../core/container'
import type { ContactDealer, InboxAssignee } from '../../../domain/contact/contact'
import { AUTOMATION_EVENTS, validateWorkflow, type AutomationEvent, type ConditionField, type ConditionOperator, type WorkflowDefinition, type WorkflowRecord } from '../../../domain/automation/workflow'
import Icon from '../../components/Icon'
import AutomationRunHistory from './AutomationRunHistory'
import { APPOINTMENT_STATUS_OPTIONS, canvasSize, contactFieldTitle, EDITOR_WORKFLOW_KEY, EVENT_DESCRIPTIONS, fieldTitle, FIELD_OPTIONS, MINIMAP_HEIGHT, MINIMAP_INSET, MINIMAP_WIDTH, NODE_PALETTE, NODE_WIDTH, nodeHeight, nodeTitle, OPERATOR_OPTIONS, OPPORTUNITY_STAGE_OPTIONS, outputPortOffset, outputPorts, type WorkflowListItem } from './automation-workflow-editor.helpers'
import { useAutomationCanvasInteractions } from './useAutomationCanvasInteractions'
import { useAutomationWorkflowActions } from './useAutomationWorkflowActions'
import './automation-workflows.css'

type Props = { search: string }

export default function AutomationWorkflowsView({ search }: Props) {
  const [dealers, setDealers] = useState<ContactDealer[]>([])
  const [assignees, setAssignees] = useState<InboxAssignee[]>([])
  const [assigneesLoading, setAssigneesLoading] = useState(false)
  const [assigneesError, setAssigneesError] = useState('')
  const [dealerId, setDealerId] = useState('')
  const [items, setItems] = useState<WorkflowListItem[]>([])
  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null)
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeSearch, setNodeSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [zoom, setZoom] = useState(0.9)
  const [savedNotice, setSavedNotice] = useState('')
  const [showRuns, setShowRuns] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const minimapViewportRef = useRef<HTMLSpanElement>(null)
  const worldSize = useMemo(() => canvasSize(definition?.nodes ?? []), [definition?.nodes])
  const editorOpen = definition !== null
  const canvasInteractions = useAutomationCanvasInteractions({ definition, setDefinition, selectedNodeId, setSelectedNodeId, zoom, canvasRef })
  const { addNode, changeNode, removeSwitchCase, removeSelectedNode, clickOutput, clickInput, startMove, moveNode, startPan, endMove, isPanning, isMovingNode, movingNodeId, connectFrom, connectMessage, resetConnections, setConnectMessage } = canvasInteractions

  useEffect(() => {
    const shell = canvasRef.current
    if (!shell) return

    const updateViewport = () => {
      const viewport = minimapViewportRef.current
      if (!viewport) return
      const contentWidth = Math.max(shell.clientWidth, canvasFrameRef.current?.offsetWidth || worldSize.width * zoom)
      const contentHeight = Math.max(shell.clientHeight, canvasFrameRef.current?.offsetHeight || worldSize.height * zoom)
      const width = Math.min(MINIMAP_WIDTH, shell.clientWidth / contentWidth * MINIMAP_WIDTH)
      const height = Math.min(MINIMAP_HEIGHT, shell.clientHeight / contentHeight * MINIMAP_HEIGHT)
      const horizontalRange = Math.max(1, contentWidth - shell.clientWidth)
      const verticalRange = Math.max(1, contentHeight - shell.clientHeight)
      viewport.style.left = `${MINIMAP_INSET + shell.scrollLeft / horizontalRange * (MINIMAP_WIDTH - width)}px`
      viewport.style.top = `${MINIMAP_INSET + shell.scrollTop / verticalRange * (MINIMAP_HEIGHT - height)}px`
      viewport.style.width = `${width}px`
      viewport.style.height = `${height}px`
    }

    const updateFrame = window.requestAnimationFrame(updateViewport)
    shell.addEventListener('scroll', updateViewport, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateViewport)
    observer?.observe(shell)
    if (canvasFrameRef.current) observer?.observe(canvasFrameRef.current)
    return () => { window.cancelAnimationFrame(updateFrame); shell.removeEventListener('scroll', updateViewport); observer?.disconnect() }
  }, [editorOpen, zoom, worldSize.width, worldSize.height])

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

  useEffect(() => {
    if (!dealerId) return
    let mounted = true
    setAssigneesLoading(true); setAssigneesError('')
    appServices.contacts.listConversationAssignees(dealerId).then((result) => {
      if (mounted) setAssignees(result)
    }).catch((cause: unknown) => {
      if (mounted) setAssigneesError(cause instanceof Error ? cause.message : 'No pudimos cargar los asesores del dealer.')
    }).finally(() => { if (mounted) setAssigneesLoading(false) })
    return () => { mounted = false }
  }, [dealerId])

  const localIssues = useMemo(() => definition ? validateWorkflow(definition) : [], [definition])
  const selectedNode = definition?.nodes.find((node) => node.id === selectedNodeId) ?? null
  const visibleItems = items.filter((item) => item.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))
  const visibleNodes = NODE_PALETTE.filter((item) => `${item.title} ${item.description}`.toLocaleLowerCase('es').includes(nodeSearch.trim().toLocaleLowerCase('es')))
  const hasUnsavedDraft = Boolean(workflow && definition && JSON.stringify(definition) !== JSON.stringify(workflow.draft.definition))
  const hasImplementedAction = Boolean(definition?.nodes.some((node) => node.type === 'opportunity.update_stage' || node.type === 'opportunity.assign' || node.type === 'appointment.update_status' || node.type === 'contact.manage_tag' || node.type === 'contact.update_field' || node.type === 'conversation.assign'))
  const isPublished = Boolean(workflow && workflow.published?.revision === workflow.draft.revision)
  const canPublish = Boolean(workflow && definition && !saving && !publishing && !hasUnsavedDraft && hasImplementedAction && localIssues.length === 0 && workflow.published?.revision !== workflow.draft.revision)
  const { returnToList, requestReturnToList, openWorkflow, createWorkflow, saveDraft, publishWorkflow } = useAutomationWorkflowActions({
    dealerId, workflow, definition, nameDraft, hasUnsavedDraft, canPublish,
    setWorkflow, setDefinition, setItems, setNameDraft, setSelectedNodeId,
    setSaving, setPublishing, setError, setSavedNotice, setShowCreate,
    setShowRuns, setShowDiscardConfirm, resetConnections,
  })

  if (workflow && definition) return <section className="automation-editor automation-editor--fullscreen">
    <header className="automation-editor-header">
      <button className="automation-back" onClick={requestReturnToList} aria-label="Volver a automatizaciones"><Icon name="arrow-left" size={16} /><span>Volver</span></button>
      <div className="automation-title-group"><label className="automation-name-label" htmlFor="workflow-name">Nombre del borrador</label><input id="workflow-name" value={definition.name} maxLength={120} onChange={(event) => setDefinition((current) => current ? { ...current, name: event.target.value } : current)} /></div>
      <span className="automation-draft-badge">Borrador · v{workflow.draft.revision}</span>
      <button className="automation-view-toggle" onClick={() => setShowRuns((current) => !current)} aria-pressed={showRuns}>{showRuns ? 'Volver al canvas' : 'Ejecuciones'}</button>
      <div className="automation-save-actions"><span role="status">{saving || publishing ? 'Guardando…' : savedNotice}</span><button className="primary" disabled={saving || publishing || !definition.name.trim()} onClick={() => void saveDraft()}>Guardar borrador</button><button className="secondary" disabled={!canPublish} title={hasUnsavedDraft ? 'Guarda el borrador antes de publicarlo.' : !hasImplementedAction ? 'Añade una acción CRM implementada para publicar.' : localIssues.length ? 'Corrige la validación del workflow antes de publicarlo.' : workflow.published?.revision === workflow.draft.revision ? 'Esta revisión ya está publicada.' : 'Publica la última revisión guardada para ejecutar las acciones CRM soportadas.'} onClick={() => void publishWorkflow()}>{workflow.published?.revision === workflow.draft.revision ? `Publicado · v${workflow.draft.revision}` : 'Publicar'}</button></div>
    </header>
    {error && <div className="automation-alert" role="alert">{error}</div>}
    {showRuns ? <AutomationRunHistory dealerId={dealerId} workflowId={workflow.id} /> : <>
    <div className="automation-editor-body">
      <aside className="automation-palette" aria-label="Agregar nodos"><p className="eyebrow">NODOS DEL CANVAS</p><h2>Agregar nodo</h2>
        <input className="automation-node-search" aria-label="Buscar nodo" placeholder="Buscar nodo" value={nodeSearch} onChange={(event) => setNodeSearch(event.target.value)} />
        {visibleNodes.map((item) => <button key={item.type} onClick={() => addNode(item.type)} disabled={item.type === 'trigger.event' && definition.nodes.some((node) => node.type === 'trigger.event')}><span className={`palette-symbol ${item.tone === 'trigger' ? 'trigger-symbol' : item.tone === 'end' ? 'end-symbol' : 'condition-symbol'}`}>{item.symbol}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><Icon name="plus" size={15} /></button>)}
        {visibleNodes.length === 0 && <p className="automation-node-search-empty">No se encontraron nodos.</p>}
        <div className="automation-palette-note"><Icon name="clock" size={15} /><span>Las acciones CRM modifican solo el registro que originó el evento y dentro del dealer del workflow.</span></div>
      </aside>
      <div className="automation-workspace">
        <div className="automation-canvas-toolbar"><div><span className={`automation-status-dot${isPublished ? ' is-published' : ''}`} /> {isPublished ? `Publicado · v${workflow.draft.revision}` : 'Borrador sin publicar'} <span className="automation-separator">·</span> Nueva York</div><div className="automation-canvas-tools"><button aria-label="Alejar" onClick={() => setZoom((value) => Math.max(.55, Math.round((value - .1) * 10) / 10))}>−</button><span>{Math.round(zoom * 100)}%</span><button aria-label="Acercar" onClick={() => setZoom((value) => Math.min(1.35, Math.round((value + .1) * 10) / 10))}>+</button><button onClick={() => { setZoom(.9); if (canvasRef.current) canvasRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' }) }}>Ajustar</button></div></div>
        <div className={`automation-canvas-shell${isPanning ? ' is-panning' : ''}`} ref={canvasRef} onPointerDown={startPan} onPointerMove={moveNode} onPointerUp={endMove} onPointerCancel={endMove}>
          <div ref={canvasFrameRef} className="automation-canvas-frame" style={{ width: worldSize.width * zoom, height: worldSize.height * zoom }}>
          <div className="automation-canvas" style={{ width: worldSize.width, height: worldSize.height, transform: `scale(${zoom})` }} onClick={(event) => { if (event.target === event.currentTarget) { setSelectedNodeId(null); setConnectMessage('') } }}>
            <svg className="automation-edges" width={worldSize.width} height={worldSize.height} aria-hidden="true">{definition.edges.map((edge) => {
              const source = definition.nodes.find((node) => node.id === edge.source); const target = definition.nodes.find((node) => node.id === edge.target)
              if (!source || !target) return null
              const sourceY = source.position.y + outputPortOffset(source, edge.sourcePort)
              const x1 = source.position.x + NODE_WIDTH; const y1 = sourceY; const x2 = target.position.x; const y2 = target.position.y + 26; const bend = Math.max(50, (x2 - x1) * .45)
              const portLabel = outputPorts(source).find((item) => item.port === edge.sourcePort)?.label ?? ''
              return <g key={edge.id}><path className="automation-edge-shadow" d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} /><path className="automation-edge-line" d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8}>{portLabel}</text></g>
            })}</svg>
            {!definition.nodes.length && <div className="automation-canvas-empty"><span className="automation-canvas-glyph"><Icon name="workflow" size={22} /></span><h2>Empieza con un trigger</h2><p>Elige qué evento de CRM inicia este workflow. Después puedes añadir condiciones y conectar sus salidas.</p><button className="primary" onClick={() => addNode('trigger.event')}><Icon name="plus" size={15} /> Añadir trigger</button></div>}
            {definition.nodes.map((node) => <article key={node.id} className={`automation-node automation-node--${node.type.replace('.', '-')} ${selectedNodeId === node.id ? 'is-selected' : ''}${isMovingNode && movingNodeId === node.id ? ' is-dragging' : ''}`} style={{ left: node.position.x, top: node.position.y, height: nodeHeight(node) }} onPointerDown={(event) => startMove(event, node)} onClick={() => setSelectedNodeId(node.id)}>
              {node.type !== 'trigger.event' && <button className={`automation-port automation-port--input ${definition.edges.some((edge) => edge.target === node.id) ? 'is-connected' : ''}`} aria-label={`Entrada de ${nodeTitle(node)}`} onClick={(event) => { event.stopPropagation(); clickInput(node.id) }} />}
              <header className="automation-node-header"><span className={`automation-node-icon node-icon--${node.type.replace('.', '-')}`}>{node.type === 'trigger.event' ? '↳' : node.type === 'condition.if' ? '◇' : node.type === 'condition.switch' ? '⑂' : node.type === 'flow.wait' ? '◷' : node.type === 'opportunity.update_stage' ? '↗' : node.type === 'opportunity.assign' || node.type === 'conversation.assign' ? '↔' : node.type === 'appointment.update_status' ? '◷' : node.type === 'contact.manage_tag' ? '#' : node.type === 'contact.update_field' ? 'Aa' : '■'}</span><span><small>{node.type === 'trigger.event' ? 'TRIGGER' : node.type === 'condition.if' || node.type === 'condition.switch' ? 'CONDICIÓN' : node.type === 'opportunity.update_stage' || node.type === 'opportunity.assign' || node.type === 'appointment.update_status' || node.type === 'contact.manage_tag' || node.type === 'contact.update_field' || node.type === 'conversation.assign' ? 'ACCIÓN CRM' : 'CONTROL'}</small><strong>{nodeTitle(node)}</strong></span><button className="automation-node-menu" aria-label={`Seleccionar ${nodeTitle(node)}`} onClick={(event) => { event.stopPropagation(); setSelectedNodeId(node.id) }}>•••</button></header>
              <div className="automation-node-detail">{node.type === 'trigger.event' ? <><span>Cuando ocurra</span><b>{node.config.eventType}</b></> : node.type === 'condition.if' ? <><span>{fieldTitle(node.config.field)} {OPERATOR_OPTIONS.find((item) => item.value === node.config.operator)?.label}</span><b>{node.config.value || 'sin valor'}</b></> : node.type === 'condition.switch' ? <><span>Comparar {fieldTitle(node.config.field)}</span><b>{node.config.cases.length} casos + por defecto</b></> : node.type === 'flow.wait' ? <><span>Pausar durante</span><b>{node.config.durationSeconds} segundos</b></> : node.type === 'opportunity.update_stage' ? <><span>Etapa objetivo</span><b>{OPPORTUNITY_STAGE_OPTIONS.find((stage) => stage.value === node.config.stage)?.label}</b></> : node.type === 'appointment.update_status' ? <><span>Estado objetivo</span><b>{APPOINTMENT_STATUS_OPTIONS.find((status) => status.value === node.config.status)?.label}</b></> : node.type === 'opportunity.assign' || node.type === 'conversation.assign' ? <><span>Responsable</span><b>{assignees.find((assignee) => assignee.id === node.config.assignedUserId)?.displayName ?? 'Sin asignar'}</b></> : node.type === 'contact.manage_tag' ? <><span>{node.config.action === 'add' ? 'Añadir etiqueta' : 'Quitar etiqueta'}</span><b>{node.config.tag || 'Sin configurar'}</b></> : node.type === 'contact.update_field' ? <><span>{contactFieldTitle(node.config.field)}</span><b>{node.config.value}</b></> : <><span>Resultado de la ruta</span><b>{node.config.outcome === 'complete' ? 'Completar' : 'Detener'}</b></>}</div>
              {node.type === 'trigger.event' || node.type === 'flow.wait' || node.type === 'opportunity.update_stage' || node.type === 'opportunity.assign' || node.type === 'appointment.update_status' || node.type === 'contact.manage_tag' || node.type === 'contact.update_field' || node.type === 'conversation.assign' ? <button className={`automation-port automation-port--output ${connectFrom?.nodeId === node.id ? 'is-armed' : ''}`} aria-label={`Salida siguiente de ${nodeTitle(node)}`} onClick={(event) => { event.stopPropagation(); clickOutput(node.id, 'next') }} /> : node.type === 'condition.if' || node.type === 'condition.switch' ? <div className={`automation-branch-ports${node.type === 'condition.switch' ? ' automation-branch-ports--switch' : ''}`}>{outputPorts(node).map((item) => <button key={item.port} className={`automation-port automation-port--branch ${item.port === 'false' ? 'automation-port--false' : ''}${connectFrom?.nodeId === node.id && connectFrom.port === item.port ? ' is-armed' : ''}`} aria-label={`Salida ${item.label}`} style={node.type === 'condition.switch' ? { top: outputPortOffset(node, item.port) - 9 } : undefined} onClick={(event) => { event.stopPropagation(); clickOutput(node.id, item.port) }}><span>{node.type === 'condition.if' ? item.port === 'true' ? 'V' : 'F' : item.label.slice(0, 2).toUpperCase()}</span></button>)}</div> : null}
            </article>)}
          </div>
          </div>
        </div>
        <div className="automation-minimap" role="img" aria-label={`Minimapa del workflow: ${definition.nodes.length} nodos y ${definition.edges.length} conexiones`}>
          <svg className="automation-minimap-graph" viewBox={`0 0 ${worldSize.width} ${worldSize.height}`} preserveAspectRatio="none" aria-hidden="true">
            {definition.edges.map((edge) => {
              const source = definition.nodes.find((node) => node.id === edge.source)
              const target = definition.nodes.find((node) => node.id === edge.target)
              if (!source || !target) return null
              const x1 = source.position.x + NODE_WIDTH
              const y1 = source.position.y + outputPortOffset(source, edge.sourcePort)
              const x2 = target.position.x
              const y2 = target.position.y + 26
              const bend = Math.max(50, (x2 - x1) * .45)
              return <path key={edge.id} d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} />
            })}
            {definition.nodes.map((node) => <rect key={node.id} className={`automation-minimap-node automation-minimap-node--${node.type.replace('.', '-')}`} x={node.position.x} y={node.position.y} width={NODE_WIDTH} height={nodeHeight(node)} rx="12" />)}
          </svg>
          <span ref={minimapViewportRef} style={{ left: MINIMAP_INSET, top: MINIMAP_INSET, width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }} />
        </div>
        <footer className="automation-canvas-footer"><span>{connectMessage || (connectFrom ? 'Selecciona un nodo de destino.' : 'Selecciona un nodo para configurar. Arrastra cualquier parte libre de la tarjeta para moverla.')}</span><span>{definition.nodes.length} nodos · {definition.edges.length} conexiones</span></footer>
      </div>
      <aside className="automation-inspector" aria-label="Configuración del nodo"><p className="eyebrow">CONFIGURACIÓN</p>{selectedNode ? <>
        <div className="automation-inspector-title"><span className={`automation-node-icon node-icon--${selectedNode.type.replace('.', '-')}`}>{selectedNode.type === 'trigger.event' ? '↳' : selectedNode.type === 'condition.if' ? '◇' : selectedNode.type === 'condition.switch' ? '⑂' : selectedNode.type === 'flow.wait' ? '◷' : selectedNode.type === 'opportunity.update_stage' ? '↗' : selectedNode.type === 'contact.manage_tag' ? '#' : selectedNode.type === 'contact.update_field' ? 'Aa' : selectedNode.type === 'conversation.assign' ? '↔' : '■'}</span><div><h2>{nodeTitle(selectedNode)}</h2><small>{selectedNode.type}</small></div></div>
        {selectedNode.type === 'trigger.event' && <label className="automation-field">Evento que inicia el workflow<select value={selectedNode.config.eventType} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'trigger.event' ? { ...node, config: { eventType: event.target.value as AutomationEvent } } : node)}>{AUTOMATION_EVENTS.map((item) => <option key={item} value={item}>{item}</option>)}</select><small className="automation-event-description" aria-live="polite">{EVENT_DESCRIPTIONS[selectedNode.config.eventType]}</small></label>}
        {selectedNode.type === 'condition.if' && <><label className="automation-field">Campo<select value={selectedNode.config.field} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'condition.if' ? { ...node, config: { ...node.config, field: event.target.value as ConditionField } } : node)}>{FIELD_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label className="automation-field">Operador<select value={selectedNode.config.operator} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'condition.if' ? { ...node, config: { ...node.config, operator: event.target.value as ConditionOperator, ...(['is_empty', 'is_not_empty'].includes(event.target.value) ? { value: undefined } : {}) } } : node)}>{OPERATOR_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>{!['is_empty', 'is_not_empty'].includes(selectedNode.config.operator) && <label className="automation-field">Valor<input value={selectedNode.config.value ?? ''} maxLength={200} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'condition.if' ? { ...node, config: { ...node.config, value: event.target.value } } : node)} /></label>}</>}
        {selectedNode.type === 'condition.switch' && <><label className="automation-field">Campo a comparar<select aria-label="Campo de la condición Switch" value={selectedNode.config.field} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'condition.switch' ? { ...node, config: { ...node.config, field: event.target.value as ConditionField } } : node)}>{FIELD_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select><small>Compara el valor del evento sin distinguir mayúsculas. Si no coincide, usa “Por defecto”.</small></label>{selectedNode.config.cases.map((item, index) => <div className="automation-switch-case" key={item.id}><label className="automation-field">Caso {index + 1}<input aria-label={`Valor del caso ${index + 1}`} value={item.value} maxLength={200} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'condition.switch' ? { ...node, config: { ...node.config, cases: node.config.cases.map((candidate) => candidate.id === item.id ? { ...candidate, value: event.target.value } : candidate) } } : node)} placeholder="Ej. messenger" /></label><button className="secondary automation-switch-remove" disabled={selectedNode.config.cases.length <= 2} aria-label={`Eliminar caso ${index + 1}`} onClick={() => removeSwitchCase(selectedNode.id, item.id)}>Quitar</button></div>)}<button className="secondary automation-switch-add" disabled={selectedNode.config.cases.length >= 5} onClick={() => changeNode(selectedNode.id, (node) => node.type === 'condition.switch' && node.config.cases.length < 5 ? { ...node, config: { ...node.config, cases: [...node.config.cases, { id: crypto.randomUUID(), value: '' }] } } : node)}>+ Añadir caso</button><small className="automation-switch-default">La salida Por defecto se usa cuando el campo está vacío o no coincide con ningún caso.</small></>}
        {selectedNode.type === 'flow.wait' && <label className="automation-field">Duración (segundos)<input type="number" min={1} max={31536000} step={1} value={selectedNode.config.durationSeconds} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'flow.wait' ? { ...node, config: { durationSeconds: Number(event.target.value) } } : node)} /><small>Entre 1 segundo y 365 días. El run se guarda y se reanuda automáticamente.</small></label>}
        {selectedNode.type === 'opportunity.update_stage' && <label className="automation-field">Nueva etapa<select aria-label="Nueva etapa de la oportunidad" value={selectedNode.config.stage} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'opportunity.update_stage' ? { ...node, config: { stage: event.target.value as typeof node.config.stage } } : node)}>{OPPORTUNITY_STAGE_OPTIONS.map((stage) => <option value={stage.value} key={stage.value}>{stage.label}</option>)}</select><small>Actualiza la oportunidad que originó el evento, dentro del dealer del workflow.</small></label>}
        {selectedNode.type === 'appointment.update_status' && <label className="automation-field">Nuevo estado<select aria-label="Nuevo estado de la cita" value={selectedNode.config.status} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'appointment.update_status' ? { ...node, config: { status: event.target.value as typeof node.config.status } } : node)}>{APPOINTMENT_STATUS_OPTIONS.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select><small>Actualiza el estado de la cita que originó el evento. Los recordatorios no se envían desde esta acción.</small></label>}
        {selectedNode.type === 'contact.manage_tag' && <><label className="automation-field">Acción<select aria-label="Acción de etiqueta" value={selectedNode.config.action} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'contact.manage_tag' ? { ...node, config: { ...node.config, action: event.target.value as 'add' | 'remove' } } : node)}><option value="add">Añadir etiqueta</option><option value="remove">Quitar etiqueta</option></select></label><label className="automation-field">Etiqueta<input aria-label="Nombre de la etiqueta" value={selectedNode.config.tag} maxLength={64} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'contact.manage_tag' ? { ...node, config: { ...node.config, tag: event.target.value } } : node)} placeholder="Ej. seguimiento" /><small>Se aplica al contacto del evento. Debe iniciar con un evento de contacto.</small></label></>}
        {selectedNode.type === 'contact.update_field' && <><label className="automation-field">Campo<select aria-label="Campo del contacto" value={selectedNode.config.field} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'contact.update_field' ? { ...node, config: { ...node.config, field: event.target.value as typeof node.config.field, value: event.target.value === 'preferredLanguage' ? 'es' : '' } } : node)}><option value="displayName">Nombre</option><option value="preferredLanguage">Idioma preferido</option></select></label><label className="automation-field">Nuevo valor<input aria-label="Nuevo valor del contacto" value={selectedNode.config.value} maxLength={selectedNode.config.field === 'displayName' ? 120 : 16} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'contact.update_field' ? { ...node, config: { ...node.config, value: event.target.value } } : node)} placeholder={selectedNode.config.field === 'displayName' ? 'Ej. Ana María' : 'Ej. es o en-US'} /><small>{selectedNode.config.field === 'displayName' ? 'Hasta 120 caracteres. El valor se aplica al contacto del evento.' : 'Usa un código de idioma como es, en o en-US. El valor se normaliza a minúsculas.'}</small></label></>}
        {(selectedNode.type === 'conversation.assign' || selectedNode.type === 'opportunity.assign') && <label className="automation-field">Responsable<select aria-label={selectedNode.type === 'conversation.assign' ? 'Asesor responsable de la conversación' : 'Asesor responsable de la oportunidad'} value={selectedNode.config.assignedUserId ?? ''} disabled={assigneesLoading} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === selectedNode.type ? { ...node, config: { assignedUserId: event.target.value || null } } : node)}><option value="">Sin asignar</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.displayName}</option>)}</select><small>{assigneesError || (assigneesLoading ? 'Cargando asesores activos…' : selectedNode.type === 'conversation.assign' ? 'Reasigna la conversación que originó el evento. Solo aparecen asesores activos de este dealer.' : 'Reasigna la oportunidad que originó el evento. Solo aparecen asesores activos de este dealer.')}</small></label>}
        {selectedNode.type === 'flow.end' && <label className="automation-field">Al terminar<select value={selectedNode.config.outcome} onChange={(event) => changeNode(selectedNode.id, (node) => node.type === 'flow.end' ? { ...node, config: { outcome: event.target.value as 'complete' | 'stop' } } : node)}><option value="complete">Completar workflow</option><option value="stop">Detener esta ruta</option></select></label>}
        <button className="automation-delete-node" onClick={removeSelectedNode}>Eliminar nodo</button>
      </> : <div className="automation-inspector-empty"><span>⌖</span><strong>Selecciona un nodo</strong><p>Sus opciones de configuración aparecerán aquí.</p></div>}
        {localIssues.length > 0 && <div className="automation-issues"><h3>Validación · {localIssues.length}</h3><ul>{localIssues.slice(0, 8).map((issue, index) => <li key={`${issue.code}-${issue.nodeId ?? ''}-${index}`}>{issue.message}</li>)}</ul></div>}
        {connectMessage && <p className="automation-connect-hint" role="status">{connectMessage}</p>}
      </aside>
    </div>
    <p className="automation-editor-footnote">Los borradores se guardan por dealer. Puedes publicar revisiones válidas que usen acciones implementadas.</p>
    </>}
    {showDiscardConfirm && <div className="automation-modal-backdrop" role="presentation"><section className="automation-create-dialog automation-discard-dialog" role="alertdialog" aria-modal="true" aria-labelledby="automation-discard-title" aria-describedby="automation-discard-description"><p className="eyebrow">CAMBIOS SIN GUARDAR</p><h2 id="automation-discard-title">¿Estás seguro de que vas a volver?</h2><p id="automation-discard-description">Se perderán los cambios sin guardar.</p><div className="automation-discard-actions"><button type="button" className="secondary" autoFocus onClick={() => setShowDiscardConfirm(false)}>No</button><button type="button" className="primary automation-discard-confirm" onClick={returnToList}>Sí</button></div></section></div>}
  </section>

  return <section className="automation-list-view">
    <header className="automation-page-heading"><div><p className="eyebrow">AUTOMATIZA EL TRABAJO DEL DEALER</p><h1>Automatizaciones</h1><p>Diseña flujos visuales con eventos y condiciones de tu CRM.</p></div><div className="automation-page-actions">{dealers.length > 1 && <label className="automation-dealer-select">Dealer<select value={dealerId} onChange={(event) => setDealerId(event.target.value)}>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</select></label>}<button className="primary" onClick={() => { setNameDraft(''); setShowCreate(true) }} disabled={!dealerId}><Icon name="plus" size={15} /> Nueva automatización</button></div></header>
    {error && <div className="automation-alert" role="alert">{error}<button className="secondary" onClick={() => { setError(''); setLoading(true); void appServices.automationWorkflows.list(dealerId).then(setItems).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No pudimos cargar las automatizaciones.')).finally(() => setLoading(false)) }}>Reintentar</button></div>}
    {loading ? <div className="automation-list-loading" aria-live="polite">Cargando automatizaciones…</div> : visibleItems.length ? <div className="automation-list-panel"><div className="automation-list-columns"><span>Workflow</span><span>Estado</span><span>Borrador</span><span>Última actualización</span><span /></div>{visibleItems.map((item) => <button className="automation-list-row" key={item.id} onClick={() => void openWorkflow(item.id)}><span className="automation-list-name"><i><Icon name="workflow" size={17} /></i><strong>{item.name}</strong></span><span><b className="automation-draft-label">Borrador</b></span><span>v{item.draftRevision}</span><span>{new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><Icon name="arrow" size={16} /></button>)}</div> : <div className="automation-empty"><span className="automation-empty-mark"><Icon name="workflow" size={24} /></span><h2>Empieza con un borrador</h2><p>Construye un workflow en el canvas y guárdalo para continuar después. Aún no activará cambios en el CRM.</p><button className="primary" onClick={() => setShowCreate(true)}><Icon name="plus" size={15} /> Crear automatización</button></div>}
    {showCreate && <div className="automation-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false) }}><section className="automation-create-dialog" role="dialog" aria-modal="true" aria-labelledby="automation-create-title"><button className="automation-dialog-close" aria-label="Cerrar" onClick={() => setShowCreate(false)}>×</button><p className="eyebrow">NUEVO WORKFLOW</p><h2 id="automation-create-title">Crea un borrador</h2><p>Ponle un nombre y abre el canvas para conectar su primer trigger.</p><form onSubmit={(event) => void createWorkflow(event)}><label htmlFor="automation-create-name">Nombre</label><input id="automation-create-name" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={120} required autoFocus placeholder="Ej. Seguimiento de mensajes entrantes" /><div><button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancelar</button><button className="primary" disabled={saving || !nameDraft.trim()}>{saving ? 'Creando…' : 'Crear borrador'}</button></div></form></section></div>}
  </section>
}
