import { useEffect, useMemo, useState } from 'react'
import { appServices } from '../../../core/container'
import type { ContactConversation, ContactDealer, InboxConversation } from '../../../domain/contact/contact'
import { contactInitials, contactLabel } from '../../../domain/contact/contact'
import Icon from '../../components/Icon'

const channels: Record<string, string> = { messenger: 'Messenger', facebook: 'Facebook', fb: 'Facebook', instagram: 'Instagram', ig: 'Instagram', whatsapp: 'WhatsApp' }

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function InboxView({ search }: { search: string }) {
  const [dealers, setDealers] = useState<ContactDealer[]>([])
  const [dealerId, setDealerId] = useState('')
  const [channel, setChannel] = useState('')
  const [items, setItems] = useState<InboxConversation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<ContactConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])
  const activeDealer = dealers.find((dealer) => dealer.id === dealerId)

  useEffect(() => {
    let active = true
    appServices.contacts.listDealers().then((result) => {
      if (!active) return
      setDealers(result)
      setDealerId((current) => current || result[0]?.id || '')
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar los dealers asociados.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retryCount])

  useEffect(() => {
    if (!dealerId) return
    let active = true
    setLoading(true)
    setError('')
    appServices.contacts.listConversations(dealerId, { search, channel }).then((result) => {
      if (!active) return
      setItems(result.conversations)
      setSelectedId((current) => result.conversations.some((item) => item.id === current) ? current : '')
    }).catch((cause: unknown) => {
      if (active) { setItems([]); setError(cause instanceof Error ? cause.message : 'No pudimos cargar las conversaciones.') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [dealerId, search, channel, retryCount])

  useEffect(() => {
    if (!selected || !dealerId) { setSelectedConversation(null); return }
    let active = true
    setDetailLoading(true)
    setDetailError('')
    setSelectedConversation(null)
    appServices.contacts.get(dealerId, selected.contactId).then((contact) => {
      if (active) setSelectedConversation(contact.conversations.find((item) => item.id === selected.id) ?? null)
    }).catch((cause: unknown) => {
      if (active) setDetailError(cause instanceof Error ? cause.message : 'No pudimos cargar los mensajes.')
    }).finally(() => { if (active) setDetailLoading(false) })
    return () => { active = false }
  }, [dealerId, selected])

  return <section className="inbox-view" aria-labelledby="inbox-title">
    <header className="inbox-heading"><div><span className="eyebrow">CONVERSACIONES DEL DEALER</span><h1 id="inbox-title">Bandeja</h1><p>Revisa los mensajes recibidos por canal. Esta vista es de solo lectura durante la validación local.</p></div><span className="inbox-local-badge"><i /> Datos locales</span></header>
    <div className="inbox-toolbar"><div className="inbox-dealer-scope"><small>ACCESO DEL DEALER</small><strong>{activeDealer?.name || (loading ? 'Cargando dealer…' : 'Dealer no disponible')}</strong></div><label>Canal<select aria-label="Filtrar por canal" value={channel} onChange={(event) => setChannel(event.target.value)}><option value="">Todos los canales</option><option value="messenger">Messenger</option><option value="instagram">Instagram</option><option value="whatsapp">WhatsApp</option></select></label><span className="inbox-count">{items.length} conversaciones</span></div>
    {error ? <div className="inbox-error" role="alert"><p>{error}</p><button className="secondary" onClick={() => setRetryCount((value) => value + 1)}>Reintentar</button></div> : <div className="inbox-workspace">
      <aside className="inbox-list-panel" aria-label="Lista de conversaciones"><div className="inbox-list-heading"><strong>Recientes</strong><span>{loading ? 'Cargando…' : items.length}</span></div>
        {loading ? <p className="inbox-empty">Cargando conversaciones locales…</p> : items.length ? <ul className="inbox-conversation-list">{items.map((item) => <li key={item.id}><button className={`inbox-conversation-card ${item.id === selectedId ? 'selected' : ''}`} aria-current={item.id === selectedId ? 'true' : undefined} onClick={() => setSelectedId(item.id)}><span className="inbox-avatar">{contactInitials(contactLabel({ displayName: item.contactName, phone: item.phone, email: null }))}</span><span className="inbox-card-main"><span className="inbox-card-top"><strong>{contactLabel({ displayName: item.contactName, phone: item.phone, email: null })}</strong><time>{dateLabel(item.lastActivity)}</time></span><span className="inbox-card-preview">{item.lastMessage || 'Sin mensajes registrados'}</span><span className="inbox-card-meta"><span>{channels[item.channel.toLowerCase()] || item.channel}</span><span>{item.state === 'open' ? 'Abierta' : item.state}</span></span></span></button></li>)}</ul> : <div className="inbox-empty"><Icon name="inbox" size={19} /><strong>No hay conversaciones</strong><span>Cuando lleguen mensajes al dealer, aparecerán aquí.</span></div>}
      </aside>
      <section className="inbox-thread-panel" aria-label="Detalle de conversación">{selected ? <><header className="inbox-thread-heading"><span className="inbox-avatar">{contactInitials(contactLabel({ displayName: selected.contactName, phone: selected.phone, email: null }))}</span><div><h2>{contactLabel({ displayName: selected.contactName, phone: selected.phone, email: null })}</h2><p>{channels[selected.channel.toLowerCase()] || selected.channel} · {selected.phone || 'Sin teléfono'}</p></div><span className="inbox-thread-state">{selected.state === 'open' ? 'Abierta' : selected.state}</span></header><div className="inbox-thread-messages">{detailLoading ? <p className="inbox-thread-message-state">Cargando mensajes…</p> : detailError ? <p className="inbox-thread-message-state error">{detailError}</p> : selectedConversation?.messages.length ? selectedConversation.messages.map((message) => <article className={`inbox-message ${message.direction === 'outbound' ? 'outbound' : ''}`} key={message.id}><p>{message.content}</p><small>{message.direction === 'outbound' ? 'Equipo' : 'Contacto'} · {dateLabel(message.createdAt)}</small></article>) : <p className="inbox-thread-message-state">Esta conversación todavía no tiene mensajes.</p>}</div><footer className="inbox-readonly-note">La respuesta y la asignación se habilitarán cuando el flujo local de salida esté definido.</footer></> : <div className="inbox-thread-empty"><span><Icon name="inbox" size={20} /></span><strong>Selecciona una conversación</strong><p>Verás aquí el historial persistido de mensajes.</p></div>}</section>
    </div>}
  </section>
}
