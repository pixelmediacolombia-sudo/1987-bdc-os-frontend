// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminUserDirectory } from './AdminUserDirectory'

const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
const dealers = [{ id: 'dealer-1', name: 'Dealer Andino', users: 1, pendingInvitations: 1, status: 'Activo' as const, initials: 'DA' }]
const entries = [
  { record_type: 'user', id: 'user-1', display_name: 'Alex Rivera', email: 'alex@example.com', account_type: 'user', status: 'active', created_at: '2026-11-20T10:00:00.000Z', expires_at: null, dealers: [{ id: 'dealer-1', name: 'Dealer Andino' }] },
  { record_type: 'invitation', id: 'invite-1', display_name: 'Sam Lee', email: 'sam@example.com', account_type: 'user', status: 'pending', created_at: '2026-11-21T10:00:00.000Z', expires_at: '2026-11-24T10:00:00.000Z', dealers: [{ id: 'dealer-1', name: 'Dealer Andino' }] },
]

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('AdminUserDirectory', () => {
  it('renders accounts and pending invitations without exposing invitation tokens', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ entries, total: 2, limit: 50, offset: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminUserDirectory dealers={dealers} />)

    expect(await screen.findByText('Alex Rivera')).toBeTruthy()
    expect(screen.getByText('sam@example.com')).toBeTruthy()
    expect(screen.getByText('Invitación pendiente')).toBeTruthy()
    expect(screen.getAllByText('Dealer Andino').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('1–2 de 2')).toBeTruthy()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/admin/users?')
    expect(screen.queryByText(/token=/)).toBeNull()
  })

  it('sends the search and selected dealer to the backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ entries: [], total: 0, limit: 50, offset: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminUserDirectory dealers={dealers} />)
    await screen.findByText('Todavía no hay usuarios registrados')

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'alex' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    fireEvent.change(screen.getByLabelText('Dealer'), { target: { value: 'dealer-1' } })

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3))
    const requestedUrl = new URL(String(fetchMock.mock.calls.at(-1)?.[0]), 'http://localhost')
    expect(requestedUrl.pathname).toBe('/backend/auth/admin/users')
    expect(requestedUrl.searchParams.get('search')).toBe('alex')
    expect(requestedUrl.searchParams.get('dealerId')).toBe('dealer-1')
  })
})
