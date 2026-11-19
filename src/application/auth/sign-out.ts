import type { AuthRepository } from '../../domain/auth/auth-user'

export class SignOut {
  private readonly auth: AuthRepository

  constructor(auth: AuthRepository) { this.auth = auth }

  execute(): Promise<void> {
    return this.auth.signOut()
  }
}
