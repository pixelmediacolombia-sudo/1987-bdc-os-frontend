import type { AuthRepository, AuthUser } from '../../domain/auth/auth-user'

export class SignIn {
  private readonly auth: AuthRepository

  constructor(auth: AuthRepository) { this.auth = auth }

  execute(email: string, password: string): Promise<AuthUser> {
    return this.auth.signIn(email, password)
  }
}
