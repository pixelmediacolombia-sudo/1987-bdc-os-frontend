import { useRef, useState, type Dispatch, type MutableRefObject, type PointerEvent, type SetStateAction } from 'react'
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode, WorkflowNodeType } from '../../../domain/automation/workflow'
import { createWorkflowNode } from './automation-workflow-editor.helpers'

export type DragState = { id: string; pointerId: number; x: number; y: number; originX: number; originY: number }
export type PanState = { pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number }

type Options = {
  definition: WorkflowDefinition | null
  setDefinition: Dispatch<SetStateAction<WorkflowDefinition | null>>
  selectedNodeId: string | null
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>
  zoom: number
  canvasRef: MutableRefObject<HTMLDivElement | null>
}

export function useAutomationCanvasInteractions({ definition, setDefinition, selectedNodeId, setSelectedNodeId, zoom, canvasRef }: Options) {
  const [isPanning, setIsPanning] = useState(false)
  const [isMovingNode, setIsMovingNode] = useState(false)
  const [connectFrom, setConnectFrom] = useState<{ nodeId: string; port: WorkflowEdge['sourcePort'] } | null>(null)
  const [connectMessage, setConnectMessage] = useState('')
  const dragRef = useRef<DragState | null>(null)
  const panRef = useRef<PanState | null>(null)

  function addNode(type: WorkflowNodeType) {
    if (!definition) return
    if (type === 'trigger.event' && definition.nodes.some((node) => node.type === 'trigger.event')) {
      setConnectMessage('Este workflow admite un solo trigger.')
      return
    }
    const node = createWorkflowNode(type, definition.nodes.length)
    setDefinition((current) => current ? { ...current, nodes: [...current.nodes, node] } : current)
    setSelectedNodeId(node.id)
    setConnectMessage('')
  }

  function changeNode(nodeId: string, update: (node: WorkflowNode) => WorkflowNode) {
    setDefinition((current) => current ? { ...current, nodes: current.nodes.map((node) => node.id === nodeId ? update(node) : node) } : current)
  }

  function removeSwitchCase(nodeId: string, caseId: string) {
    setDefinition((current) => current ? {
      ...current,
      nodes: current.nodes.map((node) => node.id === nodeId && node.type === 'condition.switch' && node.config.cases.length > 2 ? { ...node, config: { ...node.config, cases: node.config.cases.filter((item) => item.id !== caseId) } } : node),
      edges: current.edges.filter((edge) => edge.source !== nodeId || edge.sourcePort !== `case:${caseId}`),
    } : current)
  }

  function removeSelectedNode() {
    if (!selectedNodeId) return
    const id = selectedNodeId
    setDefinition((current) => current ? { ...current, nodes: current.nodes.filter((node) => node.id !== id), edges: current.edges.filter((edge) => edge.source !== id && edge.target !== id) } : current)
    setSelectedNodeId(null)
  }

  function clickOutput(nodeId: string, port: WorkflowEdge['sourcePort']) {
    setConnectFrom({ nodeId, port })
    setConnectMessage('Ahora elige la entrada del nodo de destino.')
  }

  function clickInput(targetId: string) {
    if (!connectFrom || !definition) return
    if (connectFrom.nodeId === targetId) {
      setConnectMessage('Un nodo no puede conectarse consigo mismo.')
      return
    }
    if (definition.edges.some((edge) => edge.target === targetId)) {
      setConnectMessage('Ese nodo ya tiene una entrada conectada.')
      return
    }
    const edge: WorkflowEdge = { id: crypto.randomUUID(), source: connectFrom.nodeId, sourcePort: connectFrom.port, target: targetId, targetPort: 'in' }
    setDefinition((current) => current ? { ...current, edges: [...current.edges, edge] } : current)
    setConnectFrom(null)
    setConnectMessage('Conexión creada.')
  }

  function startMove(event: PointerEvent<HTMLElement>, node: WorkflowNode) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button,input,select,textarea,a,[role="button"]')) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id: node.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: node.position.x, originY: node.position.y }
    setSelectedNodeId(node.id)
    setIsMovingNode(true)
  }

  function moveNode(event: PointerEvent<HTMLElement>) {
    const pan = panRef.current
    if (pan && pan.pointerId === event.pointerId) {
      const shell = canvasRef.current
      if (shell) {
        shell.scrollLeft = pan.scrollLeft - (event.clientX - pan.x)
        shell.scrollTop = pan.scrollTop - (event.clientY - pan.y)
      }
      return
    }
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = (event.clientX - drag.x) / zoom
    const dy = (event.clientY - drag.y) / zoom
    setDefinition((current) => current ? {
      ...current,
      nodes: current.nodes.map((node) => node.id === drag.id
        ? { ...node, position: { x: Math.max(0, drag.originX + dx), y: Math.max(0, drag.originY + dy) } }
        : node),
    } : current)
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
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
      setIsMovingNode(false)
    }
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null
      setIsPanning(false)
    }
  }

  function resetConnections() {
    setConnectFrom(null)
    setConnectMessage('')
  }

  return {
    addNode,
    changeNode,
    removeSwitchCase,
    removeSelectedNode,
    clickOutput,
    clickInput,
    startMove,
    moveNode,
    startPan,
    endMove,
    isPanning,
    isMovingNode,
    movingNodeId: dragRef.current?.id ?? null,
    connectFrom,
    connectMessage,
    resetConnections,
    setConnectMessage,
  }
}
