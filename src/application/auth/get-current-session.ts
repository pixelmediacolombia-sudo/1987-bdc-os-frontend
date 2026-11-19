import type { AuthRepository } from '../../domain/auth/auth-user'

export class GetCurrentSession {
  private readonly auth: AuthRepository

  constructor(auth: AuthRepository) { this.auth = auth }

  execute() {
    return this.auth.getCurrentSession()
  }
}
