import type { AutomationEvent, ConditionField, ConditionOperator, WorkflowEdge, WorkflowNode, WorkflowNodeType } from '../../../domain/automation/workflow'

export type WorkflowListItem = { id: string; name: string; draftRevision: number; publishedRevision: number | null; updatedAt: string }

export const FIELD_OPTIONS: Array<{ value: ConditionField; label: string }> = [
  { value: 'event.type', label: 'Tipo de evento' }, { value: 'event.origin', label: 'Origen del evento' },
  { value: 'contact.source', label: 'Origen del contacto' }, { value: 'message.channel', label: 'Canal del mensaje' },
  { value: 'conversation.status', label: 'Estado de conversación' }, { value: 'opportunity.stage', label: 'Etapa de oportunidad' },
  { value: 'appointment.status', label: 'Estado de cita' },
]

export const OPERATOR_OPTIONS: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'equals', label: 'es igual a' }, { value: 'not_equals', label: 'no es igual a' }, { value: 'contains', label: 'contiene' },
  { value: 'is_empty', label: 'está vacío' }, { value: 'is_not_empty', label: 'tiene un valor' },
]

export const OPPORTUNITY_STAGE_OPTIONS = [
  { value: 'new', label: 'Nuevo' }, { value: 'working', label: 'En proceso' }, { value: 'closing', label: 'Cierre' },
  { value: 'won', label: 'Ganada' }, { value: 'lost', label: 'Perdida' },
] as const

export const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Programada' }, { value: 'confirmed', label: 'Confirmada' }, { value: 'cancelled', label: 'Cancelada' }, { value: 'completed', label: 'Completada' }, { value: 'no_show', label: 'No asistió' },
] as const

export const EVENT_DESCRIPTIONS: Record<AutomationEvent, string> = {
  'contact.created': 'Se activa cuando se crea un contacto nuevo en este dealer.',
  'contact.updated': 'Se activa cuando cambia información del contacto, como nombre, teléfono, correo, idioma o consentimiento.',
  'message.received': 'Se activa cuando el CRM recibe un mensaje entrante de un cliente.',
  'message.sent': 'Se activa cuando un mensaje saliente queda enviado correctamente.',
  'conversation.assigned': 'Se activa cuando una conversación se asigna, cambia de asesor o queda sin asignar.',
  'conversation.status_changed': 'Se activa cuando una conversación cambia de estado, por ejemplo entre abierta y cerrada.',
  'opportunity.created': 'Se activa cuando se crea una oportunidad comercial.',
  'opportunity.stage_changed': 'Se activa cuando una oportunidad cambia de etapa en el pipeline.',
  'opportunity.assigned': 'Se activa cuando una oportunidad se asigna, cambia de asesor o queda sin asignar.',
  'opportunity.archived': 'Se activa cuando una oportunidad se archiva.',
  'opportunity.restored': 'Se activa cuando una oportunidad archivada vuelve al pipeline.',
  'opportunity.next_action_changed': 'Se activa cuando cambia la próxima acción o su fecha de seguimiento.',
  'appointment.created': 'Se activa cuando se agenda una cita nueva.',
  'appointment.updated': 'Se activa cuando cambian los datos de una cita, como hora, lugar o notas.',
  'appointment.status_changed': 'Se activa cuando una cita cambia de estado, por ejemplo confirmada o cancelada.',
  'appointment.rescheduled': 'Se activa cuando una cita cambia de fecha u hora.',
}

export const NODE_PALETTE: Array<{ type: WorkflowNodeType; title: string; description: string; symbol: string; tone: 'trigger' | 'condition' | 'end' }> = [
  { type: 'trigger.event', title: 'Trigger de evento', description: 'Entrada del workflow', symbol: '↳', tone: 'trigger' },
  { type: 'condition.if', title: 'Condición IF', description: 'Rutas verdadero / falso', symbol: '◇', tone: 'condition' },
  { type: 'condition.switch', title: 'Condición Switch', description: 'Rutas por valor y una salida por defecto', symbol: '⑂', tone: 'condition' },
  { type: 'flow.wait', title: 'Esperar', description: 'Pausa y reanuda el workflow', symbol: '◷', tone: 'condition' },
  { type: 'opportunity.update_stage', title: 'Cambiar etapa', description: 'Actualizar oportunidad del evento', symbol: '↗', tone: 'condition' },
  { type: 'opportunity.assign', title: 'Asignar oportunidad', description: 'Elegir un asesor activo para la oportunidad', symbol: '↔', tone: 'condition' },
  { type: 'appointment.update_status', title: 'Cambiar estado de cita', description: 'Actualizar la cita del evento', symbol: '◷', tone: 'condition' },
  { type: 'contact.manage_tag', title: 'Gestionar etiqueta', description: 'Añadir o quitar del contacto', symbol: '#', tone: 'condition' },
  { type: 'contact.update_field', title: 'Actualizar campo', description: 'Nombre o idioma preferido', symbol: 'Aa', tone: 'condition' },
  { type: 'conversation.assign', title: 'Asignar conversación', description: 'Elegir un asesor activo del dealer', symbol: '↔', tone: 'condition' },
  { type: 'flow.end', title: 'Fin', description: 'Cierra una ruta', symbol: '■', tone: 'end' },
]

