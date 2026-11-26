import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Appointment, AppointmentStatus, AvailabilityEntry } from '../../../domain/appointment/appointment'
import type { ContactSummary, InboxAssignee } from '../../../domain/contact/contact'
import type { Opportunity } from '../../../domain/opportunity/opportunity'
import { contactLabel } from '../../../domain/contact/contact'
import { appServices } from '../../../core/container'
import Icon from '../../components/Icon'
import './calendar.css'

type Props = { search: string }
const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const hours = Array.from({ length: 12 }, (_, index) => index + 8)
const defaultAvailability: AvailabilityEntry[] = weekdays.map((_, weekday) => ({ weekday: (weekday + 1) % 7, isAvailable: weekday < 5, opensAt: weekday < 5 ? '09:00' : null, closesAt: weekday < 5 ? '18:00' : null })).sort((a, b) => a.weekday - b.weekday)

function dateKeyAt(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
function addDays(key: string, count: number) {
  const [year, month, day] = key.split('-').map(Number)
  const next = new Date(Date.UTC(year!, month! - 1, day! + count))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}
function mondayOf(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  return addDays(key, -((date.getUTCDay() + 6) % 7))
}
function zonedInstant(local: string, timeZone: string) {
  const [datePart, timePart] = local.split('T')
  const [year, month, day] = datePart!.split('-').map(Number)
  const [hour, minute] = timePart!.split(':').map(Number)
  const naive = Date.UTC(year!, month! - 1, day!, hour!, minute!)
  const candidates: number[] = []
  for (let delta = -36; delta <= 36; delta += 3) {
    const sample = naive + delta * 3_600_000
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(sample))
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
    const offset = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - sample
    const candidate = naive - offset
    if (!candidates.includes(candidate)) candidates.push(candidate)
  }
  return new Date(candidates.sort((a, b) => a - b)[0] ?? naive)
}
function formatDay(key: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-CO', { ...options, timeZone }).format(zonedInstant(`${key}T12:00`, timeZone))
}
function timeLabel(value: string, timeZone: string) { return new Intl.DateTimeFormat('es-CO', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(value)) }
function localTime(date: Date, timeZone: string) { return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date) }
function localMinute(date: Date, timeZone: string) { const [h, m] = localTime(date, timeZone).split(':').map(Number); return h! * 60 + m! }
function dayStatus(status: AppointmentStatus) { return `appointment-status-${status}` }

