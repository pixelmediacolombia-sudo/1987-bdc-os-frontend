// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import LoginScreen from './LoginScreen'

const localUser = { id: 'local-admin', email: 'admin@bdc-os.local', displayName: 'Admin BDC OS local', accountType: 'admin' as const }
const jsonResponse = (payload: unknown, status = 200) => ({ ok: status < 400, status, json: async () => payload })

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
    expect(screen.getByText('Admin BDC OS local')).toBeTruthy()
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
    expect(await screen.findByRole('heading', { name: 'Tu operación comercial empieza aquí' })).toBeTruthy()
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy()
    expect(screen.getByLabelText('Contraseña')).toBeTruthy()
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
