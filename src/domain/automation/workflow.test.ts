import { describe, expect, it } from 'vitest'
import { validateWorkflow, type WorkflowDefinition } from './workflow'

const ids = { trigger: '00000000-0000-4000-8000-000000000001', condition: '00000000-0000-4000-8000-000000000002', yes: '00000000-0000-4000-8000-000000000003', no: '00000000-0000-4000-8000-000000000004' }
const edgeIds = { start: '10000000-0000-4000-8000-000000000001', yes: '10000000-0000-4000-8000-000000000002', no: '10000000-0000-4000-8000-000000000003' }

function completeWorkflow(): WorkflowDefinition {
  return {
    schemaVersion: 1, name: 'Inbound message routing',
    nodes: [
      { id: ids.trigger, type: 'trigger.event', position: { x: 100, y: 100 }, config: { eventType: 'message.received' } },
      { id: ids.condition, type: 'condition.if', position: { x: 400, y: 100 }, config: { field: 'message.channel', operator: 'equals', value: 'messenger' } },
      { id: ids.yes, type: 'flow.end', position: { x: 760, y: 30 }, config: { outcome: 'complete' } },
      { id: ids.no, type: 'flow.end', position: { x: 760, y: 210 }, config: { outcome: 'stop' } },
    ],
    edges: [
      { id: edgeIds.start, source: ids.trigger, sourcePort: 'next', target: ids.condition, targetPort: 'in' },
      { id: edgeIds.yes, source: ids.condition, sourcePort: 'true', target: ids.yes, targetPort: 'in' },
      { id: edgeIds.no, source: ids.condition, sourcePort: 'false', target: ids.no, targetPort: 'in' },
    ],
  }
}

