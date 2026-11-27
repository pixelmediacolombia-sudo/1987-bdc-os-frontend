export const AUTOMATION_EVENTS = [
  'contact.created', 'contact.updated', 'message.received', 'message.sent', 'conversation.assigned', 'conversation.status_changed',
  'opportunity.created', 'opportunity.stage_changed', 'opportunity.assigned', 'opportunity.archived', 'opportunity.restored',
  'opportunity.next_action_changed', 'appointment.created', 'appointment.updated', 'appointment.status_changed', 'appointment.rescheduled',
] as const

export type AutomationEvent = typeof AUTOMATION_EVENTS[number]
export type WorkflowNodeType = 'trigger.event' | 'condition.if' | 'condition.switch' | 'flow.wait' | 'opportunity.update_stage' | 'opportunity.assign' | 'appointment.update_status' | 'contact.manage_tag' | 'contact.update_field' | 'conversation.assign' | 'flow.end'
export type ConditionField = 'event.type' | 'event.origin' | 'contact.source' | 'message.channel' | 'conversation.status' | 'opportunity.stage' | 'appointment.status'
const CONDITION_FIELDS: ConditionField[] = ['event.type', 'event.origin', 'contact.source', 'message.channel', 'conversation.status', 'opportunity.stage', 'appointment.status']
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty'
export type WorkflowNode =
  | { id: string; type: 'trigger.event'; position: { x: number; y: number }; config: { eventType: AutomationEvent } }
  | { id: string; type: 'condition.if'; position: { x: number; y: number }; config: { field: ConditionField; operator: ConditionOperator; value?: string } }
  | { id: string; type: 'condition.switch'; position: { x: number; y: number }; config: { field: ConditionField; cases: Array<{ id: string; value: string }> } }
  | { id: string; type: 'flow.wait'; position: { x: number; y: number }; config: { durationSeconds: number } }
  | { id: string; type: 'opportunity.update_stage'; position: { x: number; y: number }; config: { stage: 'new' | 'working' | 'closing' | 'won' | 'lost' } }
  | { id: string; type: 'opportunity.assign'; position: { x: number; y: number }; config: { assignedUserId: string | null } }
  | { id: string; type: 'appointment.update_status'; position: { x: number; y: number }; config: { status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' } }
  | { id: string; type: 'contact.manage_tag'; position: { x: number; y: number }; config: { action: 'add' | 'remove'; tag: string } }
  | { id: string; type: 'contact.update_field'; position: { x: number; y: number }; config: { field: 'displayName' | 'preferredLanguage'; value: string } }
  | { id: string; type: 'conversation.assign'; position: { x: number; y: number }; config: { assignedUserId: string | null } }
  | { id: string; type: 'flow.end'; position: { x: number; y: number }; config: { outcome: 'complete' | 'stop' } }
export type WorkflowEdge = { id: string; source: string; sourcePort: 'next' | 'true' | 'false' | 'default' | `case:${string}`; target: string; targetPort: 'in' }
export type WorkflowDefinition = { schemaVersion: 1; name: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }
export type WorkflowIssue = { code: string; message: string; nodeId?: string; edgeId?: string }
export type WorkflowRecord = {
  id: string
  name: string
  draft: { revision: number; definition: WorkflowDefinition; updatedAt: string }
  published: { revision: number; definition: WorkflowDefinition; publishedAt: string } | null
}

export type AutomationRunStatus = 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'dead_letter' | 'cancelled'
export type AutomationRunStep = {
  nodeId: string
  nodeType: WorkflowNodeType
  status: 'running' | 'succeeded' | 'failed' | 'cancelled'
  attempts: number
  output: unknown
  error: string | null
  startedAt: string | null
  finishedAt: string | null
}
export type AutomationRun = {
  id: string
  status: AutomationRunStatus
  generation: number
  eventType: AutomationEvent
  workflowRevision: number
  currentNodeId: string | null
  attempts: number
  availableAt: string
  lastError: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  steps: AutomationRunStep[]
}
export type AutomationRunActionResult = { run: Pick<AutomationRun, 'id' | 'status' | 'generation'> }

export function validateWorkflow(definition: WorkflowDefinition): WorkflowIssue[] {
  const issues: WorkflowIssue[] = []
  const ids = new Set(definition.nodes.map((node) => node.id))
  const triggers = definition.nodes.filter((node) => node.type === 'trigger.event')
  const ends = definition.nodes.filter((node) => node.type === 'flow.end')
  if (triggers.length !== 1) issues.push({ code: triggers.length ? 'multiple_triggers' : 'missing_trigger', message: triggers.length ? 'La versión inicial admite un solo trigger.' : 'Añade un trigger para comenzar.' })
  if (!ends.length) issues.push({ code: 'missing_end', message: 'Añade un nodo de fin para cerrar las rutas.' })
  const incoming = new Map<string, WorkflowEdge[]>()
  const outgoing = new Map<string, WorkflowEdge[]>()
  const adjacency = new Map<string, string[]>()
  for (const edge of definition.edges) {
    const source = definition.nodes.find((node) => node.id === edge.source)
    const target = definition.nodes.find((node) => node.id === edge.target)
    const validPort = source?.type === 'condition.if' ? edge.sourcePort === 'true' || edge.sourcePort === 'false' : source?.type === 'condition.switch' ? edge.sourcePort === 'default' || (edge.sourcePort.startsWith('case:') && source.config.cases.some((item) => edge.sourcePort === `case:${item.id}`)) : source !== undefined && source.type !== 'flow.end' && edge.sourcePort === 'next'
    if (!source || !target || !ids.has(edge.source) || !ids.has(edge.target) || edge.targetPort !== 'in' || !validPort) {
      issues.push({ code: 'invalid_edge', message: 'Una conexión apunta a un nodo o puerto inexistente.', edgeId: edge.id }); continue
    }
    incoming.set(target.id, [...(incoming.get(target.id) ?? []), edge])
    outgoing.set(source.id, [...(outgoing.get(source.id) ?? []), edge])
    adjacency.set(source.id, [...(adjacency.get(source.id) ?? []), target.id])
  }
  for (const node of definition.nodes) {
    const ins = incoming.get(node.id) ?? []
    const outs = outgoing.get(node.id) ?? []
    if (node.type === 'trigger.event' && ins.length) issues.push({ code: 'invalid_edge', message: 'El trigger no admite entrada.', nodeId: node.id })
    if (node.type === 'flow.end' && outs.length) issues.push({ code: 'invalid_edge', message: 'El nodo de fin no admite salida.', nodeId: node.id })
    if (node.type === 'flow.wait' && (!Number.isInteger(node.config.durationSeconds) || node.config.durationSeconds < 1 || node.config.durationSeconds > 31_536_000)) issues.push({ code: 'invalid_node', message: 'La espera debe durar entre 1 segundo y 365 días.', nodeId: node.id })
    if (node.type === 'condition.switch') {
      const values = node.config.cases.map((item) => item.value.trim().toLocaleLowerCase())
      if (!CONDITION_FIELDS.includes(node.config.field) || node.config.cases.length < 2 || node.config.cases.length > 5 || node.config.cases.some((item) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id) || !item.value.trim() || item.value.trim().length > 200) || new Set(values).size !== values.length) issues.push({ code: 'invalid_node', message: 'Configura de 2 a 5 casos con valores únicos de hasta 200 caracteres.', nodeId: node.id })
    }
    if (node.type === 'opportunity.update_stage' && !['new', 'working', 'closing', 'won', 'lost'].includes(node.config.stage)) issues.push({ code: 'invalid_node', message: 'Selecciona una etapa válida para la oportunidad.', nodeId: node.id })
    if (node.type === 'opportunity.assign' && node.config.assignedUserId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(node.config.assignedUserId)) issues.push({ code: 'invalid_node', message: 'Elige un asesor activo del dealer o deja la oportunidad sin asignar.', nodeId: node.id })
    if (node.type === 'appointment.update_status' && !['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(node.config.status)) issues.push({ code: 'invalid_node', message: 'Selecciona un estado válido para la cita.', nodeId: node.id })
    if (node.type === 'contact.manage_tag' && (!['add', 'remove'].includes(node.config.action) || !node.config.tag.trim() || node.config.tag.trim().length > 64)) issues.push({ code: 'invalid_node', message: 'Escribe una etiqueta de hasta 64 caracteres y elige si se añade o se quita.', nodeId: node.id })
    if (node.type === 'contact.update_field' && (!['displayName', 'preferredLanguage'].includes(node.config.field) || !node.config.value.trim() || node.config.value.trim().length > (node.config.field === 'displayName' ? 120 : 16) || (node.config.field === 'preferredLanguage' && !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(node.config.value.trim())))) issues.push({ code: 'invalid_node', message: 'Revisa el campo permitido y el valor. El idioma debe usar un código como es o en-US.', nodeId: node.id })
    if (node.type === 'conversation.assign' && node.config.assignedUserId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(node.config.assignedUserId)) issues.push({ code: 'invalid_node', message: 'Elige un asesor activo del dealer o deja la conversación sin asignar.', nodeId: node.id })
    if (ins.length > 1) issues.push({ code: 'multiple_incoming', message: 'Un nodo admite una sola entrada.', nodeId: node.id })
    if (node.type === 'condition.if') for (const port of ['true', 'false'] as const) {
      if (outs.filter((edge) => edge.sourcePort === port).length !== 1) issues.push({ code: 'missing_branch', message: `Conecta la salida ${port === 'true' ? 'Verdadero' : 'Falso'}.`, nodeId: node.id })
    }
    if (node.type === 'condition.switch') for (const port of [...node.config.cases.map((item) => `case:${item.id}`), 'default']) {
      if (outs.filter((edge) => edge.sourcePort === port).length !== 1) issues.push({ code: 'missing_branch', message: `Conecta la salida ${port === 'default' ? 'Por defecto' : `Caso ${node.config.cases.find((item) => port === `case:${item.id}`)?.value ?? ''}`}.`, nodeId: node.id })
    }
    if (node.type !== 'flow.end' && !outs.length) issues.push({ code: 'open_path', message: 'Esta ruta no termina en un nodo de fin.', nodeId: node.id })
  }
  if (triggers.length === 1) {
    const reachable = new Set<string>()
    const visiting = new Set<string>()
    const visited = new Set<string>()
    let hasCycle = false
    const walk = (id: string) => {
      if (visiting.has(id)) { hasCycle = true; return }
      if (visited.has(id)) return
      visiting.add(id); reachable.add(id)
      for (const next of adjacency.get(id) ?? []) walk(next)
      visiting.delete(id); visited.add(id)
    }
    walk(triggers[0]!.id)
    if (hasCycle) issues.push({ code: 'cycle', message: 'El workflow no puede contener ciclos.' })
    for (const node of definition.nodes) if (!reachable.has(node.id)) issues.push({ code: 'orphan_node', message: 'El nodo no está conectado desde el trigger.', nodeId: node.id })
  }
  const contactActions = definition.nodes.filter((node) => node.type === 'contact.manage_tag' || node.type === 'contact.update_field')
  const trigger = triggers[0]
  if (contactActions.length && (!trigger || !['contact.created', 'contact.updated'].includes(trigger.config.eventType))) {
    for (const node of contactActions) issues.push({ code: 'invalid_node', message: 'Las acciones de contacto requieren un trigger de contacto.', nodeId: node.id })
  }
  const conversationActions = definition.nodes.filter((node) => node.type === 'conversation.assign')
  if (conversationActions.length && (!trigger || !['conversation.assigned', 'conversation.status_changed'].includes(trigger.config.eventType))) {
    for (const node of conversationActions) issues.push({ code: 'invalid_node', message: 'La asignación requiere un trigger de conversación.', nodeId: node.id })
  }
  const opportunityActions = definition.nodes.filter((node) => node.type === 'opportunity.assign')
  if (opportunityActions.length && (!trigger || !['opportunity.created', 'opportunity.stage_changed', 'opportunity.assigned', 'opportunity.archived', 'opportunity.restored', 'opportunity.next_action_changed'].includes(trigger.config.eventType))) {
    for (const node of opportunityActions) issues.push({ code: 'invalid_node', message: 'La asignación requiere un trigger de oportunidad.', nodeId: node.id })
  }
  const appointmentActions = definition.nodes.filter((node) => node.type === 'appointment.update_status')
  if (appointmentActions.length && (!trigger || !['appointment.created', 'appointment.updated', 'appointment.status_changed', 'appointment.rescheduled'].includes(trigger.config.eventType))) {
    for (const node of appointmentActions) issues.push({ code: 'invalid_node', message: 'El cambio de estado requiere un trigger de cita.', nodeId: node.id })
  }
  return issues
}
