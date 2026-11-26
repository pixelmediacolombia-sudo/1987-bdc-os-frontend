import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AutomationWorkflowsView from './AutomationWorkflowsView'
import type { WorkflowDefinition, WorkflowRecord } from '../../../domain/automation/workflow'

const mocks = vi.hoisted(() => ({
  listDealers: vi.fn(), list: vi.fn(), get: vi.fn(), create: vi.fn(), saveDraft: vi.fn(),
}))

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
    await user.click(screen.getByRole('button', { name: /FinCierra una ruta/ }))
    await user.click(screen.getByRole('button', { name: /FinCierra una ruta/ }))

    await user.click(screen.getByRole('button', { name: 'Salida siguiente del trigger' }))
    await user.click(screen.getByRole('button', { name: 'Entrada de Condición IF' }))
    await user.click(screen.getByRole('button', { name: 'Salida verdadero' }))
    await user.click(screen.getAllByRole('button', { name: 'Entrada de Fin de ruta' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Salida falso' }))
    await user.click(screen.getAllByRole('button', { name: 'Entrada de Fin de ruta' })[1]!)
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    const [, , savedName, savedDefinition] = mocks.saveDraft.mock.calls[0] as [string, WorkflowRecord, string, WorkflowDefinition]
    expect(savedName).toBe('Messenger follow-up')
    expect(savedDefinition.nodes).toHaveLength(4)
    expect(savedDefinition.edges).toHaveLength(3)
    expect(screen.getByText('Borrador guardado')).toBeTruthy()
  })
})
