// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { newLocalReplyRequestId, readLocalSimulatedReplies, saveLocalSimulatedReply } from './local-reply-simulator'

afterEach(() => window.localStorage.clear())

describe('local reply simulator', () => {
  it('stores synthetic replies by dealer and conversation and returns them after reload', () => {
    const reply = saveLocalSimulatedReply('dealer-a', 'conversation-a', 'message-1', '  Hola, Ana.  ')

    expect(reply.content).toBe('Hola, Ana.')
    expect(reply.simulation).toBe('local')
    expect(readLocalSimulatedReplies('dealer-a', 'conversation-a')).toEqual([reply])
    expect(readLocalSimulatedReplies('dealer-b', 'conversation-a')).toEqual([])
    expect(readLocalSimulatedReplies('dealer-a', 'conversation-b')).toEqual([])
  })

  it('is idempotent for a retried local request identifier', () => {
    const first = saveLocalSimulatedReply('dealer-a', 'conversation-a', 'same-request', 'Respuesta local')
    const retried = saveLocalSimulatedReply('dealer-a', 'conversation-a', 'same-request', 'Respuesta duplicada')

    expect(retried).toEqual(first)
    expect(readLocalSimulatedReplies('dealer-a', 'conversation-a')).toHaveLength(1)
  })

  it('creates unique request identifiers', () => {
    expect(newLocalReplyRequestId()).not.toBe(newLocalReplyRequestId())
  })
})
