export type LeadStatus = 'Prioridad' | 'Nuevo' | 'Seguimiento'

export type Lead = {
  id: number
  name: string
  company: string
  channel: string
  summary: string
  time: string
  status: LeadStatus
  initials: string
  tone: string
}

export type LeadFilters = {
  status: 'Todo' | 'Prioridad' | 'Nuevos'
  query: string
}

export function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
  const query = filters.query.trim().toLocaleLowerCase('es')
  return leads.filter((lead) => {
    const matchesStatus = filters.status === 'Todo'
      || (filters.status === 'Prioridad' ? lead.status === 'Prioridad' : lead.status === 'Nuevo')
    const matchesQuery = !query || `${lead.name} ${lead.channel} ${lead.summary}`.toLocaleLowerCase('es').includes(query)
    return matchesStatus && matchesQuery
  })
}
