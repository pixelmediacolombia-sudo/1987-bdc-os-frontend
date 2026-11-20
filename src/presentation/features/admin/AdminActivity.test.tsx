// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminActivity from './AdminActivity'

const event = {
  id: 'event-1', actor_email: 'admin@bdc-os.local', actor_name: 'Admin BDC OS', dealer_id: 'dealer-1',
  dealer_name: 'Dealer Andino', category: 'dealers', action: 'dealer.created', outcome: 'success',
  summary: 'Dealer creado y se registró la invitación.', reference_id: 'req-123', created_at: '2026-11-20T15:00:00.000Z',
}
const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
const dealers = [{ id: 'dealer-1', name: 'Dealer Andino', users: 1, pendingInvitations: 0, status: 'Activo' as const, initials: 'DA' }]

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('AdminActivity', () => {
  it('renders backend events and expands the immutable reference details', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ events: [event], total: 1, limit: 50, offset: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminActivity dealers={dealers} />)

    expect(await screen.findByText('Dealer creado')).toBeTruthy()
    expect(screen.getByText('Admin BDC OS')).toBeTruthy()
    expect(screen.getAllByText('Dealer Andino').length).toBeGreaterThanOrEqual(2)
    const row = screen.getByRole('row', { name: /Dealer creado/ })
    fireEvent.click(within(row).getByRole('button', { name: /Ver detalles del evento/ }))
    expect(await screen.findByText('Dealer creado y se registró la invitación.')).toBeTruthy()
    expect(screen.getByText('req-123')).toBeTruthy()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/admin/audit?')
  })

  it('passes selected category and dealer filters to the backend', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      return Promise.resolve(response({ events: [], total: 0, limit: 50, offset: 0, receivedCategory: url.searchParams.get('category') }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminActivity dealers={dealers} />)

    await screen.findByText('Aún no hay eventos registrados')
    fireEvent.change(screen.getByLabelText('Dealer'), { target: { value: 'dealer-1' } })
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'invitations' } })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    const requestedUrl = new URL(String(fetchMock.mock.calls.at(-1)?.[0]), 'http://localhost')
    expect(requestedUrl.searchParams.get('dealerId')).toBe('dealer-1')
    expect(requestedUrl.searchParams.get('category')).toBe('invitations')
    expect(screen.getByText('No hay eventos con estos filtros')).toBeTruthy()
  })
})
