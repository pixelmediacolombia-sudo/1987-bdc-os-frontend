export type AuditCategory = 'dealers' | 'users' | 'invitations' | 'settings' | 'security'

export type AuditEvent = {
  id: string
  actorEmail: string
  actorName: string
  dealerId: string | null
  dealerName: string | null
  category: AuditCategory
  action: string
  outcome: 'success' | 'failure'
  summary: string
  referenceId: string
  createdAt: string
}

export type AuditFilters = {
  dealerId: string
  actor: string
  category: AuditCategory | 'all'
  from: string
  to: string
  search: string
  limit?: number
  offset?: number
}

export type AuditPage = { events: AuditEvent[]; total: number; limit: number; offset: number }

export interface AuditRepository {
  list(filters: AuditFilters): Promise<AuditPage>
}
