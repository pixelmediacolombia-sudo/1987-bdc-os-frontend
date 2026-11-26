import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { appServices } from '../../../core/container'
import type { ContactConversation, ContactDealer, ContactMessage, InboxAssignee, InboxConversation } from '../../../domain/contact/contact'
import { contactInitials, contactLabel } from '../../../domain/contact/contact'
import { HttpError } from '../../../infrastructure/http/http-client'
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
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [assignees, setAssignees] = useState<InboxAssignee[]>([])
  const [items, setItems] = useState<InboxConversation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<ContactConversation | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyError, setReplyError] = useState('')
  const [replyNotice, setReplyNotice] = useState('')
  const [replyUncertain, setReplyUncertain] = useState(false)
  const [replySaving, setReplySaving] = useState(false)
  const replyRequestId = useRef<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [actionError, setActionError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])
  const visibleItems = items.filter((item) => !unreadOnly || !item.isRead)
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
    Promise.all([appServices.contacts.listConversations(dealerId, { search, channel }), appServices.contacts.listConversationAssignees(dealerId)]).then(([result, people]) => {
      if (!active) return
      setItems(result.conversations)
      setAssignees(people)
      setSelectedId((current) => result.conversations.some((item) => item.id === current) ? current : '')
    }).catch((cause: unknown) => {
      if (active) { setItems([]); setError(cause instanceof Error ? cause.message : 'No pudimos cargar las conversaciones.') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [dealerId, search, channel, retryCount])

  const updateSelected = async (input: { assignedUserId?: string | null; isRead?: boolean }) => {
    if (!selected || !dealerId || updating) return
    setUpdating(true)
    setActionError('')
    try {
      await appServices.contacts.updateConversation(dealerId, selected.id, input)
      setItems((current) => current.map((item) => item.id !== selected.id ? item : {
        ...item,
        ...(Object.hasOwn(input, 'assignedUserId') ? { assignedUserId: input.assignedUserId ?? null, assignedUserName: assignees.find((person) => person.id === input.assignedUserId)?.displayName ?? null } : {}),
        ...(Object.hasOwn(input, 'isRead') ? { isRead: input.isRead ?? item.isRead } : {}),
      }))
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No pudimos actualizar la conversación.') }
    finally { setUpdating(false) }
  }

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !selectedConversation || !dealerId || !replyDraft.trim() || replySaving || replyUncertain) return
    const requestId = replyRequestId.current ?? globalThis.crypto.randomUUID()
    replyRequestId.current = requestId
    setReplySaving(true)
    setReplyError('')
    setReplyNotice('')
    try {
      const result = await appServices.contacts.sendConversationMessage(dealerId, selected.id, { clientMessageId: requestId, content: replyDraft })
      const saved = result.message
      setSelectedConversation((current) => current ? { ...current, messages: [...current.messages.filter((message) => message.id !== saved.id), saved] } : current)
      if (saved.status === 'pending' || saved.status === 'uncertain') {
        setReplyUncertain(true)
        setReplyError(saved.status === 'uncertain' ? 'No pudimos confirmar la entrega. Verifica la conversación antes de volver a intentar.' : 'El mensaje sigue en proceso. Espera la confirmación antes de responder de nuevo.')
        return
      }
      setItems((current) => current.map((item) => item.id === selected.id
        ? { ...item, lastMessage: saved.content, lastDirection: 'outbound', lastActivity: saved.createdAt }
        : item))
      setReplyDraft('')
      setReplyNotice('Mensaje enviado.')
      replyRequestId.current = null
    } catch (cause) {
      const payload = cause instanceof HttpError ? cause.payload : {}
      const saved = payload.message && typeof payload.message === 'object' ? payload.message as ContactMessage : undefined
      if (saved) setSelectedConversation((current) => current ? { ...current, messages: [...current.messages.filter((message) => message.id !== saved.id), saved] } : current)
      const uncertain = saved?.status === 'uncertain'
      setReplyUncertain(Boolean(uncertain))
      setReplyError(cause instanceof Error ? cause.message : 'No pudimos confirmar el envío. Puedes volver a consultar el estado.')
    } finally {
      setReplySaving(false)
    }
  }

  useEffect(() => {
    if (!selected || !dealerId) { setSelectedConversation(null); return }
    let active = true
    setDetailLoading(true)
    setDetailError('')
    setSelectedConversation(null)
    setReplyDraft('')
    setReplyError('')
    setReplyNotice('')
    setReplyUncertain(false)
    replyRequestId.current = null
    appServices.contacts.get(dealerId, selected.contactId).then((contact) => {
      if (active) setSelectedConversation(contact.conversations.find((item) => item.id === selected.id) ?? null)
    }).catch((cause: unknown) => {
      if (active) setDetailError(cause instanceof Error ? cause.message : 'No pudimos cargar los mensajes.')
    }).finally(() => { if (active) setDetailLoading(false) })
    return () => { active = false }
  }, [dealerId, selected?.id, selected?.contactId])

  const threadMessages = useMemo(() => [
    ...(selectedConversation?.messages ?? []),
  ].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)), [selectedConversation])
  const latestOutbound = [...threadMessages].reverse().find((message) => message.direction === 'outbound')
  const deliveryBlocked = replyUncertain || latestOutbound?.status === 'pending' || latestOutbound?.status === 'uncertain'

  return <section className="inbox-view" aria-labelledby="inbox-title">
    <header className="inbox-heading"><div><span className="eyebrow">CONVERSACIONES DEL DEALER</span><h1 id="inbox-title">Bandeja</h1><p>Revisa las conversaciones por canal, asignación y estado de lectura.</p></div></header>
    <div className="inbox-toolbar"><div className="inbox-dealer-scope"><small>ACCESO DEL DEALER</small><strong>{activeDealer?.name || (loading ? 'Cargando dealer…' : 'Dealer no disponible')}</strong></div><label>Canal<select aria-label="Filtrar por canal" value={channel} onChange={(event) => setChannel(event.target.value)}><option value="">Todos los canales</option><option value="messenger">Messenger</option><option value="instagram">Instagram</option><option value="whatsapp">WhatsApp</option></select></label><button className={`secondary inbox-unread-filter ${unreadOnly ? 'active' : ''}`} aria-pressed={unreadOnly} onClick={() => setUnreadOnly((value) => !value)}>No leídas</button><span className="inbox-count">{items.filter((item) => !item.isRead).length} sin leer · {items.length} conversaciones</span></div>
    {error ? <div className="inbox-error" role="alert"><p>{error}</p><button className="secondary" onClick={() => setRetryCount((value) => value + 1)}>Reintentar</button></div> : <div className="inbox-workspace">
      <aside className="inbox-list-panel" aria-label="Lista de conversaciones"><div className="inbox-list-heading"><strong>Recientes</strong><span>{loading ? 'Cargando…' : items.length}</span></div>
        {loading ? <p className="inbox-empty">Cargando conversaciones…</p> : visibleItems.length ? <ul className="inbox-conversation-list">{visibleItems.map((item) => <li key={item.id}><button className={`inbox-conversation-card ${item.id === selectedId ? 'selected' : ''} ${item.isRead ? '' : 'unread'}`} aria-current={item.id === selectedId ? 'true' : undefined} onClick={() => setSelectedId(item.id)}><span className="inbox-avatar">{contactInitials(contactLabel({ displayName: item.contactName, phone: item.phone, email: null }))}</span><span className="inbox-card-main"><span className="inbox-card-top"><strong>{contactLabel({ displayName: item.contactName, phone: item.phone, email: null })}</strong><time>{dateLabel(item.lastActivity)}</time></span><span className="inbox-card-preview">{item.lastMessage || 'Sin mensajes registrados'}</span><span className="inbox-card-meta"><span>{channels[item.channel.toLowerCase()] || item.channel}</span><span>{item.assignedUserName ? `Asignada a ${item.assignedUserName}` : 'Sin asignar'}</span><span>{item.isRead ? 'Leída' : 'No leída'}</span></span></span></button></li>)}</ul> : <div className="inbox-empty"><Icon name="inbox" size={19} /><strong>{unreadOnly ? 'No hay conversaciones sin leer' : 'No hay conversaciones'}</strong><span>Cuando lleguen mensajes al dealer, aparecerán aquí.</span></div>}
      </aside>
      <section className="inbox-thread-panel" aria-label="Detalle de conversación">
        {selected ? <>
          <header className="inbox-thread-heading"><span className="inbox-avatar">{contactInitials(contactLabel({ displayName: selected.contactName, phone: selected.phone, email: null }))}</span><div><h2>{contactLabel({ displayName: selected.contactName, phone: selected.phone, email: null })}</h2><p>{channels[selected.channel.toLowerCase()] || selected.channel} · {selected.phone || 'Sin teléfono'}</p></div><span className="inbox-thread-state">{selected.state === 'open' ? 'Abierta' : selected.state}</span></header>
          <div className="inbox-assignment-controls"><label>Asignada a<select aria-label="Asignar conversación" value={selected.assignedUserId ?? ''} disabled={updating} onChange={(event) => void updateSelected({ assignedUserId: event.target.value || null })}><option value="">Sin asignar</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label><button className="secondary" disabled={updating} onClick={() => void updateSelected({ isRead: !selected.isRead })}>{selected.isRead ? 'Marcar no leída' : 'Marcar leída'}</button></div>
          {actionError && <p className="inbox-action-error" role="alert">{actionError}</p>}
          <div className="inbox-thread-messages">
            {detailLoading ? <p className="inbox-thread-message-state">Cargando mensajes…</p> : detailError ? <p className="inbox-thread-message-state error">{detailError}</p> : threadMessages.length ? threadMessages.map((message) => <article className={`inbox-message ${message.direction === 'outbound' ? 'outbound' : ''} ${message.status === 'failed' ? 'delivery-failed' : ''} ${message.status === 'uncertain' ? 'delivery-uncertain' : ''}`} key={message.id}><p>{message.content}</p><small>{message.direction === 'outbound' ? message.senderName || 'Equipo' : 'Contacto'} · {dateLabel(message.createdAt)}{message.status === 'sent' ? ' · Enviado' : message.status === 'pending' ? ' · Enviando' : message.status === 'failed' ? ' · No enviado' : message.status === 'uncertain' ? ' · Entrega sin confirmar' : ''}</small></article>) : <p className="inbox-thread-message-state">Esta conversación todavía no tiene mensajes.</p>}
          </div>
          {selectedConversation && !detailError ? <div className="inbox-reply-area">
            {replyNotice && <p className="inbox-reply-success" role="status">{replyNotice}</p>}
            {replyError && <p className="inbox-reply-error" role="alert">{replyError}</p>}
            <form className="inbox-reply-form" onSubmit={sendReply}>
              <label htmlFor="inbox-reply-draft">Responder</label>
              <textarea id="inbox-reply-draft" aria-label="Escribe tu mensaje" rows={3} maxLength={2000} value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} placeholder="Escribe un mensaje…" disabled={replySaving || deliveryBlocked} />
              <footer><span>{replyDraft.length}/2000</span><button className="primary" type="submit" disabled={!replyDraft.trim() || replySaving || detailLoading || deliveryBlocked}>{replySaving ? 'Enviando…' : deliveryBlocked ? 'Entrega en revisión' : replyError ? 'Reintentar envío' : 'Enviar mensaje'}</button></footer>
            </form>
          </div> : <footer className="inbox-readonly-note">El historial no está disponible en este momento.</footer>}
        </> : <div className="inbox-thread-empty"><span><Icon name="inbox" size={20} /></span><strong>Selecciona una conversación</strong><p>Verás aquí el historial persistido de mensajes.</p></div>}
      </section>
    </div>}
  </section>
}
