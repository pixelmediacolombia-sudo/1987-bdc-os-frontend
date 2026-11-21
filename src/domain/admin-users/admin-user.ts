export type AdminUserEntryKind = 'user' | 'invitation'
export type AdminUserStatus = 'active' | 'disabled' | 'invited' | 'pending' | 'expired'
export type AdminAccountType = 'admin' | 'user'

export type AdminUserDealer = { id: string; name: string | null }

export type AdminUserEntry = {
  id: string
  kind: AdminUserEntryKind
  displayName: string
  email: string
  accountType: AdminAccountType
  status: AdminUserStatus
  createdAt: string
  expiresAt: string | null
  dealers: AdminUserDealer[]
}

export type AdminUserFilters = {
  search: string
  dealerId: string
  status: AdminUserStatus | 'all'
  accountType: AdminAccountType | 'all'
  limit?: number
  offset?: number
}

export type AdminUserPage = { entries: AdminUserEntry[]; total: number; limit: number; offset: number }

export interface AdminUserRepository {
  list(filters: AdminUserFilters): Promise<AdminUserPage>
}
