import type { ContactMessage } from '../../domain/contact/contact'

export type LocalSimulatedReply = ContactMessage & {
  clientMessageId: string
  simulation: 'local'
}

function storageKey(dealerId: string, conversationId: string): string {
  return `bdc-os:local-replies:${encodeURIComponent(dealerId)}:${encodeURIComponent(conversationId)}`
}

function isLocalReply(value: unknown): value is LocalSimulatedReply {
  if (!value || typeof value !== 'object') return false
  const reply = value as Partial<LocalSimulatedReply>
  return reply.direction === 'outbound'
    && reply.senderType === 'agent'
    && typeof reply.id === 'string'
    && reply.id === reply.clientMessageId
    && reply.simulation === 'local'
    && typeof reply.content === 'string'
    && typeof reply.createdAt === 'string'
    && !Number.isNaN(Date.parse(reply.createdAt))
}

export function readLocalSimulatedReplies(dealerId: string, conversationId: string): LocalSimulatedReply[] {
  try {
    const raw = window.localStorage.getItem(storageKey(dealerId, conversationId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isLocalReply) : []
  } catch {
    return []
  }
}

export function saveLocalSimulatedReply(
  dealerId: string,
  conversationId: string,
  clientMessageId: string,
  content: string,
): LocalSimulatedReply {
  const replies = readLocalSimulatedReplies(dealerId, conversationId)
  const existing = replies.find((reply) => reply.clientMessageId === clientMessageId)
  if (existing) return existing

  const reply: LocalSimulatedReply = {
    id: clientMessageId,
    clientMessageId,
    direction: 'outbound',
    senderType: 'agent',
    content: content.trim(),
    createdAt: new Date().toISOString(),
    simulation: 'local',
  }
  window.localStorage.setItem(storageKey(dealerId, conversationId), JSON.stringify([...replies, reply]))
  return reply
}

export function newLocalReplyRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
