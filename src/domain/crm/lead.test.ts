import { describe, expect, it } from 'vitest'
import { filterLeads, type Lead } from './lead'

const leads: Lead[] = [
  { id: 1, name: 'Laura Méndez', company: 'Dealer', channel: 'WhatsApp', summary: 'Financiación', time: 'ahora', status: 'Prioridad', initials: 'LM', tone: 'sand' },
  { id: 2, name: 'Andrés Rojas', company: 'Dealer', channel: 'Instagram', summary: 'SUV', time: 'ahora', status: 'Nuevo', initials: 'AR', tone: 'lilac' },
]

describe('lead domain rules', () => {
  it('filters status and search text together', () => {
    expect(filterLeads(leads, { status: 'Prioridad', query: 'whatsapp' }).map(({ id }) => id)).toEqual([1])
    expect(filterLeads(leads, { status: 'Nuevos', query: 'Laura' })).toEqual([])
  })
})
