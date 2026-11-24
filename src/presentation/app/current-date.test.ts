import { describe, expect, it } from 'vitest'
import { formatCurrentDate } from './current-date'

describe('formatCurrentDate', () => {
  it('formats the current dashboard date in Spanish for Colombia', () => {
    expect(formatCurrentDate(new Date('2026-11-24T17:00:00.000Z'))).toBe('MARTES, 24 DE NOVIEMBRE')
  })

  it('uses the Colombia calendar day across UTC midnight', () => {
    expect(formatCurrentDate(new Date('2026-11-25T02:30:00.000Z'))).toBe('MARTES, 24 DE NOVIEMBRE')
  })
})
