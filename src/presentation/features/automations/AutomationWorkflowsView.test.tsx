import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AutomationWorkflowsView from './AutomationWorkflowsView'
import type { WorkflowDefinition, WorkflowRecord } from '../../../domain/automation/workflow'

const mocks = vi.hoisted(() => ({
  listDealers: vi.fn(), listConversationAssignees: vi.fn(), list: vi.fn(), get: vi.fn(), create: vi.fn(), saveDraft: vi.fn(), publish: vi.fn(),
  listRuns: vi.fn(), cancelRun: vi.fn(), retryRun: vi.fn(), replayRun: vi.fn(),
}))

afterEach(cleanup)

vi.mock('../../../core/container', () => ({ appServices: {
  contacts: { listDealers: mocks.listDealers, listConversationAssignees: mocks.listConversationAssignees },
  automationWorkflows: { list: mocks.list, get: mocks.get, create: mocks.create, saveDraft: mocks.saveDraft, publish: mocks.publish, listRuns: mocks.listRuns, cancelRun: mocks.cancelRun, retryRun: mocks.retryRun, replayRun: mocks.replayRun },
} }))

function blankRecord(name: string): WorkflowRecord {
  const definition: WorkflowDefinition = { schemaVersion: 1, name, nodes: [], edges: [] }
  return { id: '20000000-0000-4000-8000-000000000001', name, draft: { revision: 1, definition, updatedAt: '2026-11-26T12:00:00.000Z' }, published: null }
}

