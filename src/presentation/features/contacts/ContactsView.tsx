import { useEffect, useState } from 'react'
import type { ContactDealer, ContactDetail, ContactSummary } from '../../../domain/contact/contact'
import { contactInitials, contactLabel, contactReference } from '../../../domain/contact/contact'
import { appServices } from '../../../core/container'
import Icon from '../../components/Icon'

const channelNames: Record<string, string> = { messenger: 'Messenger', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp' }

export default function ContactsView({ search }: { search: string }) {
  const [dealers, setDealers] = useState<ContactDealer[]>([])
  const [dealerId, setDealerId] = useState('')
  const [contacts, setContacts] = useState<ContactSummary[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<ContactDetail | null>(null)
  const [loadingDealers, setLoadingDealers] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

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
      appServices.contacts.list(dealerId, search).then((result) => {
        if (!active) return
        setContacts(result.contacts)
        setTotal(result.total)
      }).catch(() => { if (active) setError('No pudimos cargar los contactos. Intenta de nuevo.') })
        .finally(() => { if (active) setLoadingContacts(false) })
    }, search ? 180 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [dealerId, search, retry])

  async function openContact(contact: ContactSummary) {
    setSelected(null)
    setLoadingDetail(true)
    setError('')
    try { setSelected(await appServices.contacts.get(contact.dealerId, contact.id)) }
    catch { setError('No pudimos cargar el detalle del contacto.') }
    finally { setLoadingDetail(false) }
  }

  const selectedDealer = dealers.find((dealer) => dealer.id === dealerId)

  return <main className="content contacts-view">
    <header className="page-heading">
      <div><p className="eyebrow">ESPACIO DEL DEALER</p><h1>Contactos</h1><p className="subtitle">Personas que han iniciado una conversación con tu equipo.</p></div>
      <div className="contacts-heading-actions">
        {dealers.length > 1 && <label className="contacts-dealer-select">Dealer<select aria-label="Dealer" value={dealerId} onChange={(event) => { const nextDealerId = event.target.value; setDealerId(nextDealerId); setSelected(null); if (!nextDealerId) { setContacts([]); setTotal(0); setLoadingContacts(false) } }}><option value="">Selecciona un dealer</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name || 'Dealer sin nombre'}</option>)}</select></label>}
        {dealerId && <span className="contacts-count">{loadingContacts ? 'Cargando…' : `${total} ${total === 1 ? 'contacto' : 'contactos'}`}</span>}
      </div>
    </header>

    {error && <div className="contacts-alert" role="alert"><span>{error}</span><button className="secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div>}
    {loadingDealers && <section className="panel contacts-state" aria-live="polite"><span className="loading-indicator" /><strong>Cargando el espacio de trabajo…</strong></section>}
    {!loadingDealers && !dealers.length && !error && <section className="panel contacts-state"><span className="contacts-state-icon"><Icon name="users" size={18} /></span><strong>No hay un dealer asociado</strong><p>Tu cuenta necesita una membresía activa para consultar contactos.</p></section>}
    {!loadingDealers && dealers.length > 1 && !dealerId && <section className="panel contacts-state"><span className="contacts-state-icon"><Icon name="users" size={18} /></span><strong>Selecciona un dealer</strong><p>Los contactos se consultan por separado para proteger los datos de cada empresa.</p></section>}

    {!loadingDealers && dealerId && <section className="panel contacts-panel" aria-labelledby="contacts-table-title">
      <div className="contacts-panel-heading"><div><div className="title-count"><h2 id="contacts-table-title">Directorio de contactos</h2><b>{selectedDealer?.name || 'Dealer sin nombre'}</b></div><p>Datos recibidos por los canales conectados a BDC OS.</p></div><span className="contacts-readonly"><Icon name="inbox" size={14} /> Solo lectura</span></div>
      {loadingContacts ? <div className="contacts-state" aria-live="polite"><span className="loading-indicator" /><strong>Cargando contactos…</strong></div> : contacts.length ? <div className="contacts-table-wrap"><table className="contacts-table"><thead><tr><th>Contacto</th><th>Canales</th><th>Conversaciones</th><th>Última actividad</th><th><span className="visually-hidden">Abrir ficha</span></th></tr></thead><tbody>{contacts.map((contact) => {
        const label = contactLabel(contact)
        return <tr key={contact.id}><td><button className="contact-primary" onClick={() => void openContact(contact)}><span className="contact-avatar">{contactInitials(label)}</span><span><strong>{label}</strong><small>{contact.email && contact.phone ? `${contact.email} · ${contact.phone}` : `ID de Meta · ${contactReference(contact.providerContactId)}`}</small></span></button></td><td>{contact.channels.length ? <span className="contact-channels">{contact.channels.map((channel) => <span key={channel}>{channelNames[channel.toLowerCase()] || channel}</span>)}</span> : <span className="muted-value">Sin conversaciones</span>}</td><td>{contact.conversationCount}</td><td>{formatDate(contact.lastActivity)}</td><td><button className="icon-button" aria-label={`Abrir ficha de ${label}`} onClick={() => void openContact(contact)}><Icon name="arrow" size={15} /></button></td></tr>
      })}</tbody></table></div> : <div className="contacts-state"><span className="contacts-state-icon"><Icon name="search" size={18} /></span><strong>{search.trim() ? 'No encontramos contactos' : 'Aún no hay contactos'}</strong><p>{search.trim() ? 'Prueba con otro correo, teléfono o referencia de Meta.' : 'Cuando llegue una conversación por Meta, el contacto aparecerá aquí.'}</p></div>}
    </section>}

    {loadingDetail && <div className="overlay" role="status" aria-live="polite"><section className="contacts-detail-loading"><span className="loading-indicator" /><strong>Cargando ficha de contacto…</strong></section></div>}
    {selected && <div className="overlay drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><aside className="drawer contact-drawer" role="dialog" aria-modal="true" aria-labelledby="contact-detail-title">
      <div className="drawer-top"><span className="eyebrow">FICHA DE CONTACTO</span><button className="icon-button" aria-label="Cerrar ficha" onClick={() => setSelected(null)}><Icon name="close" /></button></div>
      <span className="drawer-avatar neutral">{contactInitials(contactLabel(selected))}</span><h2 id="contact-detail-title">{contactLabel(selected)}</h2><p>{selected.email || `ID de Meta · ${contactReference(selected.providerContactId)}`}</p>
      <div className="contact-details-grid"><div><small>Teléfono</small><strong>{selected.phone || 'No disponible'}</strong></div><div><small>Correo</small><strong>{selected.email || 'No disponible'}</strong></div><div><small>Idioma</small><strong>{selected.preferredLanguage || 'No definido'}</strong></div><div><small>Consentimiento</small><strong>{consentLabel(selected.consentState)}</strong></div></div>
      <hr /><div className="contact-history-heading"><div><span className="eyebrow">HISTORIAL</span><strong>{selected.conversations.length} conversaciones recientes</strong></div></div>
      {selected.conversations.length ? <div className="contact-history">{selected.conversations.map((conversation) => <section className="contact-conversation" key={conversation.id}><header><span>{channelNames[conversation.channel.toLowerCase()] || conversation.channel}</span><em>{conversation.state === 'open' ? 'Abierta' : conversation.state}</em></header><small>{formatDate(conversation.lastActivity)}{conversation.owner ? ` · ${conversation.owner}` : ''}</small>{conversation.messages.map((message) => <article className={`contact-message ${message.direction === 'outbound' ? 'outbound' : ''}`} key={message.id}><p>{message.content}</p><small>{message.direction === 'outbound' ? 'Equipo' : 'Contacto'} · {formatDate(message.createdAt)}</small></article>)}</section>)}</div> : <p className="contact-history-empty">Este contacto todavía no tiene mensajes registrados.</p>}
      <p className="contact-readonly-note">La ficha es de solo lectura en esta entrega.</p>
    </aside></div>}
  </main>
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
