export type AccountType = 'admin' | 'user'

export type AuthUser = {
  id: string
  email: string
  displayName: string
  accountType: AccountType
}

export interface AuthRepository {
  getCurrentSession(): Promise<AuthUser | null>
  signIn(email: string, password: string): Promise<AuthUser>
  signOut(): Promise<void>
}