describe('automation workflow canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    mocks.listDealers.mockResolvedValue([{ id: '30000000-0000-4000-8000-000000000001', name: 'Stafford Motors' }])
    mocks.listConversationAssignees.mockResolvedValue([{ id: '30000000-0000-4000-8000-000000000002', displayName: 'Ana Asesora' }])
    mocks.list.mockResolvedValue([])
    mocks.listRuns.mockResolvedValue([])
    mocks.cancelRun.mockResolvedValue({ run: { id: 'run-1', status: 'cancelled', generation: 1 } })
    mocks.retryRun.mockResolvedValue({ run: { id: 'run-1', status: 'queued', generation: 1 } })
    mocks.replayRun.mockResolvedValue({ run: { id: 'run-2', status: 'queued', generation: 2 } })
    mocks.create.mockImplementation(async (_dealerId: string, name: string) => ({ workflow: blankRecord(name), validationIssues: [] }))
    mocks.saveDraft.mockImplementation(async (_dealerId: string, workflow: WorkflowRecord, name: string, definition: WorkflowDefinition) => ({
      workflow: { ...workflow, name, draft: { revision: workflow.draft.revision + 1, definition: { ...definition, name }, updatedAt: '2026-11-26T12:05:00.000Z' } }, validationIssues: [],
    }))
    mocks.publish.mockImplementation(async (_dealerId: string, workflow: WorkflowRecord) => ({
      workflow: { ...workflow, published: { revision: workflow.draft.revision, definition: workflow.draft.definition, publishedAt: '2026-11-26T12:10:00.000Z' } }, validationIssues: [],
    }))
  })

  it('explains the selected trigger event and updates the explanation when it changes', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Descripción del evento')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))

    const eventSelect = screen.getByRole('combobox', { name: /Evento que inicia el workflow/ })
    expect(screen.getByText('Se activa cuando el CRM recibe un mensaje entrante de un cliente.')).toBeTruthy()
    await user.selectOptions(eventSelect, 'contact.created')
    expect(screen.getByText('Se activa cuando se crea un contacto nuevo en este dealer.')).toBeTruthy()
  })

  it('filters the node palette by name or description', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Buscar nodos')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.type(screen.getByRole('textbox', { name: 'Buscar nodo' }), 'asesor')
    expect(screen.getByRole('button', { name: /Asignar conversación/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Condición IF/ })).toBeNull()
  })

  it('configures an opportunity assignment with an active dealer advisor', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Asignar oportunidad')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))
    await user.selectOptions(screen.getByRole('combobox', { name: /Evento que inicia el workflow/ }), 'opportunity.assigned')
    await user.click(screen.getByRole('button', { name: /Asignar oportunidad/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Asesor responsable de la oportunidad' }), '30000000-0000-4000-8000-000000000002')

    expect(screen.getAllByRole('article').find((article) => article.textContent?.includes('Asignar oportunidad'))?.textContent).toContain('Ana Asesora')
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    const [, , , savedDefinition] = mocks.saveDraft.mock.calls[0] as [string, WorkflowRecord, string, WorkflowDefinition]
    expect(savedDefinition.nodes.find((node) => node.type === 'opportunity.assign')?.config).toEqual({ assignedUserId: '30000000-0000-4000-8000-000000000002' })
  })

  it('configures and saves a supported appointment status action', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Confirmar cita')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))
    await user.selectOptions(screen.getByRole('combobox', { name: /Evento que inicia el workflow/ }), 'appointment.status_changed')
    await user.click(screen.getByRole('button', { name: /Cambiar estado de cita/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Nuevo estado de la cita' }), 'confirmed')
    await user.click(screen.getByRole('button', { name: /FinCierra una ruta/ }))
    await user.click(screen.getByRole('button', { name: 'Salida siguiente de Evento de CRM' }))
    await user.click(screen.getByRole('button', { name: 'Entrada de Cambiar estado de cita' }))
    await user.click(screen.getByRole('button', { name: 'Salida siguiente de Cambiar estado de cita' }))
    await user.click(screen.getByRole('button', { name: 'Entrada de Fin de ruta' }))
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    const [, , , savedDefinition] = mocks.saveDraft.mock.calls[0] as [string, WorkflowRecord, string, WorkflowDefinition]
    expect(savedDefinition.nodes.find((node) => node.type === 'appointment.update_status')?.config).toEqual({ status: 'confirmed' })
  })

  it('creates a draft, connects an IF branch graph, and saves its definition', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Messenger follow-up')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))

    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))
    await user.click(screen.getByRole('button', { name: /Condición IF/ }))
    await user.click(screen.getByRole('button', { name: /EsperarPausa y reanuda/ }))
    await user.click(screen.getAllByRole('button', { name: /FinCierra una ruta/ })[0]!)
    await user.click(screen.getByRole('button', { name: /FinCierra una ruta/ }))

    await user.click(screen.getAllByRole('button', { name: 'Salida siguiente de Evento de CRM' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Entrada de Condición IF' }))
    await user.click(screen.getByRole('button', { name: 'Salida verdadero' }))
    await user.click(screen.getByRole('button', { name: 'Entrada de Esperar' }))
    await user.click(screen.getByRole('button', { name: 'Salida siguiente de Esperar' }))
    await user.click(screen.getAllByRole('button', { name: 'Entrada de Fin de ruta' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Salida falso' }))
    await user.click(screen.getAllByRole('button', { name: 'Entrada de Fin de ruta' })[1]!)
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    const [, , savedName, savedDefinition] = mocks.saveDraft.mock.calls[0] as [string, WorkflowRecord, string, WorkflowDefinition]
    expect(savedName).toBe('Messenger follow-up')
    expect(savedDefinition.nodes).toHaveLength(5)
    expect(savedDefinition.edges).toHaveLength(4)
    expect(screen.getByText('Borrador guardado')).toBeTruthy()
  })

  it('configures Switch values and connects each case and the default route', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Rutas por canal')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))
    await user.click(screen.getByRole('button', { name: /Condición Switch/ }))
    await user.clear(screen.getByRole('textbox', { name: 'Valor del caso 1' }))
    await user.type(screen.getByRole('textbox', { name: 'Valor del caso 1' }), 'whatsapp')
    await user.clear(screen.getByRole('textbox', { name: 'Valor del caso 2' }))
    await user.type(screen.getByRole('textbox', { name: 'Valor del caso 2' }), 'messenger')
    await user.click(screen.getAllByRole('button', { name: /FinCierra una ruta/ })[0]!)
    await user.click(screen.getAllByRole('button', { name: /FinCierra una ruta/ })[0]!)
    await user.click(screen.getByRole('button', { name: /FinCierra una ruta/ }))
    await user.click(screen.getByRole('button', { name: 'Salida siguiente de Evento de CRM' }))
    await user.click(screen.getByRole('button', { name: 'Entrada de Condición Switch' }))
    await user.click(screen.getByRole('button', { name: 'Salida whatsapp' }))
    await user.click(screen.getAllByRole('button', { name: 'Entrada de Fin de ruta' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Salida messenger' }))
    await user.click(screen.getAllByRole('button', { name: 'Entrada de Fin de ruta' })[1]!)
    await user.click(screen.getByRole('button', { name: 'Salida Por defecto' }))
    await user.click(screen.getAllByRole('button', { name: 'Entrada de Fin de ruta' })[2]!)
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    const [, , , savedDefinition] = mocks.saveDraft.mock.calls[0] as [string, WorkflowRecord, string, WorkflowDefinition]
    const switchNode = savedDefinition.nodes.find((node) => node.type === 'condition.switch')
    expect(switchNode?.type === 'condition.switch' ? switchNode.config.cases.map((item) => item.value) : []).toEqual(['whatsapp', 'messenger'])
    expect(savedDefinition.edges.filter((edge) => edge.sourcePort.startsWith('case:') || edge.sourcePort === 'default')).toHaveLength(3)
  })

  it('configures and saves the real opportunity stage action node', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Cambiar etapa local')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))

    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))
    await user.click(screen.getAllByRole('button', { name: /Cambiar etapaActualizar oportunidad/ })[0]!)
    await user.click(screen.getAllByRole('button', { name: /FinCierra una ruta/ })[0]!)
    await user.click(screen.getAllByRole('button', { name: 'Salida siguiente de Evento de CRM' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Entrada de Cambiar etapa de oportunidad' }))
    await user.click(screen.getByRole('button', { name: 'Seleccionar Cambiar etapa de oportunidad' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Nueva etapa de la oportunidad' }), 'won')
    await user.click(screen.getByRole('button', { name: 'Salida siguiente de Cambiar etapa de oportunidad' }))
    await user.click(screen.getAllByRole('button', { name: 'Entrada de Fin de ruta' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    const [, , , savedDefinition] = mocks.saveDraft.mock.calls[0] as [string, WorkflowRecord, string, WorkflowDefinition]
    expect(savedDefinition.nodes.find((node) => node.type === 'opportunity.update_stage')?.config).toEqual({ stage: 'won' })
    expect(savedDefinition.edges).toHaveLength(2)
    expect(screen.getByText('Borrador guardado')).toBeTruthy()
    expect(document.querySelector('.automation-editor--fullscreen')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver a automatizaciones' }))
    expect(await screen.findByRole('heading', { name: 'Automatizaciones' })).toBeTruthy()
  })

  it('publishes a saved workflow only after its implemented stage action is valid', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Oportunidad nueva a en proceso')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))
    await user.click(screen.getByRole('button', { name: 'Seleccionar Evento de CRM' }))
    await user.selectOptions(screen.getByRole('combobox', { name: /^Evento que inicia el workflow/ }), 'opportunity.created')
    await user.click(screen.getAllByRole('button', { name: /Cambiar etapaActualizar oportunidad/ })[0]!)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Nueva etapa de la oportunidad' }), 'working')
    await user.click(screen.getAllByRole('button', { name: /FinCierra una ruta/ })[0]!)
    await user.click(screen.getByRole('button', { name: 'Salida siguiente de Evento de CRM' }))
    await user.click(screen.getByRole('button', { name: 'Entrada de Cambiar etapa de oportunidad' }))
    await user.click(screen.getByRole('button', { name: 'Salida siguiente de Cambiar etapa de oportunidad' }))
    await user.click(screen.getByRole('button', { name: 'Entrada de Fin de ruta' }))
    expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Publicar' }))
    await waitFor(() => expect(mocks.publish).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Workflow publicado · v2')).toBeTruthy()
    expect(document.querySelector('.automation-canvas-toolbar')?.textContent).toContain('Publicado · v2')
  })

  it('moves the minimap viewport when the canvas scrolls', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Minimapa dinámico')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))

    const canvasShell = document.querySelector('.automation-canvas-shell') as HTMLDivElement
    const minimap = screen.getByRole('img', { name: /^Minimapa del workflow/ }) as HTMLDivElement
    const viewportIndicator = minimap.querySelector('span')!
    expect(viewportIndicator.style.top).toBe('10px')
    Object.defineProperties(canvasShell, {
      clientWidth: { configurable: true, value: 600 }, clientHeight: { configurable: true, value: 400 },
      scrollWidth: { configurable: true, value: 1800 }, scrollHeight: { configurable: true, value: 1150 },
    })
    canvasShell.scrollTop = 400
    canvasShell.scrollLeft = 350
    fireEvent.scroll(canvasShell)

    expect(viewportIndicator.style.top).not.toBe('12px')
    expect(viewportIndicator.style.left).not.toBe('12px')

    canvasShell.setPointerCapture = vi.fn()
    fireEvent.pointerDown(canvasShell, { button: 0, pointerId: 7, clientX: 300, clientY: 300 })
    fireEvent.pointerMove(canvasShell, { pointerId: 7, clientX: 300, clientY: 200 })
    expect(canvasShell.scrollTop).toBe(500)
    expect(viewportIndicator.style.top).not.toBe('12px')
    fireEvent.pointerUp(canvasShell, { pointerId: 7 })
  })

  it('resizes the minimap viewport when zoom changes', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Zoom minimap')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))

    const shell = document.querySelector('.automation-canvas-shell') as HTMLDivElement
    const viewport = screen.getByRole('img', { name: /^Minimapa del workflow/ }).querySelector('span')!
    Object.defineProperties(shell, {
      clientWidth: { configurable: true, value: 600 }, clientHeight: { configurable: true, value: 400 },
      scrollWidth: { configurable: true, value: 1800 }, scrollHeight: { configurable: true, value: 1150 },
    })
    fireEvent.scroll(shell)
    await waitFor(() => expect(Number.parseFloat(viewport.style.width)).toBeGreaterThan(0))
    const beforeZoom = Number.parseFloat(viewport.style.width)
    await user.click(screen.getByRole('button', { name: 'Acercar' }))
    await waitFor(() => expect(Number.parseFloat(viewport.style.width)).toBeLessThan(beforeZoom))
  })

  it('moves a node when dragging its card body', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Mover nodo libre')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))

    const node = screen.getByRole('article')
    node.setPointerCapture = vi.fn()
    const initialLeft = Number.parseFloat((node as HTMLElement).style.left)
    const initialTop = Number.parseFloat((node as HTMLElement).style.top)
    fireEvent.pointerDown(node, { button: 0, pointerId: 9, clientX: 200, clientY: 200 })
    fireEvent.pointerMove(node, { pointerId: 9, clientX: 290, clientY: 245 })

    expect((node as HTMLElement).style.left).toBe(`${initialLeft + 100}px`)
    expect((node as HTMLElement).style.top).toBe(`${initialTop + 50}px`)
    fireEvent.pointerUp(node, { pointerId: 9 })
  })

  it('extends the canvas when nodes are moved beyond its previous edge', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Canvas expandible')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))

    const node = screen.getByRole('article')
    node.setPointerCapture = vi.fn()
    const frame = document.querySelector('.automation-canvas-frame') as HTMLDivElement
    expect(Number.parseFloat(frame.style.width)).toBe(1620)
    fireEvent.pointerDown(node, { button: 0, pointerId: 17, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(node, { pointerId: 17, clientX: 1900, clientY: 100 })

    expect(Number.parseFloat(frame.style.width)).toBeGreaterThan(1620)
    expect(node.style.left).toBe('2100px')
    fireEvent.pointerUp(node, { pointerId: 17 })
  })

  it('loads execution history, shows steps, and confirms replay before calling the API', async () => {
    const user = userEvent.setup()
    const record = blankRecord('Historial de workflow')
    mocks.create.mockResolvedValue({ workflow: record, validationIssues: [] })
    mocks.listRuns.mockResolvedValue([{
      id: 'run-1', status: 'failed', generation: 1, eventType: 'opportunity.stage_changed', workflowRevision: 2,
      currentNodeId: null, attempts: 4, availableAt: '2026-11-27T12:00:00.000Z', lastError: 'Falló un paso de CRM',
      createdAt: '2026-11-27T11:00:00.000Z', startedAt: '2026-11-27T11:01:00.000Z', finishedAt: '2026-11-27T11:02:00.000Z',
      steps: [{ nodeId: 'node-1', nodeType: 'opportunity.update_stage', status: 'failed', attempts: 4, output: { message: 'Respuesta simulada' }, error: 'No se pudo cambiar la etapa', startedAt: '2026-11-27T11:01:00.000Z', finishedAt: '2026-11-27T11:02:00.000Z' }],
    }])
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Historial de workflow')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Ejecuciones' }))

    expect(await screen.findByRole('heading', { name: 'opportunity.stage_changed' })).toBeTruthy()
    expect(screen.getByText('Cambiar etapa')).toBeTruthy()
    expect(screen.getByText('Falló un paso de CRM')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Reproducir desde el inicio' }))
    expect(await screen.findByRole('dialog', { name: '¿Reproducir esta ejecución?' })).toBeTruthy()
    expect(mocks.replayRun).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(mocks.replayRun).toHaveBeenCalledWith(expect.any(String), 'run-1', expect.any(String)))
    await waitFor(() => expect(mocks.listRuns).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
