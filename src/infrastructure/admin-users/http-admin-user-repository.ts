import type { AdminUserEntry, AdminUserFilters, AdminUserPage, AdminUserRepository } from '../../domain/admin-users/admin-user'
import { HttpClient } from '../http/http-client'

type AdminUserResponse = {
  entries: Array<{
    record_type: AdminUserEntry['kind']
    id: string
    display_name: string
    email: string
    account_type: AdminUserEntry['accountType']
    status: AdminUserEntry['status']
    created_at: string
    expires_at: string | null
    dealers: Array<{ id: string; name: string | null }>
  }>
  total: number
  limit: number
  offset: number
}

export class HttpAdminUserRepository implements AdminUserRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) { this.http = http }

  async list(filters: AdminUserFilters): Promise<AdminUserPage> {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries({
      search: filters.search,
      dealerId: filters.dealerId,
      status: filters.status === 'all' ? '' : filters.status,
      accountType: filters.accountType === 'all' ? '' : filters.accountType,
      limit: String(filters.limit ?? 50),
      offset: String(filters.offset ?? 0),
    })) if (value) query.set(key, value)
    const result = await this.http.get<AdminUserResponse>(`/auth/admin/users?${query.toString()}`)
    return {
      entries: result.entries.map((entry) => ({
        id: entry.id,
        kind: entry.record_type,
        displayName: entry.display_name,
        email: entry.email,
        accountType: entry.account_type,
        status: entry.status,
        createdAt: entry.created_at,
        expiresAt: entry.expires_at,
        dealers: entry.dealers,
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    }
  }
}
