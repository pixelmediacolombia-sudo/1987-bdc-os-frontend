// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import LoginScreen from '../features/auth/LoginScreen'

const localUser = { id: 'dealer-user', email: 'asesor@dealer.local', displayName: 'Asesor Dealer', accountType: 'user' as const }
const localAdmin = { id: 'local-admin', email: 'admin@bdc-os.local', displayName: 'Admin BDC OS local', accountType: 'admin' as const }
const jsonResponse = (payload: unknown, status = 200) => ({ ok: status < 400, status, json: async () => payload })
const adminDealers = [
  { id: 'dealer-andino', name: 'Grupo Andino Motors', status: 'active', user_count: 5, pending_invitation_count: 0 },
  { id: 'dealer-valle', name: 'Autocentro del Valle', status: 'active', user_count: 3, pending_invitation_count: 0 },
  { id: 'dealer-norte', name: 'Ruta Norte Autos', status: 'active', user_count: 0, pending_invitation_count: 1 },
  { id: 'dealer-costa', name: 'Costa Motor Group', status: 'suspended', user_count: 2, pending_invitation_count: 0 },
]

function stubAdminApis() {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/admin/dealers') && init?.method === 'POST') {
      return Promise.resolve(jsonResponse({ dealer: { id: 'new-dealer', name: 'Nuevo Dealer', status: 'onboarding' }, invitation: { url: 'http://localhost:3000/auth/invitations/accept?token=sample-token', expiresInHours: 72 } }, 201))
    }
    if (String(input).endsWith('/admin/dealers')) return Promise.resolve(jsonResponse({ dealers: adminDealers }))
    return Promise.resolve(jsonResponse({ authenticated: true, user: localAdmin }))
  }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ authenticated: true, user: localUser })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function renderDashboard() {
  render(<App />)
  await screen.findByRole('heading', { name: 'Tu operación, en un solo lugar' })
}

