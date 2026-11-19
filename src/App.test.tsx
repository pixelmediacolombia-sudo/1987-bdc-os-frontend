// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('BDC OS CRM first screen', () => {
  it('shows the demo dashboard and clearly labels local sample data', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Tu operación, en un solo lugar' })).toBeTruthy()
    expect(screen.getAllByText('Entorno de prueba').length).toBeGreaterThan(0)
    expect(screen.getByText(/Los indicadores y contactos son ficticios/)).toBeTruthy()
  })

  it('filters the work queue by priority and new contacts', async () => {
    const user = userEvent.setup()
    render(<App />)
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
    render(<App />)
    await user.type(screen.getByRole('textbox', { name: 'Buscar en el CRM' }), 'Valentina')
    expect(screen.getByText('Valentina Cruz')).toBeTruthy()
    expect(screen.queryByText('Mariana Ospina')).toBeNull()
  })

  it('creates an in-memory demo opportunity without a backend write', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Nueva oportunidad' }))
    const dialog = screen.getByRole('dialog', { name: 'Nueva oportunidad' })
    await user.type(within(dialog).getByLabelText('Nombre del contacto'), 'Andrea Gómez')
    await user.click(within(dialog).getByRole('button', { name: 'Crear en demo' }))
    expect(screen.getByText('Andrea Gómez')).toBeTruthy()
    expect(screen.queryByText(/solo vive en esta sesión/)).toBeNull()
  })

  it('opens and closes a contact detail panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Laura Méndez/ }))
    expect(screen.getByRole('dialog', { name: 'Laura Méndez' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    expect(screen.queryByRole('dialog', { name: 'Laura Méndez' })).toBeNull()
  })

  it('shows the first-delivery placeholder when selecting another module', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Oportunidades' }))
    expect(screen.getByRole('heading', { name: 'Oportunidades' })).toBeTruthy()
    expect(screen.getByText(/aún no están conectados/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver al inicio' }))
    expect(screen.getByRole('heading', { name: 'Tu operación, en un solo lugar' })).toBeTruthy()
  })
})
