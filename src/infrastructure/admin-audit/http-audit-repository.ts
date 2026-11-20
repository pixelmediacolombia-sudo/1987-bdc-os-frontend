import type { AuditEvent, AuditFilters, AuditPage, AuditRepository } from '../../domain/admin-audit/audit-event'
import { HttpClient } from '../http/http-client'

type AuditResponse = {
  events: Array<{
    id: string; actor_email: string; actor_name: string; dealer_id: string | null; dealer_name: string | null
    category: AuditEvent['category']; action: string; outcome: AuditEvent['outcome']; summary: string
    reference_id: string; created_at: string
  }>
  total: number; limit: number; offset: number
}

export class HttpAuditRepository implements AuditRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) { this.http = http }

  async list(filters: AuditFilters): Promise<AuditPage> {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries({
      dealerId: filters.dealerId, actor: filters.actor, category: filters.category === 'all' ? '' : filters.category,
      from: filters.from, to: filters.to, search: filters.search,
      limit: String(filters.limit ?? 50), offset: String(filters.offset ?? 0),
    })) if (value) query.set(key, value)
    const result = await this.http.get<AuditResponse>(`/auth/admin/audit?${query.toString()}`)
    return {
      events: result.events.map((event) => ({
        id: event.id, actorEmail: event.actor_email, actorName: event.actor_name,
        dealerId: event.dealer_id, dealerName: event.dealer_name, category: event.category,
        action: event.action, outcome: event.outcome, summary: event.summary,
        referenceId: event.reference_id, createdAt: event.created_at,
      })),
      total: result.total, limit: result.limit, offset: result.offset,
    }
  }
}
