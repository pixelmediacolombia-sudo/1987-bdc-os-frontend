export type DealerStatus = 'Pendiente' | 'Activo' | 'Inactivo'

export type Dealer = {
  id: string
  name: string
  users: number
  pendingInvitations: number
  status: DealerStatus
  initials: string
}

export type DealerSnapshot = {
  id: string
  name: string | null
  status: string
  userCount: number
  pendingInvitationCount: number
}

export type DealerFilters = {
  status: 'Todos' | DealerStatus
  query: string
}

export function dealerFromSnapshot(snapshot: DealerSnapshot): Dealer {
  const name = snapshot.name?.trim() || 'Dealer sin nombre'
  const backendStatus = snapshot.status.trim().toLocaleLowerCase('en')
  const status: DealerStatus = backendStatus === 'disabled' || backendStatus === 'suspended' || backendStatus === 'inactive'
    ? 'Inactivo'
    : backendStatus === 'onboarding' || backendStatus === 'invited' || (snapshot.userCount === 0 && snapshot.pendingInvitationCount > 0)
      ? 'Pendiente'
      : backendStatus === 'active'
        ? 'Activo'
        : 'Inactivo'

  return {
    id: snapshot.id,
    name,
    users: Number(snapshot.userCount),
    pendingInvitations: Number(snapshot.pendingInvitationCount),
    status,
    initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BD',
  }
}

export function filterDealers(dealers: Dealer[], filters: DealerFilters): Dealer[] {
  const query = filters.query.trim().toLocaleLowerCase('es')
  return dealers.filter((dealer) => {
    const matchesStatus = filters.status === 'Todos' || dealer.status === filters.status
    const matchesQuery = !query || `${dealer.name} ${dealer.id}`.toLocaleLowerCase('es').includes(query)
    return matchesStatus && matchesQuery
  })
}

export interface DealerRepository {
  list(): Promise<Dealer[]>
  createWithInvitation(input: CreateDealerInput): Promise<CreatedDealer>
  inviteMember(input: InviteDealerMemberInput): Promise<DealerInvitation>
  rename(dealerId: string, name: string): Promise<void>
  delete(dealerId: string): Promise<void>
}

export type CreateDealerInput = {
  dealerName: string
  ownerName: string
  ownerEmail: string
}

export type InvitationDelivery = 'sent' | 'manual' | 'failed'

export type CreatedDealer = {
  dealer: Dealer
  invitation: DealerInvitation
}

export type InviteDealerMemberInput = { dealerId: string; displayName: string; email: string }

export type DealerInvitation = {
  email: string
  url?: string
  delivery: InvitationDelivery
  expiresInHours: number
}
