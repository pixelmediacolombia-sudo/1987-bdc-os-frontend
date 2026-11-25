import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ContactDealer, ContactDetail, ContactInput, ContactSummary } from '../../../domain/contact/contact'
import { contactInitials, contactLabel, contactReference } from '../../../domain/contact/contact'
import { appServices } from '../../../core/container'
import Icon from '../../components/Icon'

const channelNames: Record<string, string> = { messenger: 'Messenger', facebook: 'Messenger', fb: 'Messenger', instagram: 'Instagram', ig: 'Instagram', whatsapp: 'WhatsApp' }
const PAGE_SIZE = 25

export default function ContactsView({ search }: { search: string }) {
  const [dealers, setDealers] = useState<ContactDealer[]>([])
  const [dealerId, setDealerId] = useState('')
  const [contacts, setContacts] = useState<ContactSummary[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [channel, setChannel] = useState('')
  const [consentState, setConsentState] = useState('')
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const [selected, setSelected] = useState<ContactDetail | null>(null)
  const [editing, setEditing] = useState<ContactDetail | null>(null)
  const [creating, setCreating] = useState(false)
  const [loadingDealers, setLoadingDealers] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  const selectedDealer = dealers.find((dealer) => dealer.id === dealerId)

  useEffect(() => {
    let active = true
    appServices.contacts.listDealers().then((items) => {
      if (!active) return
      setDealers(items)
      setDealerId((current) => current && items.some((item) => item.id === current) ? current : items.length === 1 ? items[0].id : '')
      setError('')
    }).catch(() => { if (active) setError('No pudimos cargar los dealers asociados.') })
      .finally(() => { if (active) setLoadingDealers(false) })
    return () => { active = false }
  }, [retry])

  useEffect(() => {
    if (!dealerId) return
    let active = true
    const timer = window.setTimeout(() => {
      setLoadingContacts(true)
      setError('')
      appServices.contacts.list(dealerId, { search, channel, consentState, sort, limit: PAGE_SIZE, offset }).then((result) => {
        if (!active) return
        setContacts(result.contacts)
        setTotal(result.total)
      }).catch(() => { if (active) setError('No pudimos cargar los contactos. Intenta de nuevo.') })
        .finally(() => { if (active) setLoadingContacts(false) })
    }, search ? 180 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [dealerId, search, channel, consentState, sort, offset, retry])

  async function openContact(contact: ContactSummary) {
    setSelected(null)
    setLoadingDetail(true)
    setError('')
    try { setSelected(await appServices.contacts.get(contact.dealerId, contact.id)) }
    catch { setError('No pudimos cargar el detalle del contacto.') }
    finally { setLoadingDetail(false) }
  }

  async function saveContact(input: ContactInput) {
    if (!dealerId) return
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await appServices.contacts.update(dealerId, editing.id, {
          displayName: input.displayName, phone: input.phone, email: input.email, preferredLanguage: input.preferredLanguage,
        })
        setSelected(await appServices.contacts.get(dealerId, editing.id))
        setEditing(null)
        setNotice('Cambios guardados en la ficha del contacto.')
      } else {
        const created = await appServices.contacts.create({ ...input, dealerId })
        setCreating(false)
        setOffset(0)
        const detail = await appServices.contacts.get(dealerId, created.id)
        setSelected(detail)
        setNotice('Contacto creado. Se guardó como registro manual, sin conexión a Meta.')
      }
      setRetry((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar los datos del contacto.')
    } finally { setSaving(false) }
  }

  const from = total ? offset + 1 : 0
  const to = Math.min(offset + PAGE_SIZE, total)

  return <main className="content contacts-view">
    <header className="page-heading">
      <div><p className="eyebrow">ESPACIO DEL DEALER</p><h1>Contactos</h1><p className="subtitle">Administra los datos y revisa el historial de cada persona.</p></div>
      <div className="contacts-heading-actions">
        {dealers.length > 1 && <label className="contacts-dealer-select">Dealer<select aria-label="Dealer" value={dealerId} onChange={(event) => { setDealerId(event.target.value); setOffset(0); setSelected(null); setEditing(null) }}><option value="">Selecciona un dealer</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name || 'Dealer sin nombre'}</option>)}</select></label>}
        {dealerId && <button className="primary" onClick={() => { setError(''); setCreating(true) }}><Icon name="plus" size={15} /> Nuevo contacto</button>}
      </div>
    </header>

    {error && <div className="contacts-alert" role="alert"><span>{error}</span><button className="secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div>}
    {notice && <div className="contacts-success" role="status"><span>{notice}</span><button className="icon-button" aria-label="Cerrar aviso" onClick={() => setNotice('')}><Icon name="close" size={14} /></button></div>}
    {loadingDealers && <section className="panel contacts-state" aria-live="polite"><span className="loading-indicator" /><strong>Cargando el espacio de trabajo…</strong></section>}
    {!loadingDealers && !dealers.length && !error && <section className="panel contacts-state"><span className="contacts-state-icon"><Icon name="users" size={18} /></span><strong>No hay un dealer asociado</strong><p>Tu cuenta necesita una membresía activa para consultar contactos.</p></section>}
    {!loadingDealers && dealers.length > 1 && !dealerId && <section className="panel contacts-state"><span className="contacts-state-icon"><Icon name="users" size={18} /></span><strong>Selecciona un dealer</strong><p>Los contactos se consultan por separado para proteger los datos de cada empresa.</p></section>}

    {!loadingDealers && dealerId && <section className="panel contacts-panel" aria-labelledby="contacts-table-title">
      <div className="contacts-panel-heading"><div><div className="title-count"><h2 id="contacts-table-title">Directorio de contactos</h2><b>{selectedDealer?.name || 'Dealer sin nombre'}</b></div><p>Busca por nombre, teléfono, correo o referencia de Meta.</p></div><span className="contacts-count" aria-live="polite">{loadingContacts ? 'Cargando…' : `${total} ${total === 1 ? 'contacto' : 'contactos'}`}</span></div>
      <div className="contacts-toolbar">
        <label>Canal<select aria-label="Filtrar por canal" value={channel} onChange={(event) => { setChannel(event.target.value); setOffset(0) }}><option value="">Todos los canales</option><option value="messenger">Messenger</option><option value="instagram">Instagram</option><option value="whatsapp">WhatsApp</option></select></label>
        <label>Consentimiento<select aria-label="Filtrar por consentimiento" value={consentState} onChange={(event) => { setConsentState(event.target.value); setOffset(0) }}><option value="">Todos los estados</option><option value="granted">Otorgado</option><option value="denied">No otorgado</option><option value="unknown">Sin confirmar</option></select></label>
        <label>Ordenar por<select aria-label="Ordenar contactos" value={sort} onChange={(event) => { setSort(event.target.value as 'recent' | 'name'); setOffset(0) }}><option value="recent">Actividad reciente</option><option value="name">Nombre</option></select></label>
      </div>
      {loadingContacts ? <div className="contacts-state" aria-live="polite"><span className="loading-indicator" /><strong>Cargando contactos…</strong></div> : contacts.length ? <>
        <div className="contacts-table-wrap"><table className="contacts-table"><thead><tr><th>Contacto</th><th>Origen y canal</th><th>Consentimiento</th><th>Conversaciones</th><th>Última actividad</th><th><span className="visually-hidden">Abrir ficha</span></th></tr></thead><tbody>{contacts.map((contact) => {
          const label = contactLabel(contact)
          return <tr key={contact.id}><td><button className="contact-primary" onClick={() => void openContact(contact)}><span className="contact-avatar">{contactInitials(label)}</span><span><strong>{label}</strong><small>{contact.phone || contact.email || `ID · ${contactReference(contact.providerContactId)}`}</small></span></button></td><td><span className={`contact-source ${contact.source}`}>{contact.source === 'manual' ? 'Manual' : 'Meta'}</span>{contact.channels.length ? <span className="contact-channels">{contact.channels.map((item) => <span key={item}>{channelNames[item.toLowerCase()] || item}</span>)}</span> : <span className="muted-value">Sin canal</span>}</td><td>{consentLabel(contact.consentState)}</td><td>{contact.conversationCount}</td><td>{formatDate(contact.lastActivity)}</td><td><button className="icon-button" aria-label={`Abrir ficha de ${label}`} onClick={() => void openContact(contact)}><Icon name="arrow" size={15} /></button></td></tr>
        })}</tbody></table></div>
        <footer className="contacts-pagination"><span>Mostrando {from}–{to} de {total}</span><div><button className="secondary" disabled={offset === 0 || loadingContacts} onClick={() => setOffset(Math.max(offset - PAGE_SIZE, 0))}>Anterior</button><button className="secondary" disabled={offset + PAGE_SIZE >= total || loadingContacts} onClick={() => setOffset(offset + PAGE_SIZE)}>Siguiente</button></div></footer>
      </> : <div className="contacts-state"><span className="contacts-state-icon"><Icon name="search" size={18} /></span><strong>{search.trim() || channel || consentState ? 'No encontramos contactos' : 'Aún no hay contactos'}</strong><p>{search.trim() || channel || consentState ? 'Prueba con otros filtros o crea un registro manual.' : 'Cuando llegue una conversación por Meta, aparecerá aquí. También puedes crear un registro manual.'}</p><button className="secondary" onClick={() => { setChannel(''); setConsentState(''); setOffset(0); if (!search.trim()) setCreating(true) }}>Nuevo contacto</button></div>}
    </section>}

    {loadingDetail && <div className="overlay" role="status" aria-live="polite"><section className="contacts-detail-loading"><span className="loading-indicator" /><strong>Cargando ficha de contacto…</strong></section></div>}
    {selected && <div className="overlay drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><aside className="drawer contact-drawer" role="dialog" aria-modal="true" aria-labelledby="contact-detail-title">
      <div className="drawer-top"><span className="eyebrow">FICHA 360</span><div><button className="secondary contact-edit-button" onClick={() => { setError(''); setEditing(selected) }}>Editar</button><button className="icon-button" aria-label="Cerrar ficha" onClick={() => setSelected(null)}><Icon name="close" /></button></div></div>
      <span className="drawer-avatar neutral">{contactInitials(contactLabel(selected))}</span><h2 id="contact-detail-title">{contactLabel(selected)}</h2><p>{selected.source === 'manual' ? 'Registro manual · Sin conexión a Meta' : `Contacto de Meta · ${contactReference(selected.providerContactId)}`}</p>
      <div className="contact-details-grid"><div><small>Teléfono</small><strong>{selected.phone || 'No disponible'}</strong></div><div><small>Correo</small><strong>{selected.email || 'No disponible'}</strong></div><div><small>Idioma</small><strong>{selected.preferredLanguage || 'No definido'}</strong></div><div><small>Consentimiento</small><strong>{consentLabel(selected.consentState)}</strong></div><div><small>Origen</small><strong>{selected.source === 'manual' ? 'Manual' : 'Meta'}</strong></div><div><small>Canales</small><strong>{selected.conversations.length ? [...new Set(selected.conversations.map((item) => channelNames[item.channel.toLowerCase()] || item.channel))].join(', ') : 'Sin conversaciones'}</strong></div></div>
      <hr /><section className="contact-activity-section" aria-labelledby="contact-activity-title"><div className="contact-history-heading"><div><span className="eyebrow">ACTIVIDAD</span><strong id="contact-activity-title">{selected.activities.length} cambios recientes</strong></div></div>
        {selected.activities.length ? <ol className="contact-activity-list">{selected.activities.map((activity) => <li className="contact-activity-item" key={activity.id}><span className={`contact-activity-marker ${activity.action === 'contact.created' ? 'created' : ''}`} aria-hidden="true"><Icon name={activity.action === 'contact.created' ? 'plus' : 'clock'} size={13} /></span><div><p>{activity.summary || 'Se actualizó la ficha del contacto.'}</p><small>{activity.actorName} · {formatDate(activity.createdAt)}</small></div></li>)}</ol> : <p className="contact-activity-empty">Los cambios que se hagan a esta ficha aparecerán aquí.</p>}
      </section>
      <hr /><div className="contact-history-heading"><div><span className="eyebrow">HISTORIAL</span><strong>{selected.conversations.length} conversaciones recientes</strong></div></div>
      {selected.conversations.length ? <div className="contact-history">{selected.conversations.map((conversation) => <section className="contact-conversation" key={conversation.id}><header><span>{channelNames[conversation.channel.toLowerCase()] || conversation.channel}</span><em>{conversation.state === 'open' ? 'Abierta' : conversation.state}</em></header><small>{formatDate(conversation.lastActivity)}{conversation.owner ? ` · ${conversation.owner}` : ''}</small>{conversation.messages.map((message) => <article className={`contact-message ${message.direction === 'outbound' ? 'outbound' : ''}`} key={message.id}><p>{message.content}</p><small>{message.direction === 'outbound' ? 'Equipo' : 'Contacto'} · {formatDate(message.createdAt)}</small></article>)}</section>)}</div> : <p className="contact-history-empty">Este contacto todavía no tiene mensajes registrados.</p>}
      <p className="contact-readonly-note">El historial de mensajes es de solo lectura. Las respuestas se habilitarán en la bandeja.</p>
    </aside></div>}
    {(creating || editing) && <ContactEditor initial={editing} saving={saving} onClose={() => { if (!saving) { setCreating(false); setEditing(null) } }} onSave={(input) => void saveContact(input)} />}
  </main>
}

function ContactEditor({ initial, saving, onClose, onSave }: { initial: ContactDetail | null; saving: boolean; onClose: () => void; onSave: (input: ContactInput) => void }) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [language, setLanguage] = useState(initial?.preferredLanguage || 'unknown')
  const [error, setError] = useState('')

  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const focusable = () => dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')) : []
    focusable()[0]?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!displayName.trim()) { setError('Escribe el nombre del contacto.'); return }
    if ((!initial || initial.source === 'manual') && !phone.trim() && !email.trim()) { setError('Añade un teléfono o correo para identificar el contacto.'); return }
    onSave({ displayName: displayName.trim(), phone: phone.trim() || null, email: email.trim() || null, preferredLanguage: language || null })
  }

  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section ref={dialogRef} className="contact-editor" role="dialog" aria-modal="true" aria-labelledby="contact-editor-title">
    <header><div><p className="eyebrow">{initial ? 'FICHA DE CONTACTO' : 'DIRECTORIO'}</p><h2 id="contact-editor-title">{initial ? 'Editar contacto' : 'Nuevo contacto'}</h2></div><button className="icon-button" aria-label="Cerrar formulario" disabled={saving} onClick={onClose}><Icon name="close" /></button></header>
    {!initial && <p className="contact-editor-note">Los contactos manuales no se conectan a Meta ni pueden recibir mensajes hasta vincular un canal.</p>}
    <form onSubmit={submit}>
      <label>Nombre<input autoFocus required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
      <label>Teléfono<input type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 0100" /></label>
      <label>Correo electrónico<input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="persona@ejemplo.com" /></label>
      <label>Idioma preferido<select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="unknown">Sin definir</option><option value="es">Español</option><option value="en">English</option><option value="pt">Português</option></select></label>
      {initial && <p className="contact-consent-note">El consentimiento actual ({consentLabel(initial.consentState)}) solo se actualiza con evidencia del canal.</p>}
      {error && <p className="admin-form-error" role="alert">{error}</p>}
      <footer><button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear contacto'}</button></footer>
    </form>
  </section></div>
}

function formatDate(value: string | null) {
  if (!value) return 'Sin actividad'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin actividad' : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function consentLabel(value: string) {
  const labels: Record<string, string> = { granted: 'Otorgado', denied: 'No otorgado', unknown: 'Sin confirmar' }
  return labels[value.toLowerCase()] || 'Sin confirmar'
}
