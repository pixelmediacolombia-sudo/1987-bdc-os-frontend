import type { AdminUserFilters, AdminUserRepository } from '../../domain/admin-users/admin-user'

export class ListAdminUsers {
  private readonly users: AdminUserRepository

  constructor(users: AdminUserRepository) { this.users = users }

  execute(filters: AdminUserFilters) {
    return this.users.list(filters)
  }
}
