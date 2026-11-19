export type DealerStatus = 'Activo' | 'En incorporación' | 'Suspendido'

export type Dealer = {
  id: string
  name: string
  location: string
  users: number
  status: DealerStatus
  updated: string
  initials: string
}

export type DealerSnapshot = {
  id: string
  name: string
  status: string
  userCount: number
  pendingInvitationCount: number
}

export type DealerFilters = {
  status: 'Todos' | DealerStatus
  query: string
}

export function dealerFromSnapshot(snapshot: DealerSnapshot): Dealer {
  const status: DealerStatus = snapshot.status === 'disabled' || snapshot.status === 'suspended'
    ? 'Suspendido'
    : snapshot.userCount === 0 && snapshot.pendingInvitationCount > 0
      ? 'En incorporación'
      : 'Activo'

  return {
    id: snapshot.id,
    name: snapshot.name,
    location: 'Cuenta BDC OS',
    users: Number(snapshot.userCount),
    status,
    updated: snapshot.pendingInvitationCount > 0 ? 'Invitación pendiente' : 'Cuenta registrada',
    initials: snapshot.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BD',
  }
}

export function filterDealers(dealers: Dealer[], filters: DealerFilters): Dealer[] {
  const query = filters.query.trim().toLocaleLowerCase('es')
  return dealers.filter((dealer) => {
    const matchesStatus = filters.status === 'Todos' || dealer.status === filters.status
    const matchesQuery = !query || `${dealer.name} ${dealer.location}`.toLocaleLowerCase('es').includes(query)
    return matchesStatus && matchesQuery
  })
}

export interface DealerRepository {
  list(): Promise<Dealer[]>
  createWithInvitation(input: CreateDealerInput): Promise<CreatedDealer>
}

export type CreateDealerInput = {
  dealerName: string
  ownerName: string
  ownerEmail: string
}

export type InvitationDelivery = 'sent' | 'manual' | 'failed'

export type CreatedDealer = {
  dealer: Dealer
  invitation: {
    email: string
    url?: string
    delivery: InvitationDelivery
    expiresInHours: number
  }
}
