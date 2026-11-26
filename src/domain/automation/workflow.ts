export const AUTOMATION_EVENTS = [
  'contact.created', 'contact.updated', 'message.received', 'message.sent', 'conversation.assigned', 'conversation.status_changed',
  'opportunity.created', 'opportunity.stage_changed', 'opportunity.assigned', 'opportunity.archived', 'opportunity.restored',
  'opportunity.next_action_changed', 'appointment.created', 'appointment.updated', 'appointment.status_changed', 'appointment.rescheduled',
] as const

export type AutomationEvent = typeof AUTOMATION_EVENTS[number]
export type WorkflowNodeType = 'trigger.event' | 'condition.if' | 'flow.wait' | 'flow.end'
export type ConditionField = 'event.type' | 'event.origin' | 'contact.source' | 'message.channel' | 'conversation.status' | 'opportunity.stage' | 'appointment.status'
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty'
export type WorkflowNode =
  | { id: string; type: 'trigger.event'; position: { x: number; y: number }; config: { eventType: AutomationEvent } }
  | { id: string; type: 'condition.if'; position: { x: number; y: number }; config: { field: ConditionField; operator: ConditionOperator; value?: string } }
  | { id: string; type: 'flow.wait'; position: { x: number; y: number }; config: { durationSeconds: number } }
  | { id: string; type: 'flow.end'; position: { x: number; y: number }; config: { outcome: 'complete' | 'stop' } }
export type WorkflowEdge = { id: string; source: string; sourcePort: 'next' | 'true' | 'false'; target: string; targetPort: 'in' }
export type WorkflowDefinition = { schemaVersion: 1; name: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }
export type WorkflowIssue = { code: string; message: string; nodeId?: string; edgeId?: string }
export type WorkflowRecord = {
  id: string
  name: string
  draft: { revision: number; definition: WorkflowDefinition; updatedAt: string }
  published: { revision: number; definition: WorkflowDefinition; publishedAt: string } | null
}

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
    const validPort = source?.type === 'condition.if' ? edge.sourcePort === 'true' || edge.sourcePort === 'false' : (source?.type === 'trigger.event' || source?.type === 'flow.wait') && edge.sourcePort === 'next'
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
    if (ins.length > 1) issues.push({ code: 'multiple_incoming', message: 'Un nodo admite una sola entrada.', nodeId: node.id })
    if (node.type === 'condition.if') for (const port of ['true', 'false'] as const) {
      if (outs.filter((edge) => edge.sourcePort === port).length !== 1) issues.push({ code: 'missing_branch', message: `Conecta la salida ${port === 'true' ? 'Verdadero' : 'Falso'}.`, nodeId: node.id })
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
  return issues
}
