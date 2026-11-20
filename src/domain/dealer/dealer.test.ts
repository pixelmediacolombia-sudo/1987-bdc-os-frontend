import { describe, expect, it } from 'vitest'
import { dealerFromSnapshot, filterDealers } from './dealer'

describe('dealer domain rules', () => {
  it('marks a dealer with a pending first invitation as onboarding', () => {
    expect(dealerFromSnapshot({ id: 'd1', name: 'Grupo Andino', status: 'active', userCount: 0, pendingInvitationCount: 1 })).toMatchObject({
      id: 'd1', status: 'En incorporación', users: 0, pendingInvitations: 1, initials: 'GA',
    })
  })

  it('uses official lifecycle states and flags unrecognized states for review', () => {
    expect(dealerFromSnapshot({ id: 'd1', name: 'Activo', status: 'active', userCount: 2, pendingInvitationCount: 0 }).status).toBe('Activo')
    expect(dealerFromSnapshot({ id: 'd2', name: 'Suspendido', status: 'disabled', userCount: 1, pendingInvitationCount: 0 }).status).toBe('Suspendido')
    expect(dealerFromSnapshot({ id: 'd3', name: 'En alta', status: 'onboarding', userCount: 1, pendingInvitationCount: 0 }).status).toBe('En incorporación')
    expect(dealerFromSnapshot({ id: 'd4', name: 'Otro estado', status: 'unknown', userCount: 0, pendingInvitationCount: 0 }).status).toBe('Revisión requerida')
  })

  it('filters dealers by status and a case-insensitive query', () => {
    const dealers = [
      dealerFromSnapshot({ id: 'd1', name: 'Grupo Andino', status: 'active', userCount: 2, pendingInvitationCount: 0 }),
      dealerFromSnapshot({ id: 'd2', name: 'Ruta Norte', status: 'suspended', userCount: 1, pendingInvitationCount: 0 }),
    ]
    expect(filterDealers(dealers, { status: 'Suspendido', query: 'd2' }).map(({ id }) => id)).toEqual(['d2'])
    expect(filterDealers(dealers, { status: 'Activo', query: 'norte' })).toEqual([])
  })
})
