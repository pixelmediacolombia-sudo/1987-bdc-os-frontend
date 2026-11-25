export type ContactDealer = { id: string; name: string | null }

export type ContactSummary = {
  id: string
  dealerId: string
  providerContactId: string
  displayName: string | null
  source: 'meta' | 'manual'
  phone: string | null
  email: string | null
  preferredLanguage: string
  consentState: string
  createdAt: string
  updatedAt: string
  conversationCount: number
  lastActivity: string | null
  channels: string[]
}

export type ContactMessage = {
  id: string
  direction: string
  senderType: string
  content: string
  createdAt: string
}

export type ContactConversation = {
  id: string
  channel: string
  owner: string | null
  state: string
  lastActivity: string
  messages: ContactMessage[]
}

export type ContactActivity = {
  id: string
  action: string
  actorName: string
  summary: string
  createdAt: string
}

export type ContactDetail = Omit<ContactSummary, 'conversationCount' | 'lastActivity' | 'channels'> & {
  conversations: ContactConversation[]
  activities: ContactActivity[]
}

export type ContactInput = {
  dealerId?: string
  displayName: string
  phone: string | null
  email: string | null
  preferredLanguage: string | null
}

export function contactLabel(contact: Pick<ContactSummary, 'phone' | 'email' | 'displayName'>): string {
  return contact.displayName?.trim() || contact.phone || contact.email || 'Contacto sin nombre'
}

export function contactReference(providerContactId: string): string {
  const trimmed = providerContactId.trim()
  return trimmed.length > 18 ? `${trimmed.slice(0, 8)}…${trimmed.slice(-6)}` : trimmed
}

export function contactInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'CO'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}