export const NODE_WIDTH = 250
export const NODE_HEIGHT = 136
export const CANVAS_WIDTH = 1800
export const CANVAS_HEIGHT = 1150
export const CANVAS_PADDING = 360
export const MINIMAP_INSET = 10
export const MINIMAP_WIDTH = 160
export const MINIMAP_HEIGHT = 94
export const EDITOR_WORKFLOW_KEY = 'bdc-os:automation-editor:'

export function createWorkflowNode(type: WorkflowNodeType, index: number): WorkflowNode {
  const offset = index * 24
  const position = (x: number, y = 100) => ({ x: x + offset, y: y + offset })
  const id = crypto.randomUUID()
  switch (type) {
    case 'trigger.event': return { id, type, position: position(100), config: { eventType: 'message.received' } }
    case 'condition.if': return { id, type, position: position(400), config: { field: 'message.channel', operator: 'equals', value: 'messenger' } }
    case 'condition.switch': return { id, type, position: position(400), config: { field: 'message.channel', cases: [{ id: crypto.randomUUID(), value: 'whatsapp' }, { id: crypto.randomUUID(), value: 'messenger' }] } }
    case 'flow.wait': return { id, type, position: position(650), config: { durationSeconds: 60 } }
    case 'opportunity.update_stage': return { id, type, position: position(430), config: { stage: 'working' } }
    case 'opportunity.assign': return { id, type, position: position(430), config: { assignedUserId: null } }
    case 'appointment.update_status': return { id, type, position: position(430), config: { status: 'confirmed' } }
    case 'contact.manage_tag': return { id, type, position: position(430), config: { action: 'add', tag: '' } }
    case 'contact.update_field': return { id, type, position: position(430), config: { field: 'preferredLanguage', value: 'es' } }
    case 'conversation.assign': return { id, type, position: position(430), config: { assignedUserId: null } }
    case 'flow.end': return { id, type, position: position(760), config: { outcome: 'complete' } }
  }
}

export function nodeTitle(node: WorkflowNode): string {
  if (node.type === 'trigger.event') return 'Evento de CRM'
  if (node.type === 'condition.if') return 'Condición IF'
  if (node.type === 'condition.switch') return 'Condición Switch'
  if (node.type === 'flow.wait') return 'Esperar'
  if (node.type === 'opportunity.update_stage') return 'Cambiar etapa de oportunidad'
  if (node.type === 'opportunity.assign') return 'Asignar oportunidad'
  if (node.type === 'appointment.update_status') return 'Cambiar estado de cita'
  if (node.type === 'contact.manage_tag') return node.config.action === 'add' ? 'Añadir etiqueta al contacto' : 'Quitar etiqueta del contacto'
  if (node.type === 'contact.update_field') return 'Actualizar campo del contacto'
  if (node.type === 'conversation.assign') return 'Asignar conversación'
  return 'Fin de ruta'
}

export function contactFieldTitle(field: 'displayName' | 'preferredLanguage'): string {
  return field === 'displayName' ? 'Nombre' : 'Idioma preferido'
}

export function fieldTitle(field: ConditionField): string {
  return FIELD_OPTIONS.find((item) => item.value === field)?.label ?? field
}

export function nodeHeight(node: WorkflowNode): number {
  return node.type === 'condition.switch' ? Math.max(NODE_HEIGHT, 112 + (node.config.cases.length + 1) * 22) : NODE_HEIGHT
}

export function outputPorts(node: WorkflowNode): Array<{ port: WorkflowEdge['sourcePort']; label: string }> {
  if (node.type === 'condition.if') return [{ port: 'true', label: 'verdadero' }, { port: 'false', label: 'falso' }]
  if (node.type === 'condition.switch') return [...node.config.cases.map((item) => ({ port: `case:${item.id}` as const, label: item.value || 'Caso sin valor' })), { port: 'default' as const, label: 'Por defecto' }]
  return []
}

export function outputPortOffset(node: WorkflowNode, port: WorkflowEdge['sourcePort']): number {
  if (node.type === 'condition.if') return port === 'true' ? 103 : 122
  if (node.type === 'condition.switch') return 94 + Math.max(0, outputPorts(node).findIndex((item) => item.port === port)) * 22
  return nodeHeight(node) - 20
}

export function canvasSize(nodes: WorkflowNode[]): { width: number; height: number } {
  return {
    width: Math.max(CANVAS_WIDTH, ...nodes.map((node) => node.position.x + NODE_WIDTH + CANVAS_PADDING)),
    height: Math.max(CANVAS_HEIGHT, ...nodes.map((node) => node.position.y + nodeHeight(node) + CANVAS_PADDING)),
  }
}