export default function CalendarView({ search }: Props) {
  const [dealerId, setDealerId] = useState('')
  const [timeZone, setTimeZone] = useState('America/Bogota')
  const [availability, setAvailability] = useState<AvailabilityEntry[]>(defaultAvailability)
  const [weekStart, setWeekStart] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [contacts, setContacts] = useState<ContactSummary[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [assignees, setAssignees] = useState<InboxAssignee[]>([])
  const [loading, setLoading] = useState(true)
  const [referenceLoading, setReferenceLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState(false)
  const [saving, setSaving] = useState(false)
  const [availabilityDraft, setAvailabilityDraft] = useState<AvailabilityEntry[]>(defaultAvailability)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    let active = true
    async function loadReferences() {
      setReferenceLoading(true)
      try {
        const dealers = await appServices.contacts.listDealers()
        const current = dealers[0]?.id ?? ''
        if (!active) return
        setDealerId(current)
        if (!current) { setAvailability([]); setReferenceLoading(false); setLoading(false); return }
        const [hoursResult, contactsResult, opportunitiesResult, users] = await Promise.all([
          appServices.appointments.availability(current),
          appServices.contacts.list(current, { search: '', channel: '', consentState: '', sort: 'name', limit: 100, offset: 0 }),
          appServices.opportunities.list(current),
          appServices.contacts.listConversationAssignees(current),
        ])
        if (!active) return
        setTimeZone(hoursResult.timeZone); setAvailability(hoursResult.availability); setContacts(contactsResult.contacts); setOpportunities(opportunitiesResult.filter((item) => !item.archivedAt)); setAssignees(users)
        const today = dateKeyAt(new Date(), hoursResult.timeZone)
        setSelectedDay(today); setWeekStart(mondayOf(today))
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar la agenda del dealer.') }
      finally { if (active) setReferenceLoading(false) }
    }
    void loadReferences()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!dealerId || !weekStart) return
    let active = true
    setLoading(true); setError('')
    const from = zonedInstant(`${weekStart}T00:00`, timeZone)
    const to = zonedInstant(`${addDays(weekStart, 7)}T00:00`, timeZone)
    appServices.appointments.list(dealerId, from, to).then((result) => {
      if (active) { setAppointments(result.appointments); setTimeZone(result.timeZone) }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar las citas.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [dealerId, weekStart, timeZone])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart || mondayOf(dateKeyAt(now, timeZone)), index)), [weekStart, now, timeZone])
  const visibleAppointments = useMemo(() => appointments.filter((item) => `${item.title} ${item.assignedUserName ?? ''} ${contacts.find((contact) => contact.id === item.contactId)?.displayName ?? ''}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))), [appointments, contacts, search])
  const dayAppointments = visibleAppointments.filter((item) => dateKeyAt(new Date(item.startsAt), timeZone) === selectedDay).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  const weekActive = visibleAppointments.filter((item) => item.status === 'scheduled' || item.status === 'confirmed')
  const nextAppointment = weekActive.filter((item) => Date.parse(item.startsAt) >= now.getTime()).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
  const todayKey = dateKeyAt(now, timeZone)
  const rangeLabel = weekStart ? `${formatDay(weekStart, timeZone, { day: 'numeric', month: 'short' })} – ${formatDay(addDays(weekStart, 6), timeZone, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Agenda semanal'

  async function refresh() {
    if (!dealerId || !weekStart) return
    setLoading(true); setError('')
    try {
      const from = zonedInstant(`${weekStart}T00:00`, timeZone), to = zonedInstant(`${addDays(weekStart, 7)}T00:00`, timeZone)
      const result = await appServices.appointments.list(dealerId, from, to)
      setAppointments(result.appointments); setTimeZone(result.timeZone)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar las citas.') }
    finally { setLoading(false) }
  }
  function shiftWeek(delta: number) { const next = addDays(weekStart, delta * 7); setWeekStart(next); setSelectedDay((day) => day ? addDays(day, delta * 7) : next) }
  function jumpToday() { const today = dateKeyAt(new Date(), timeZone); setSelectedDay(today); setWeekStart(mondayOf(today)) }
  function openCreate(day = selectedDay) { setSelectedDay(day || todayKey); setCreating(true) }
  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dealerId) return
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const date = String(form.get('date') ?? selectedDay)
    const startTime = String(form.get('startTime') ?? '09:00')
    const duration = Number(form.get('duration') ?? 60)
    const [hour, minute] = startTime.split(':').map(Number)
    const endMinute = hour! * 60 + minute! + duration
    if (endMinute >= 24 * 60) { setError('La cita debe terminar el mismo día.'); return }
    const endTime = `${String(Math.floor(endMinute / 60)).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}`
    const contactId = String(form.get('contactId') ?? '') || null
    const opportunityId = String(form.get('opportunityId') ?? '') || null
    if (!contactId && !opportunityId) { setError('Vincula la cita a un contacto o a una oportunidad.'); return }
    setSaving(true); setError('')
    try {
      const appointment = await appServices.appointments.create({ dealerId, title, contactId, opportunityId, assignedUserId: String(form.get('assignedUserId') ?? '') || null, startsAtLocal: `${date}T${startTime}`, endsAtLocal: `${date}T${endTime}`, location: String(form.get('location') ?? '').trim() || null, notes: String(form.get('notes') ?? '').trim() || null, reminderMinutes: String(form.get('reminderMinutes') ?? '') === '' ? null : Number(form.get('reminderMinutes')) })
      setAppointments((current) => [...current, appointment].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)))
      setSelectedDay(date); setCreating(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar la cita.') }
    finally { setSaving(false) }
  }
  async function changeStatus(appointment: Appointment, status: AppointmentStatus) {
    try {
      const updated = await appServices.appointments.update(dealerId, appointment.id, { status })
      setAppointments((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos actualizar la cita.') }
  }
  async function saveAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try { setAvailability(await appServices.appointments.saveAvailability(dealerId, availabilityDraft)); setEditingAvailability(false) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar los horarios.') }
    finally { setSaving(false) }
  }
  function toggleAvailability(weekday: number) {
    setAvailabilityDraft((current) => current.map((entry) => entry.weekday === weekday ? { ...entry, isAvailable: !entry.isAvailable, opensAt: entry.opensAt ?? '09:00', closesAt: entry.closesAt ?? '18:00' } : entry))
  }
  function changeAvailabilityTime(weekday: number, field: 'opensAt' | 'closesAt', value: string) {
    setAvailabilityDraft((current) => current.map((entry) => entry.weekday === weekday ? { ...entry, [field]: value } : entry))
  }

  return <section className="calendar-view">
    <header className="calendar-heading"><div><p className="eyebrow">AGENDA DEL DEALER · {timeZone}</p><h1>Calendario</h1><p>Programa visitas, llamadas y pruebas de manejo.</p></div><div className="calendar-heading-actions"><button className="secondary" onClick={() => { setAvailabilityDraft(availability.map((entry) => ({ ...entry }))); setEditingAvailability(true) }}><Icon name="settings" size={15} /> Disponibilidad</button><button className="primary" onClick={() => openCreate()}><Icon name="plus" size={16} /> Nueva cita</button></div></header>
    <div className="calendar-metrics"><article><span className="calendar-metric-icon"><Icon name="calendar" size={16} /></span><div><small>Esta semana</small><strong>{weekActive.length} citas activas</strong></div></article><article><span className="calendar-metric-icon"><Icon name="target" size={16} /></span><div><small>Confirmadas</small><strong>{weekActive.filter((item) => item.status === 'confirmed').length}</strong></div></article><article className="calendar-next-metric"><span className="calendar-metric-icon"><Icon name="clock" size={16} /></span><div><small>Próxima cita</small><strong>{nextAppointment ? `${formatDay(dateKeyAt(new Date(nextAppointment.startsAt), timeZone), timeZone, { weekday: 'short', day: 'numeric', month: 'short' })} · ${timeLabel(nextAppointment.startsAt, timeZone)}` : 'Sin citas próximas'}</strong></div></article></div>
    <div className="calendar-toolbar"><div className="calendar-date-nav"><button className="calendar-nav-button" aria-label="Semana anterior" onClick={() => shiftWeek(-1)}>‹</button><button className="calendar-today" onClick={jumpToday}>Hoy</button><button className="calendar-nav-button" aria-label="Semana siguiente" onClick={() => shiftWeek(1)}>›</button><h2>{rangeLabel}</h2></div><span className="calendar-timezone"><Icon name="clock" size={13} /> {timeZone}</span><button className="icon-button" aria-label="Actualizar agenda" onClick={() => void refresh()}><Icon name="calendar" size={16} /></button></div>
    {error && <div className="calendar-error" role="alert">{error}<button onClick={() => void refresh()}>Reintentar</button></div>}
    {(loading || referenceLoading) ? <div className="calendar-loading" aria-live="polite">Cargando agenda…</div> : !dealerId ? <div className="calendar-empty"><Icon name="calendar" size={22} /><strong>No hay un dealer disponible</strong><span>La agenda aparecerá cuando tengas acceso a un dealer.</span></div> : <div className="calendar-layout">
      <section className="calendar-board" aria-label="Agenda semanal">
        <div className="calendar-week-header"><span aria-hidden="true" />{days.map((day, index) => <button key={day} className={`calendar-day-heading ${selectedDay === day ? 'is-selected' : ''} ${todayKey === day ? 'is-today' : ''}`} onClick={() => setSelectedDay(day)}><small>{weekdays[index]}</small><strong>{formatDay(day, timeZone, { day: 'numeric' })}</strong></button>)}</div>
        <div className="calendar-scroll"><div className="calendar-week-grid"><div className="calendar-hour-axis">{hours.map((hour) => <span key={hour}>{String(hour).padStart(2, '0')}:00</span>)}</div>{days.map((day) => {
          const dayItems = visibleAppointments.filter((item) => dateKeyAt(new Date(item.startsAt), timeZone) === day)
          const isToday = day === todayKey
          const markerTop = ((localMinute(now, timeZone) - 8 * 60) / (12 * 60)) * 100
          return <div className={`calendar-day-track ${selectedDay === day ? 'is-selected' : ''}`} key={day} onClick={() => setSelectedDay(day)}>{hours.map((hour) => <button key={hour} aria-label={`Crear cita ${weekdays[(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7]} ${day} ${hour}:00`} className="calendar-hour-cell" style={{ top: `${((hour - 8) / 12) * 100}%` }} onClick={(event) => { event.stopPropagation(); openCreate(day); }}><span className="calendar-slot-plus">+</span></button>)}{dayItems.map((item) => {
            const start = localMinute(new Date(item.startsAt), timeZone), end = localMinute(new Date(item.endsAt), timeZone)
            const top = Math.max(0, ((start - 8 * 60) / (12 * 60)) * 100), height = Math.max(3.2, ((end - start) / (12 * 60)) * 100)
            return <button key={item.id} className={`calendar-event ${dayStatus(item.status)}`} style={{ top: `${top}%`, height: `${height}%` }} onClick={(event) => { event.stopPropagation(); setSelectedDay(day); }} title={`${timeLabel(item.startsAt, timeZone)} · ${item.title}`}><strong>{item.title}</strong><span>{timeLabel(item.startsAt, timeZone)} · {item.assignedUserName ?? 'Sin responsable'}</span></button>
          })}{isToday && markerTop >= 0 && markerTop <= 100 && <span className="calendar-now-marker" style={{ top: `${markerTop}%` }} aria-label="Hora actual" />}</div>
        })}</div></div>
      </section>
      <aside className="calendar-agenda"><header><div><p className="eyebrow">RESUMEN DEL DÍA</p><h2>{formatDay(selectedDay || todayKey, timeZone, { weekday: 'long', day: 'numeric', month: 'long' })}</h2></div><button className="icon-button" aria-label="Crear cita para este día" onClick={() => openCreate()}><Icon name="plus" size={17} /></button></header>
        {dayAppointments.length ? <ol className="calendar-agenda-list">{dayAppointments.map((item) => {
          const contact = contacts.find((entry) => entry.id === item.contactId)
          const opportunity = opportunities.find((entry) => entry.id === item.opportunityId)
          return <li key={item.id} className="calendar-agenda-item"><span className={`calendar-agenda-time ${dayStatus(item.status)}`}>{timeLabel(item.startsAt, timeZone)}</span><div className="calendar-agenda-copy"><strong>{item.title}</strong><span>{contact ? contactLabel(contact) : opportunity?.title ?? 'Cita vinculada'}</span><small>{item.assignedUserName ?? 'Sin responsable'}{item.location ? ` · ${item.location}` : ''}</small>{item.reminderMinutes !== null && <small className="calendar-reminder">Recordatorio {item.reminderMinutes ? `${item.reminderMinutes} min antes` : 'al iniciar'}</small>}<label className="calendar-status-control">Estado<select aria-label={`Estado de ${item.title}`} value={item.status} onChange={(event) => void changeStatus(item, event.target.value as AppointmentStatus)}><option value="scheduled">Programada</option><option value="confirmed">Confirmada</option><option value="cancelled">Cancelada</option><option value="completed">Atendida</option><option value="no_show">No asistió</option></select></label></div></li>
        })}</ol> : <div className="calendar-day-empty"><span className="calendar-empty-glyph"><Icon name="calendar" size={18} /></span><strong>Agenda libre</strong><p>Este día no tiene citas programadas.</p><button className="secondary" onClick={() => openCreate()}>Agendar cita</button></div>}
      </aside>
    </div>}

    {creating && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setCreating(false) }}><section className="dialog calendar-dialog" role="dialog" aria-modal="true" aria-labelledby="appointment-new-title"><header><span className="dialog-icon"><Icon name="calendar" size={16} /></span><button className="icon-button" aria-label="Cerrar" onClick={() => setCreating(false)}><Icon name="close" /></button></header><h2 id="appointment-new-title">Nueva cita</h2><p>El horario se valida con la zona y disponibilidad del dealer.</p><form onSubmit={(event) => void createAppointment(event)}><label>Nombre de la cita<input autoFocus name="title" required minLength={2} maxLength={120} placeholder="Ej. Prueba de manejo" /></label><div className="calendar-form-pair"><label>Fecha<input type="date" name="date" required defaultValue={selectedDay || todayKey} /></label><label>Hora de inicio<input type="time" name="startTime" required defaultValue="09:00" /></label></div><div className="calendar-form-pair"><label>Duración<select name="duration" defaultValue="60"><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">1 hora</option><option value="90">1 hora 30 minutos</option><option value="120">2 horas</option></select></label><label>Responsable<select name="assignedUserId" defaultValue={assignees[0]?.id ?? ''}><option value="">Sin responsable</option>{assignees.map((person) => <option value={person.id} key={person.id}>{person.displayName}</option>)}</select></label></div><label>Contacto<select name="contactId" defaultValue=""><option value="">Sin contacto</option>{contacts.map((contact) => <option value={contact.id} key={contact.id}>{contactLabel(contact)}</option>)}</select></label><label>Oportunidad vinculada<select name="opportunityId" defaultValue=""><option value="">Sin oportunidad</option>{opportunities.map((opportunity) => <option value={opportunity.id} key={opportunity.id}>{opportunity.title}</option>)}</select></label><div className="calendar-form-pair"><label>Lugar<input name="location" maxLength={160} placeholder="Sala o dirección" /></label><label>Recordatorio<select name="reminderMinutes" defaultValue="15"><option value="">Sin recordatorio</option><option value="0">Al iniciar</option><option value="15">15 minutos antes</option><option value="30">30 minutos antes</option><option value="60">1 hora antes</option></select></label></div><label>Notas<textarea name="notes" rows={2} maxLength={1000} placeholder="Indicaciones para la cita" /></label><div className="dialog-actions"><button type="button" className="secondary" onClick={() => setCreating(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cita'}</button></div></form></section></div>}
    {editingAvailability && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditingAvailability(false) }}><section className="dialog calendar-dialog availability-dialog" role="dialog" aria-modal="true" aria-labelledby="availability-title"><header><span className="dialog-icon"><Icon name="settings" size={16} /></span><button className="icon-button" aria-label="Cerrar" onClick={() => setEditingAvailability(false)}><Icon name="close" /></button></header><h2 id="availability-title">Disponibilidad semanal</h2><p>Horas locales en {timeZone}. Estos horarios controlan cuándo se aceptan citas.</p><form onSubmit={(event) => void saveAvailability(event)}>{weekdays.map((day, index) => { const weekday = (index + 1) % 7; const row = availabilityDraft.find((entry) => entry.weekday === weekday) ?? { weekday, isAvailable: false, opensAt: null, closesAt: null }; return <div className="availability-row" key={weekday}><label className="availability-day"><input type="checkbox" checked={row.isAvailable} onChange={() => toggleAvailability(weekday)} />{day}</label><input aria-label={`${day} abre`} type="time" value={row.opensAt ?? '09:00'} disabled={!row.isAvailable} onChange={(event) => changeAvailabilityTime(weekday, 'opensAt', event.target.value)} /><span>a</span><input aria-label={`${day} cierra`} type="time" value={row.closesAt ?? '18:00'} disabled={!row.isAvailable} onChange={(event) => changeAvailabilityTime(weekday, 'closesAt', event.target.value)} /></div> })}<div className="dialog-actions"><button type="button" className="secondary" onClick={() => setEditingAvailability(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar disponibilidad'}</button></div></form></section></div>}
  </section>
}
