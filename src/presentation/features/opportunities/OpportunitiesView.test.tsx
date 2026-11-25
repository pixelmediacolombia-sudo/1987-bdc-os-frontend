// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Opportunity, OpportunityActivity } from '../../../domain/opportunity/opportunity'
import HomeDashboard from '../home/HomeDashboard'
import OpportunitiesView from './OpportunitiesView'

const dealer = { id: 'dealer-fe04', name: 'Dealer FE04 local' }
const assignee = { id: 'user-fe04', displayName: 'Asesor FE04 local' }

function localOpportunityApi() {
  let opportunities: Opportunity[] = []
  const history = new Map<string, OpportunityActivity[]>()
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/auth/contacts/dealers')) return jsonResponse({ dealers: [dealer] })
    if (url.includes('/auth/conversations/assignees?')) return jsonResponse({ assignees: [assignee] })
    if (url.includes('/auth/opportunities/') && url.includes('/activity?')) {
      const id = url.split('/auth/opportunities/')[1]?.split('/activity?')[0]
      return jsonResponse({ activity: history.get(id ?? '') ?? [] })
    }
    if (url.includes('/auth/opportunities?')) return jsonResponse({ opportunities: opportunities.filter((item) => item.dealerId === dealer.id) })
    if (url.endsWith('/auth/opportunities') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { title: string; contactName: string; contactPhone: string | null; amountCents: number; notes: string | null }
      const now = new Date().toISOString()
      const created: Opportunity = { id: 'opportunity-fe04', dealerId: dealer.id, title: body.title, contactId: null, contactName: body.contactName, contactPhone: body.contactPhone, amountCents: String(body.amountCents), stage: 'new', assignedUserId: null, assignedUserName: null, expectedCloseDate: null, notes: body.notes, createdAt: now, updatedAt: now }
      opportunities = [created, ...opportunities]
      history.set(created.id, [{ id: 'created-fe04', action: 'opportunity.created', summary: `Se creó la oportunidad ${created.title}.`, actorName: assignee.displayName, createdAt: now }])
      return jsonResponse({ opportunity: created }, 201)
    }
    const updateMatch = url.match(/\/auth\/opportunities\/([^?]+)/)
    if (updateMatch && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as { stage?: Opportunity['stage']; assignedUserId?: string | null }
      const id = decodeURIComponent(updateMatch[1]!)
      let updated: Opportunity | undefined
      opportunities = opportunities.map((item) => {
        if (item.id !== id || item.dealerId !== dealer.id) return item
        updated = { ...item, ...body, assignedUserName: body.assignedUserId ? assignee.displayName : item.assignedUserName, updatedAt: new Date().toISOString() }
        const action = body.stage ? 'opportunity.stage_changed' : 'opportunity.assigned'
        history.set(id, [...(history.get(id) ?? []), { id: `${action}-${history.get(id)?.length ?? 0}`, action, summary: body.stage ? `La oportunidad ${item.title} cambió a ${body.stage}.` : `Se actualizó la asignación de ${item.title}.`, actorName: assignee.displayName, createdAt: updated.updatedAt }])
        return updated
      })
      return updated ? jsonResponse({ opportunity: updated }) : jsonResponse({ error: 'No encontramos esa oportunidad.' }, 404)
    }
    return jsonResponse({ error: `Ruta local sin mock: ${init?.method ?? 'GET'} ${url}` }, 404)
  })
  return { fetchMock, opportunities: () => opportunities }
}

