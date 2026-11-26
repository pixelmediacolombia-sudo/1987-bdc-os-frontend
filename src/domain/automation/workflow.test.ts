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
})
