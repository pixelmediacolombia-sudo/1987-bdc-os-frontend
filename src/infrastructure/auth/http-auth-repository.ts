import type { AuthRepository, AuthUser } from '../../domain/auth/auth-user'
import { HttpClient, HttpError } from '../http/http-client'

type SessionResponse = { authenticated: boolean; user?: AuthUser }
type LoginResponse = { user?: AuthUser }

export class HttpAuthRepository implements AuthRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) { this.http = http }

  async getCurrentSession(): Promise<AuthUser | null> {
    try {
      const result = await this.http.get<SessionResponse>('/auth/session')
      return result.authenticated && result.user ? result.user : null
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) return null
      throw error
    }
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const result = await this.http.post<LoginResponse>('/auth/login', { email, password })
    if (!result.user) throw new Error('No pudimos iniciar sesión.')
    return result.user
  }

  async signOut(): Promise<void> {
    await this.http.post('/auth/logout').catch(() => undefined)
  }
}
