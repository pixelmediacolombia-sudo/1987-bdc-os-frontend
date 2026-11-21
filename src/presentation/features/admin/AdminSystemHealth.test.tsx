import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SystemHealth } from '../../../application/system-health/get-system-health'

const mocks = vi.hoisted(() => ({ getSystemHealth: vi.fn() }))

vi.mock('../../../core/container', () => ({
  appServices: { systemHealth: { get: { execute: mocks.getSystemHealth } } },
}))

import { AdminSystemHealth } from './AdminSystemHealth'

const healthy: SystemHealth = {
  overall: 'healthy',
  checkedAt: '2026-11-21T14:00:00.000Z',
  services: { api: 'healthy', postgresql: 'healthy', redis: 'healthy' },
}

describe('AdminSystemHealth', () => {
  beforeEach(() => mocks.getSystemHealth.mockReset())
  afterEach(() => cleanup())

  it('shows the current status of API, PostgreSQL and Redis', async () => {
    mocks.getSystemHealth.mockResolvedValue(healthy)
    render(<AdminSystemHealth />)

    expect(await screen.findByText('Servicios disponibles')).toBeTruthy()
    expect(screen.getByText('API de BDC OS')).toBeTruthy()
    expect(screen.getByText('PostgreSQL')).toBeTruthy()
    expect(screen.getByText('Redis')).toBeTruthy()
    expect(screen.getAllByText('Disponible')).toHaveLength(3)
    expect(screen.getByText(/solo lectura/i)).toBeTruthy()
  })

  it('labels a failing dependency as degraded without hiding the other services', async () => {
    mocks.getSystemHealth.mockResolvedValue({
      ...healthy,
      overall: 'degraded',
      services: { ...healthy.services, redis: 'unavailable' },
    } satisfies SystemHealth)
    render(<AdminSystemHealth />)

    expect(await screen.findByText('Hay servicios que requieren atención')).toBeTruthy()
    expect(screen.getByText('Degradado')).toBeTruthy()
    expect(screen.getByText('No disponible')).toBeTruthy()
    expect(screen.getAllByText('Disponible')).toHaveLength(2)
  })

  it('shows a retryable error when the endpoint fails', async () => {
    mocks.getSystemHealth.mockRejectedValueOnce(new Error('Servicio no disponible.'))
      .mockResolvedValueOnce(healthy)
    render(<AdminSystemHealth />)

    expect(await screen.findByText('Servicio no disponible.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('Servicios disponibles')).toBeTruthy())
    expect(mocks.getSystemHealth).toHaveBeenCalledTimes(2)
  })
})
