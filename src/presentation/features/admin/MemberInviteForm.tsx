import { useState, type FormEvent } from 'react'
import type { DealerInvitation } from '../../../domain/dealer/dealer'

export function MemberInviteForm({ onInvite, onInvited }: { onInvite: (name: string, email: string) => Promise<DealerInvitation>; onInvited: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [invitation, setInvitation] = useState<DealerInvitation | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try { setInvitation(await onInvite(name.trim(), email.trim())); onInvited() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos emitir la invitación.') }
    finally { setSubmitting(false) }
  }

  return <section className="admin-member-invite" aria-label="Invitar miembro al dealer"><h3>Invitar miembro</h3>{invitation ? <div className="admin-invite-result" role="status"><strong>{invitation.delivery === 'sent' ? 'Invitación enviada' : 'Invitación creada'}</strong><span>{invitation.email} · vence en {invitation.expiresInHours} horas</span>{invitation.url && <><input aria-label="Enlace de invitación" readOnly value={invitation.url} onFocus={(event) => event.currentTarget.select()} /><small>{invitation.delivery === 'failed' ? 'Falló el envío por correo; comparte este enlace manualmente.' : 'Comparte este enlace con el responsable.'}</small></>}</div> : <form onSubmit={(event) => void submit(event)}><label>Nombre del miembro<input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Correo electrónico<input required maxLength={254} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p className="admin-form-error" role="alert">{error}</p>}<button className="primary" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar invitación'}</button></form>}</section>
}
