// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Appointment } from '../../../domain/appointment/appointment'
import type { ContactSummary } from '../../../domain/contact/contact'
import CalendarView from './CalendarView'

const contact: ContactSummary = {
  id: 'contact-crm04', dealerId: 'dealer-crm04', providerContactId: 'manual-crm04', displayName: 'Cliente CRM04', source: 'manual',
  phone: '+1 555 0140', email: null, preferredLanguage: 'es', consentState: 'unknown', createdAt: '2026-11-26T12:00:00.000Z', updatedAt: '2026-11-26T12:00:00.000Z', conversationCount: 0, lastActivity: null, channels: [],
}

function localCalendarApi() {
  let appointments: Appointment[] = []
  const availability = Array.from({ length: 7 }, (_, weekday) => ({ weekday, isAvailable: weekday > 0 && weekday < 6, opensAt: weekday > 0 && weekday < 6 ? '09:00:00' : null, closesAt: weekday > 0 && weekday < 6 ? '18:00:00' : null }))
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/auth/contacts/dealers')) return jsonResponse({ dealers: [{ id: 'dealer-crm04', name: 'Dealer CRM04' }] })
    if (url.includes('/auth/calendar/availability?') && init?.method === 'PUT') return jsonResponse({ availability: JSON.parse(String(init.body)).availability })
    if (url.includes('/auth/calendar/availability?')) return jsonResponse({ availability, timeZone: 'America/New_York' })
    if (url.includes('/auth/contacts?')) return jsonResponse({ contacts: [contact], total: 1, limit: 100, offset: 0 })
    if (url.includes('/auth/opportunities?')) return jsonResponse({ opportunities: [] })
    if (url.includes('/auth/conversations/assignees?')) return jsonResponse({ assignees: [{ id: 'user-crm04', displayName: 'Asesor CRM04' }] })
    if (url.includes('/auth/appointments?')) return jsonResponse({ appointments, timeZone: 'America/New_York' })
    if (url.endsWith('/auth/appointments') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { title: string; contactId: string; startsAtLocal: string; endsAtLocal: string; reminderMinutes: number }
      const [date, time] = body.startsAtLocal.split('T')
      const appointment: Appointment = { id: 'appointment-crm04', dealerId: 'dealer-crm04', contactId: body.contactId, opportunityId: null, assignedUserId: 'user-crm04', assignedUserName: 'Asesor CRM04', title: body.title, startsAt: `${date}T${time}:00-05:00`, endsAt: `${date}T10:00:00-05:00`, status: 'scheduled', location: null, notes: null, reminderMinutes: body.reminderMinutes, reminderAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      appointments = [...appointments, appointment]
      return jsonResponse({ appointment }, 201)
    }
    return jsonResponse({ error: `Ruta local sin mock: ${init?.method ?? 'GET'} ${url}` }, 404)
  })
  return { fetchMock }
}

const jsonResponse = (payload: unknown, status = 200) => ({ ok: status < 400, status, json: async () => payload })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Calendario CRM-04', () => {
  it('carga agenda y crea una cita local enlazada al contacto con recordatorio', async () => {
    const user = userEvent.setup()
    const api = localCalendarApi()
    vi.stubGlobal('fetch', api.fetchMock)
    render(<CalendarView search="" />)

    expect(await screen.findByText('Agenda libre')).toBeTruthy()
    expect(screen.getByText('America/New_York')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Nueva cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Nueva cita' })
    await user.type(within(dialog).getByLabelText('Nombre de la cita'), 'Prueba de manejo CRM04')
    await user.selectOptions(within(dialog).getByLabelText('Contacto'), contact.id)
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cita' }))

    expect((await screen.findAllByText('Prueba de manejo CRM04')).length).toBe(2)
    const createCall = api.fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/auth/appointments') && init?.method === 'POST')
    expect(createCall).toBeTruthy()
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({ dealerId: 'dealer-crm04', contactId: contact.id, reminderMinutes: 15 })
    await waitFor(() => expect(api.fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/appointments?'), expect.any(Object)))
  })

  it('guarda horario de disponibilidad por día del dealer', async () => {
    const user = userEvent.setup()
    const api = localCalendarApi()
    vi.stubGlobal('fetch', api.fetchMock)
    render(<CalendarView search="" />)
    await screen.findByRole('heading', { name: 'Calendario' })
    await user.click(await screen.findByRole('button', { name: 'Disponibilidad' }))
    const dialog = screen.getByRole('dialog', { name: 'Disponibilidad semanal' })
    await user.click(within(dialog).getByLabelText('Domingo'))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar disponibilidad' }))
    const saveCall = api.fetchMock.mock.calls.find(([input, init]) => String(input).includes('/auth/calendar/availability?') && init?.method === 'PUT')
    expect(saveCall).toBeTruthy()
    expect(JSON.parse(String(saveCall?.[1]?.body)).availability).toHaveLength(7)
  })
})