const jsonResponse = (payload: unknown, status = 200) => ({ ok: status < 400, status, json: async () => payload })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('flujo FE-04 de oportunidades con datos persistidos', () => {
  it('crea, mueve, reasigna, consulta historial y conserva el estado al recargar la vista', async () => {
    const user = userEvent.setup()
    const api = localOpportunityApi()
    vi.stubGlobal('fetch', api.fetchMock)
    const view = render(<OpportunitiesView search="" />)

    await screen.findByRole('heading', { name: 'Oportunidades' })
    await user.click(screen.getByRole('button', { name: 'Nueva oportunidad' }))
    const dialog = screen.getByRole('dialog', { name: 'Nueva oportunidad' })
    await user.type(within(dialog).getByLabelText('Nombre de la oportunidad'), 'DEMO LOCAL SUV FE04')
    await user.type(within(dialog).getByLabelText('Contacto'), 'DEMO LOCAL Cliente FE04')
    await user.type(within(dialog).getByLabelText('Teléfono'), '+1 555 0104')
    await user.clear(within(dialog).getByLabelText('Valor estimado (COP)'))
    await user.type(within(dialog).getByLabelText('Valor estimado (COP)'), '25000000')
    await user.type(within(dialog).getByLabelText('Notas'), 'Seguimiento local del flujo FE04')
    await user.click(within(dialog).getByRole('button', { name: 'Crear oportunidad' }))

    let card = await screen.findByText('DEMO LOCAL SUV FE04').then((title) => title.closest('.opportunity-card') as HTMLElement)
    await user.selectOptions(within(card).getByLabelText('Etapa de DEMO LOCAL SUV FE04'), 'working')
    await waitFor(() => expect(api.opportunities()[0]?.stage).toBe('working'))
    card = await screen.findByText('DEMO LOCAL SUV FE04').then((title) => title.closest('.opportunity-card') as HTMLElement)
    await user.selectOptions(within(card).getByLabelText('Responsable de DEMO LOCAL SUV FE04'), assignee.id)
    await waitFor(() => expect(api.opportunities()[0]?.assignedUserId).toBe(assignee.id))
    await user.click(within(card).getByRole('button', { name: 'Historial' }))
    expect(await within(card).findByText(/cambió a working/)).toBeTruthy()
    expect(within(card).getByText(/actualizó la asignación/)).toBeTruthy()
    expect(api.fetchMock).toHaveBeenCalledWith('/backend/auth/opportunities', expect.objectContaining({ method: 'POST', body: expect.stringContaining('2500000000') }))

    view.unmount()
    render(<OpportunitiesView search="" />)
    const restoredCard = await screen.findByText('DEMO LOCAL SUV FE04').then((title) => title.closest('.opportunity-card') as HTMLElement)
    expect(within(restoredCard).getByLabelText('Etapa de DEMO LOCAL SUV FE04')).toHaveProperty('value', 'working')
    expect(within(restoredCard).getByLabelText('Responsable de DEMO LOCAL SUV FE04')).toHaveProperty('value', assignee.id)
    await user.click(within(restoredCard).getByRole('button', { name: 'Historial' }))
    expect(await within(restoredCard).findByText(/cambió a working/)).toBeTruthy()
    expect(api.opportunities()).toHaveLength(1)
  })

  it('refleja en Inicio métricas y actividad que devuelve el dealer autenticado', async () => {
    const dashboardApi = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/contacts/dealers')) return jsonResponse({ dealers: [dealer] })
      if (url.includes('/auth/dashboard?')) return jsonResponse({ metrics: { unreadConversations: 2, newContacts: 1, activeOpportunities: 1, pipelineValueCents: '2500000000' }, attention: [], activities: [{ id: 'activity-fe04', category: 'opportunities', action: 'opportunity.stage_changed', summary: 'La oportunidad DEMO LOCAL SUV FE04 cambió a working.', createdAt: new Date().toISOString() }] })
      return jsonResponse({ error: 'Ruta local sin mock' }, 404)
    })
    vi.stubGlobal('fetch', dashboardApi)
    render(<HomeDashboard search="" onNavigate={() => undefined} />)
    expect(await screen.findByText('Oportunidades activas')).toBeTruthy()
    expect(screen.getByText(/25\.000\.000/)).toBeTruthy()
    expect(await screen.findByText('La oportunidad DEMO LOCAL SUV FE04 cambió a working.')).toBeTruthy()
    expect(dashboardApi).toHaveBeenCalledWith('/backend/auth/dashboard?dealerId=dealer-fe04', expect.any(Object))
  })
})
