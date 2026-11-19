// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
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
    expect(screen.getByRole('heading', { name: 'Directorio de dealers' })).toBeTruthy()
    expect(await screen.findByText('Grupo Andino Motors')).toBeTruthy()
    expect(screen.getByText('Administrador global')).toBeTruthy()
    expect(screen.queryByText('Necesitan tu atención')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nueva oportunidad' })).toBeNull()
  })

  it('filters the admin dealer directory and opens a dealer account detail', async () => {
    const user = userEvent.setup()
    stubAdminApis()
    render(<App />)
    await screen.findByRole('heading', { name: 'Administración de dealers' })
    await user.click(screen.getByRole('button', { name: 'Dealers' }))
    await user.click(screen.getByRole('button', { name: 'En incorporación' }))
    expect(screen.getByText('Ruta Norte Autos')).toBeTruthy()
    expect(screen.queryByText('Grupo Andino Motors')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Ver dealer Ruta Norte Autos' }))
    expect(screen.getByRole('dialog', { name: 'Ruta Norte Autos' })).toBeTruthy()
    expect(screen.getByText(/se habilitará al conectar los endpoints/)).toBeTruthy()
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
