import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AutomationWorkflowsView from './AutomationWorkflowsView'
import type { WorkflowDefinition, WorkflowRecord } from '../../../domain/automation/workflow'

const mocks = vi.hoisted(() => ({
  listDealers: vi.fn(), list: vi.fn(), get: vi.fn(), create: vi.fn(), saveDraft: vi.fn(),
}))

afterEach(cleanup)

vi.mock('../../../core/container', () => ({ appServices: {
  contacts: { listDealers: mocks.listDealers },
  automationWorkflows: { list: mocks.list, get: mocks.get, create: mocks.create, saveDraft: mocks.saveDraft },
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
    mocks.list.mockResolvedValue([])
    mocks.create.mockImplementation(async (_dealerId: string, name: string) => ({ workflow: blankRecord(name), validationIssues: [] }))
    mocks.saveDraft.mockImplementation(async (_dealerId: string, workflow: WorkflowRecord, name: string, definition: WorkflowDefinition) => ({
      workflow: { ...workflow, name, draft: { revision: workflow.draft.revision + 1, definition: { ...definition, name }, updatedAt: '2026-11-26T12:05:00.000Z' } }, validationIssues: [],
    }))
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

  it('moves the minimap viewport when the canvas scrolls', async () => {
    const user = userEvent.setup()
    render(<AutomationWorkflowsView search="" />)
    await user.click(await screen.findByRole('button', { name: 'Crear automatización' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Minimapa dinámico')
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }))
    await user.click(await screen.findByRole('button', { name: 'Añadir trigger' }))

    const canvasShell = document.querySelector('.automation-canvas-shell') as HTMLDivElement
    const minimap = screen.getByLabelText('Minimapa del workflow') as HTMLDivElement
    const viewportIndicator = minimap.querySelector('span')!
    expect(viewportIndicator.style.top).toBe('12px')
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
})