describe('automation workflow graph validation', () => {
  it('accepts an event trigger with complete true and false branches', () => {
    expect(validateWorkflow(completeWorkflow())).toEqual([])
  })

  it('reports incomplete drafts without rejecting their editable structure', () => {
    const draft = completeWorkflow()
    draft.edges = draft.edges.slice(0, 1)
    const codes = validateWorkflow(draft).map((issue) => issue.code)
    expect(codes).toContain('missing_branch')
    expect(codes).toContain('open_path')
  })

  it('reports cycles and invalid output ports', () => {
    const graph = completeWorkflow()
    graph.edges[1] = { ...graph.edges[1]!, sourcePort: 'next' as 'true' }
    graph.edges.push({ id: '10000000-0000-4000-8000-000000000004', source: ids.condition, sourcePort: 'false', target: ids.trigger, targetPort: 'in' })
    const codes = validateWorkflow(graph).map((issue) => issue.code)
    expect(codes).toContain('invalid_edge')
    expect(codes).toContain('cycle')
  })

  it('validates Switch cases and requires every case plus the default route', () => {
    const switchId = '00000000-0000-4000-8000-000000000020'
    const caseA = '00000000-0000-4000-8000-000000000021'
    const caseB = '00000000-0000-4000-8000-000000000022'
    const endA = '00000000-0000-4000-8000-000000000023'
    const endB = '00000000-0000-4000-8000-000000000024'
    const endDefault = '00000000-0000-4000-8000-000000000025'
    const graph: WorkflowDefinition = {
      schemaVersion: 1, name: 'Switch routing',
      nodes: [
        { id: ids.trigger, type: 'trigger.event', position: { x: 100, y: 100 }, config: { eventType: 'message.received' } },
        { id: switchId, type: 'condition.switch', position: { x: 400, y: 100 }, config: { field: 'message.channel', cases: [{ id: caseA, value: 'whatsapp' }, { id: caseB, value: 'messenger' }] } },
        { id: endA, type: 'flow.end', position: { x: 760, y: 20 }, config: { outcome: 'complete' } },
        { id: endB, type: 'flow.end', position: { x: 760, y: 150 }, config: { outcome: 'complete' } },
        { id: endDefault, type: 'flow.end', position: { x: 760, y: 280 }, config: { outcome: 'stop' } },
      ],
      edges: [
        { id: edgeIds.start, source: ids.trigger, sourcePort: 'next', target: switchId, targetPort: 'in' },
        { id: '10000000-0000-4000-8000-000000000021', source: switchId, sourcePort: `case:${caseA}`, target: endA, targetPort: 'in' },
        { id: '10000000-0000-4000-8000-000000000022', source: switchId, sourcePort: `case:${caseB}`, target: endB, targetPort: 'in' },
        { id: '10000000-0000-4000-8000-000000000023', source: switchId, sourcePort: 'default', target: endDefault, targetPort: 'in' },
      ],
    }
    expect(validateWorkflow(graph)).toEqual([])
    graph.edges.pop()
    expect(validateWorkflow(graph).some((issue) => issue.code === 'missing_branch' && issue.nodeId === switchId)).toBe(true)
    graph.edges.push({ id: '10000000-0000-4000-8000-000000000023', source: switchId, sourcePort: 'default', target: endDefault, targetPort: 'in' })
    const switchNode = graph.nodes.find((node) => node.id === switchId)!
    if (switchNode.type === 'condition.switch') switchNode.config.cases[1]!.value = ' WHATSAPP '
    expect(validateWorkflow(graph).some((issue) => issue.code === 'invalid_node' && issue.nodeId === switchId)).toBe(true)
  })

  it('accepts connected waits and rejects out-of-range durations', () => {
    const graph = completeWorkflow()
    const yesEnd = graph.nodes.find((node) => node.id === ids.yes)!
    const waitId = '00000000-0000-4000-8000-000000000005'
    graph.nodes.push({ id: waitId, type: 'flow.wait', position: { x: 600, y: 100 }, config: { durationSeconds: 60 } })
    const trueEdge = graph.edges.find((edge) => edge.sourcePort === 'true')!
    trueEdge.target = waitId
    graph.edges.push({ id: '10000000-0000-4000-8000-000000000005', source: waitId, sourcePort: 'next', target: yesEnd.id, targetPort: 'in' })
    expect(validateWorkflow(graph)).toEqual([])
    const wait = graph.nodes.find((node) => node.id === waitId)!
    if (wait.type === 'flow.wait') wait.config.durationSeconds = 0
    expect(validateWorkflow(graph).some((issue) => issue.code === 'invalid_node' && issue.nodeId === waitId)).toBe(true)
  })

  it('accepts an opportunity stage action and rejects unknown stages', () => {
    const graph = completeWorkflow()
    const condition = graph.nodes.find((node) => node.type === 'condition.if')!
    const yesEnd = graph.nodes.find((node) => node.id === ids.yes)!
    const actionId = '00000000-0000-4000-8000-000000000006'
    graph.nodes.push({ id: actionId, type: 'opportunity.update_stage', position: { x: 600, y: 30 }, config: { stage: 'working' } })
    const yesEdge = graph.edges.find((edge) => edge.source === condition.id && edge.sourcePort === 'true')!
    yesEdge.target = actionId
    graph.edges.push({ id: '10000000-0000-4000-8000-000000000006', source: actionId, sourcePort: 'next', target: yesEnd.id, targetPort: 'in' })
    expect(validateWorkflow(graph)).toEqual([])
    const action = graph.nodes.find((node) => node.id === actionId)!
    if (action.type === 'opportunity.update_stage') (action.config as { stage: string }).stage = 'unknown'
    expect(validateWorkflow(graph).some((issue) => issue.code === 'invalid_node' && issue.nodeId === actionId)).toBe(true)
  })

  it('accepts opportunity assignment only with an opportunity trigger and valid advisor id', () => {
    const graph = completeWorkflow()
    const trigger = graph.nodes.find((node) => node.type === 'trigger.event')!
    const triggerIndex = graph.nodes.indexOf(trigger)
    const condition = graph.nodes.find((node) => node.type === 'condition.if')!
    const end = graph.nodes.find((node) => node.type === 'flow.end' && node.config.outcome === 'complete')!
    const actionId = '00000000-0000-4000-8000-000000000009'
    graph.nodes[triggerIndex] = { ...trigger, config: { eventType: 'opportunity.assigned' } }
    graph.nodes.push({ id: actionId, type: 'opportunity.assign', position: { x: 600, y: 30 }, config: { assignedUserId: '30000000-0000-4000-8000-000000000002' } })
    graph.edges.find((edge) => edge.source === condition.id && edge.sourcePort === 'true')!.target = actionId
    graph.edges.push({ id: '10000000-0000-4000-8000-000000000009', source: actionId, sourcePort: 'next', target: end.id, targetPort: 'in' })
    expect(validateWorkflow(graph)).toEqual([])
    graph.nodes[triggerIndex] = { ...trigger, config: { eventType: 'message.received' } }
    expect(validateWorkflow(graph).some((issue) => issue.code === 'invalid_node' && issue.nodeId === actionId)).toBe(true)
    graph.nodes[triggerIndex] = { ...trigger, config: { eventType: 'opportunity.assigned' } }
    const action = graph.nodes.find((node) => node.id === actionId)!
    if (action.type === 'opportunity.assign') action.config.assignedUserId = 'invalid-user'
    expect(validateWorkflow(graph).some((issue) => issue.code === 'invalid_node' && issue.nodeId === actionId)).toBe(true)
  })

  it('accepts appointment status actions only with appointment events', () => {
    const graph = completeWorkflow()
    const trigger = graph.nodes.find((node) => node.type === 'trigger.event')!
    const triggerIndex = graph.nodes.indexOf(trigger)
    const condition = graph.nodes.find((node) => node.type === 'condition.if')!
    const end = graph.nodes.find((node) => node.id === ids.yes)!
    const actionId = '00000000-0000-4000-8000-000000000010'
    graph.nodes[triggerIndex] = { ...trigger, config: { eventType: 'appointment.status_changed' } }
    graph.nodes.push({ id: actionId, type: 'appointment.update_status', position: { x: 600, y: 30 }, config: { status: 'confirmed' } })
    graph.edges.find((edge) => edge.source === condition.id && edge.sourcePort === 'true')!.target = actionId
    graph.edges.push({ id: '10000000-0000-4000-8000-000000000010', source: actionId, sourcePort: 'next', target: end.id, targetPort: 'in' })
    expect(validateWorkflow(graph)).toEqual([])
    graph.nodes[triggerIndex] = { ...trigger, config: { eventType: 'message.received' } }
    expect(validateWorkflow(graph).some((issue) => issue.code === 'invalid_node' && issue.nodeId === actionId)).toBe(true)
    graph.nodes[triggerIndex] = { ...trigger, config: { eventType: 'appointment.status_changed' } }
    const action = graph.nodes.find((node) => node.id === actionId)!
    if (action.type === 'appointment.update_status') action.config.status = 'invalid' as 'scheduled'
    expect(validateWorkflow(graph).some((issue) => issue.code === 'invalid_node' && issue.nodeId === actionId)).toBe(true)
  })

  it('accepts contact tag actions only with a contact trigger', () => {
    const graph = completeWorkflow()
    const trigger = graph.nodes.find((node) => node.type === 'trigger.event')!
    const condition = graph.nodes.find((node) => node.type === 'condition.if')!
    const end = graph.nodes.find((node) => node.type === 'flow.end')!
    const actionId = '00000000-0000-4000-8000-000000000007'
    graph.nodes.push({ id: actionId, type: 'contact.manage_tag', position: { x: 600, y: 30 }, config: { action: 'add', tag: 'seguimiento' } })
    graph.edges.find((edge) => edge.source === condition.id && edge.sourcePort === 'true')!.target = actionId
    graph.edges.push({ id: '10000000-0000-4000-8000-000000000007', source: actionId, sourcePort: 'next', target: end.id, targetPort: 'in' })
    expect(validateWorkflow(graph).some((issue) => issue.nodeId === actionId)).toBe(true)
    graph.nodes[graph.nodes.indexOf(trigger)] = { ...trigger, config: { eventType: 'contact.created' } }
    expect(validateWorkflow(graph)).toEqual([])
    const action = graph.nodes.find((node) => node.id === actionId)!
    if (action.type === 'contact.manage_tag') action.config.tag = '  '
    expect(validateWorkflow(graph).some((issue) => issue.code === 'invalid_node' && issue.nodeId === actionId)).toBe(true)
  })

  it('accepts contact field updates only for allowlisted fields and valid values', () => {
    const graph = completeWorkflow()
    const trigger = graph.nodes.find((node) => node.type === 'trigger.event')!
    const condition = graph.nodes.find((node) => node.type === 'condition.if')!
    const end = graph.nodes.find((node) => node.type === 'flow.end')!
    const actionId = '00000000-0000-4000-8000-000000000008'
    graph.nodes[graph.nodes.indexOf(trigger)] = { ...trigger, config: { eventType: 'contact.updated' } }
    graph.nodes.push({ id: actionId, type: 'contact.update_field', position: { x: 600, y: 30 }, config: { field: 'preferredLanguage', value: 'es' } })
    graph.edges.find((edge) => edge.source === condition.id && edge.sourcePort === 'true')!.target = actionId
    graph.edges.push({ id: '10000000-0000-4000-8000-000000000008', source: actionId, sourcePort: 'next', target: end.id, targetPort: 'in' })
    expect(validateWorkflow(graph)).toEqual([])
    const action = graph.nodes.find((node) => node.id === actionId)!
    if (action.type === 'contact.update_field') action.config = { field: 'preferredLanguage', value: 'invalid locale' }
    expect(validateWorkflow(graph).some((issue) => issue.code === 'invalid_node' && issue.nodeId === actionId)).toBe(true)
    if (action.type === 'contact.update_field') action.config = { field: 'phone' as 'displayName', value: '+15551234567' }
    expect(validateWorkflow(graph).some((issue) => issue.code === 'invalid_node' && issue.nodeId === actionId)).toBe(true)
  })
})
