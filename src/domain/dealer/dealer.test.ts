import { describe, expect, it } from 'vitest'
import { dealerFromSnapshot, filterDealers } from './dealer'

describe('dealer domain rules', () => {
  it('marks a dealer with an unaccepted first invitation as pending without counting the invitee as a member', () => {
    expect(dealerFromSnapshot({ id: 'd1', name: 'Grupo Andino', status: 'active', userCount: 0, pendingInvitationCount: 1 })).toMatchObject({
      id: 'd1', status: 'Pendiente', users: 0, pendingInvitations: 1, initials: 'GA',
    })
  })

  it('maps backend lifecycle states to pending, active, and inactive', () => {
    expect(dealerFromSnapshot({ id: 'd1', name: 'Activo', status: 'active', userCount: 2, pendingInvitationCount: 0 }).status).toBe('Activo')
    expect(dealerFromSnapshot({ id: 'd2', name: 'Inactivo', status: 'disabled', userCount: 1, pendingInvitationCount: 0 }).status).toBe('Inactivo')
    expect(dealerFromSnapshot({ id: 'd3', name: 'En alta', status: 'onboarding', userCount: 0, pendingInvitationCount: 0 }).status).toBe('Pendiente')
    expect(dealerFromSnapshot({ id: 'd4', name: 'Ya aceptó', status: 'active', userCount: 1, pendingInvitationCount: 0 }).status).toBe('Activo')
    expect(dealerFromSnapshot({ id: 'd5', name: 'Otro estado', status: 'unknown', userCount: 0, pendingInvitationCount: 0 }).status).toBe('Inactivo')
  })

  it('keeps the directory usable when a legacy dealer has no name', () => {
    expect(dealerFromSnapshot({ id: 'legacy-1', name: null, status: 'active', userCount: 0, pendingInvitationCount: 0 })).toMatchObject({
      name: 'Dealer sin nombre', initials: 'DS', status: 'Activo',
    })
  })

  it('filters dealers by status and a case-insensitive query', () => {
    const dealers = [
      dealerFromSnapshot({ id: 'd1', name: 'Grupo Andino', status: 'active', userCount: 2, pendingInvitationCount: 0 }),
      dealerFromSnapshot({ id: 'd2', name: 'Ruta Norte', status: 'suspended', userCount: 1, pendingInvitationCount: 0 }),
    ]
    expect(filterDealers(dealers, { status: 'Inactivo', query: 'd2' }).map(({ id }) => id)).toEqual(['d2'])
    expect(filterDealers(dealers, { status: 'Activo', query: 'norte' })).toEqual([])
  })
})
