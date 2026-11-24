import { describe, expect, it } from 'vitest'
import { contactInitials, contactLabel, contactReference } from './contact'

describe('contact presentation helpers', () => {
  it('uses available contact details without inventing a person name', () => {
    expect(contactLabel({ phone: '+1 555 0100', email: null })).toBe('+1 555 0100')
    expect(contactLabel({ phone: null, email: 'buyer@example.test' })).toBe('buyer@example.test')
    expect(contactLabel({ phone: null, email: null })).toBe('Contacto sin nombre')
  })

  it('keeps long provider ids readable while preserving a recognizable reference', () => {
    expect(contactReference('123456789012345678901234')).toBe('12345678…901234')
    expect(contactInitials('María del Mar')).toBe('MD')
    expect(contactInitials('')).toBe('CO')
  })
})