describe('BDC OS CRM first screen', () => {
  it('shows the demo dashboard and clearly labels local sample data', async () => {
    await renderDashboard()
    expect(screen.getAllByText('Entorno de prueba').length).toBeGreaterThan(0)
    expect(screen.getByText(/Los indicadores y contactos son ficticios/)).toBeTruthy()
    expect(screen.getByText('Asesor Dealer')).toBeTruthy()
  })

  it('filters the work queue by priority and new contacts', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Prioridad' }))
    expect(screen.getByText('Laura Méndez')).toBeTruthy()
    expect(screen.getByText('Julián Torres')).toBeTruthy()
    expect(screen.queryByText('Andrés Rojas')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Nuevos' }))
    expect(screen.getByText('Andrés Rojas')).toBeTruthy()
    expect(screen.queryByText('Laura Méndez')).toBeNull()
  })

  it('searches the demo contacts', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    await user.type(screen.getByRole('textbox', { name: 'Buscar en el CRM' }), 'Valentina')
    expect(screen.getByText('Valentina Cruz')).toBeTruthy()
    expect(screen.queryByText('Mariana Ospina')).toBeNull()
  })

  it('creates an in-memory demo opportunity without a backend write', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Nueva oportunidad' }))
    const dialog = screen.getByRole('dialog', { name: 'Nueva oportunidad' })
    await user.type(within(dialog).getByLabelText('Nombre del contacto'), 'Andrea Gómez')
    await user.click(within(dialog).getByRole('button', { name: 'Crear en demo' }))
    expect(screen.getByText('Andrea Gómez')).toBeTruthy()
    expect(screen.queryByText(/solo vive en esta sesión/)).toBeNull()
  })

  it('opens and closes a contact detail panel', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    await user.click(screen.getByRole('button', { name: /Laura Méndez/ }))
    expect(screen.getByRole('dialog', { name: 'Laura Méndez' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    expect(screen.queryByRole('dialog', { name: 'Laura Méndez' })).toBeNull()
  })

  it('shows the first-delivery placeholder when selecting another module', async () => {
    const user = userEvent.setup()
    await renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Oportunidades' }))
    expect(screen.getByRole('heading', { name: 'Oportunidades' })).toBeTruthy()
    expect(screen.getByText(/aún no están conectados/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver al inicio' }))
    expect(screen.getByRole('heading', { name: 'Tu operación, en un solo lugar' })).toBeTruthy()
  })

  it('loads the dealer contact directory and 360 detail from scoped APIs', async () => {
    const user = userEvent.setup()
    const contact = {
      id: 'contact-1', dealerId: 'dealer-1', providerContactId: 'meta-contact-1', displayName: null, source: 'meta', phone: '+1 555 0100', email: 'buyer@example.test',
      preferredLanguage: 'en', consentState: 'unknown', createdAt: '2026-11-24T10:00:00.000Z', updatedAt: '2026-11-24T10:00:00.000Z',
      conversationCount: 1, lastActivity: '2026-11-24T10:00:00.000Z', channels: ['messenger'],
    }
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/contacts/dealers')) return Promise.resolve(jsonResponse({ dealers: [{ id: 'dealer-1', name: 'Dealer de prueba' }] }))
      if (url.includes('/auth/contacts/contact-1?')) return Promise.resolve(jsonResponse({ contact: { ...contact, conversations: [{ id: 'conversation-1', channel: 'messenger', owner: null, state: 'open', lastActivity: contact.lastActivity, messages: [{ id: 'message-1', direction: 'inbound', senderType: 'contact', content: 'Consulta sintética de prueba', createdAt: contact.lastActivity }] }] } }))
      if (url.includes('/auth/contacts?')) return Promise.resolve(jsonResponse({ contacts: [contact], total: 1, limit: 25, offset: 0 }))
      return Promise.resolve(jsonResponse({ authenticated: true, user: localUser }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByRole('heading', { name: 'Tu operación, en un solo lugar' })
    await user.click(screen.getByRole('button', { name: 'Contactos' }))

    expect(await screen.findByRole('heading', { name: 'Directorio de contactos' })).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Abrir ficha de +1 555 0100' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Abrir ficha de +1 555 0100' }))
    expect(await screen.findByRole('dialog', { name: '+1 555 0100' })).toBeTruthy()
    expect(screen.getByText('Consulta sintética de prueba')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('/backend/auth/contacts?dealerId=dealer-1&limit=25&offset=0&sort=recent', expect.any(Object))
  })

  it('shows the login screen when there is no active session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ authenticated: false }, 401)))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeTruthy()
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy()
    expect(screen.getByLabelText('Contraseña')).toBeTruthy()
  })

  it('shows global dealer administration to the admin, not the dealer attention board', async () => {
    stubAdminApis()
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Administración de dealers' })).toBeTruthy()
    expect(await screen.findByText('Grupo Andino Motors')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Directorio de dealers' })).toBeTruthy()
    expect(screen.getByText('Administrador global')).toBeTruthy()
    expect(screen.queryByText('Necesitan tu atención')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nueva oportunidad' })).toBeNull()
  })

  it('opens the admin user directory with accounts and pending invitations', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/admin/dealers')) return Promise.resolve(jsonResponse({ dealers: adminDealers }))
      if (url.includes('/admin/users?')) return Promise.resolve(jsonResponse({ entries: [
        { record_type: 'user', id: 'user-1', display_name: 'Alex Rivera', email: 'alex@example.com', account_type: 'user', status: 'active', created_at: '2026-11-20T10:00:00.000Z', expires_at: null, dealers: [{ id: 'dealer-andino', name: 'Grupo Andino Motors' }] },
        { record_type: 'invitation', id: 'invite-1', display_name: 'Sam Lee', email: 'sam@example.com', account_type: 'user', status: 'pending', created_at: '2026-11-21T10:00:00.000Z', expires_at: '2026-11-24T10:00:00.000Z', dealers: [{ id: 'dealer-norte', name: 'Ruta Norte Autos' }] },
      ], total: 2, limit: 50, offset: 0 }))
      return Promise.resolve(jsonResponse({ authenticated: true, user: localAdmin }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByRole('heading', { name: 'Administración de dealers' })
    await user.click(screen.getByRole('button', { name: 'Usuarios' }))

    expect(await screen.findByRole('heading', { name: 'Usuarios y accesos' })).toBeTruthy()
    expect(await screen.findByText('Alex Rivera')).toBeTruthy()
    expect(screen.getByText('Invitación pendiente')).toBeTruthy()
    expect(String(fetchMock.mock.calls.find(([input]) => String(input).includes('/admin/users?'))?.[0])).toContain('/auth/admin/users?')
  })

  it('filters the admin dealer directory and opens a dealer account detail', async () => {
    const user = userEvent.setup()
    stubAdminApis()
    render(<App />)
    await screen.findByRole('heading', { name: 'Administración de dealers' })
    await user.click(screen.getByRole('button', { name: 'Dealers' }))
    await user.click(screen.getByRole('button', { name: 'Pendiente' }))
    expect(screen.getByText('Ruta Norte Autos')).toBeTruthy()
    expect(screen.queryByText('Grupo Andino Motors')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Ver dealer Ruta Norte Autos' }))
    expect(screen.getByRole('dialog', { name: 'Ruta Norte Autos' })).toBeTruthy()
    expect(screen.getByText(/Los miembros se cuentan después de aceptar la invitación y crear su contraseña/)).toBeTruthy()
    expect(screen.getByText('1', { selector: 'strong' })).toBeTruthy()
  })

  it('retries the live admin directory after a recoverable load error', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ authenticated: true, user: localAdmin }))
      .mockResolvedValueOnce(jsonResponse({ error: 'Servicio no disponible.' }, 503))
      .mockResolvedValueOnce(jsonResponse({ dealers: adminDealers }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByRole('heading', { name: 'Administración de dealers' })
    expect((await screen.findByRole('alert')).textContent).toContain('Servicio no disponible.')
    await user.click(screen.getByRole('button', { name: 'Dealers' }))
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Grupo Andino Motors')).toBeTruthy()
  })

  it('invites another dealer member through the admin invitation endpoint', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/admin/dealers/dealer-andino/invitations')) {
        return Promise.resolve(jsonResponse({ invitation: { email: 'miembro@example.com', url: 'http://localhost:3000/auth/invitations/accept?token=member-token', delivery: 'manual', expiresInHours: 72 } }, 201))
      }
      if (url.endsWith('/admin/dealers')) return Promise.resolve(jsonResponse({ dealers: adminDealers }))
      return Promise.resolve(jsonResponse({ authenticated: true, user: localAdmin }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByText('Grupo Andino Motors')
    await user.click(screen.getByRole('button', { name: 'Ver dealer Grupo Andino Motors' }))
    const drawer = screen.getByRole('dialog', { name: 'Grupo Andino Motors' })
    await user.type(within(drawer).getByLabelText('Nombre del miembro'), 'Ana Pérez')
    await user.type(within(drawer).getByLabelText('Correo electrónico'), 'miembro@example.com')
    await user.click(within(drawer).getByRole('button', { name: 'Enviar invitación' }))
    expect(await within(drawer).findByText('Invitación creada')).toBeTruthy()
    expect(within(drawer).getByDisplayValue(/member-token/)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('/backend/auth/admin/dealers/dealer-andino/invitations', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ displayName: 'Ana Pérez', email: 'miembro@example.com' }),
    }))
  })

  it('requires explicit confirmation before deleting a dealer and removes it from the directory', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/admin/dealers/dealer-norte') && init?.method === 'DELETE') return Promise.resolve(jsonResponse({}, 204))
      if (String(input).endsWith('/admin/dealers')) return Promise.resolve(jsonResponse({ dealers: adminDealers }))
      return Promise.resolve(jsonResponse({ authenticated: true, user: localAdmin }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByRole('button', { name: 'Ver dealer Ruta Norte Autos' })
    await user.click(screen.getByRole('button', { name: 'Ver dealer Ruta Norte Autos' }))
    const drawer = screen.getByRole('dialog', { name: 'Ruta Norte Autos' })
    await user.click(within(drawer).getByRole('button', { name: 'Eliminar dealer' }))
    const confirmation = screen.getByRole('alertdialog', { name: '¿Eliminar Ruta Norte Autos?' })
    expect(within(confirmation).getByText(/no se puede deshacer/i)).toBeTruthy()
    await user.click(within(confirmation).getByRole('button', { name: 'Cancelar' }))
    expect(fetchMock).not.toHaveBeenCalledWith('/backend/auth/admin/dealers/dealer-norte', expect.objectContaining({ method: 'DELETE' }))

    await user.click(within(drawer).getByRole('button', { name: 'Eliminar dealer' }))
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar dealer' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ruta Norte Autos' })).toBeNull())
    expect(fetchMock).toHaveBeenCalledWith('/backend/auth/admin/dealers/dealer-norte', expect.objectContaining({ method: 'DELETE', credentials: 'include' }))
    expect(screen.queryByText('Ruta Norte Autos')).toBeNull()
  })

  it('creates a dealer through the backend and shows a copyable invitation link', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/admin/dealers') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ dealer: { id: 'new-dealer', name: 'Nuevo Dealer', status: 'onboarding' }, invitation: { url: 'http://localhost:3000/auth/invitations/accept?token=sample-token', expiresInHours: 72 } }, 201))
      }
      if (String(input).endsWith('/admin/dealers')) return Promise.resolve(jsonResponse({ dealers: adminDealers }))
      return Promise.resolve(jsonResponse({ authenticated: true, user: localAdmin }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByRole('heading', { name: 'Administración de dealers' })
    await user.click(await screen.findByRole('button', { name: /Crear dealer/ }))
    const dialog = screen.getByRole('dialog', { name: 'Crear dealer' })
    await user.type(within(dialog).getByLabelText('Nombre del dealer'), 'Nuevo Dealer')
    await user.type(within(dialog).getByLabelText('Responsable principal'), 'Ana Pérez')
    await user.type(within(dialog).getByLabelText('Correo de invitación'), 'ana@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Crear e invitar' }))
    expect(await screen.findByRole('heading', { name: 'Dealer creado' })).toBeTruthy()
    expect(screen.getByDisplayValue(/auth\/invitations\/accept\?token=sample-token/)).toBeTruthy()
    expect(screen.getByText(/se comparte manualmente/)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('/backend/auth/admin/dealers', expect.objectContaining({ method: 'POST', credentials: 'include' }))
  })
})

describe('local login form', () => {
  it('submits email and password and shows authentication errors', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<LoginScreen error="Correo o contraseña incorrectos." onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@bdc-os.local')
    await user.type(screen.getByLabelText('Contraseña'), 'test-password')
    expect(screen.getByRole('alert').textContent).toContain('incorrectos')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(onSubmit).toHaveBeenCalledWith('admin@bdc-os.local', 'test-password')
  })
})
