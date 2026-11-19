import { useState, type FormEvent } from 'react'
import { asDealerRecord, type DealerRecord } from './dealer-records'

export default function AdminDealerManager({ onCreated, onClose }: { onCreated: (dealer: DealerRecord) => void; onClose: () => void }) {
  const [dealerName, setDealerName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [delivery, setDelivery] = useState<'sent' | 'manual' | 'failed'>('manual')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/backend/auth/admin/dealers', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dealerName: dealerName.trim(), ownerName: ownerName.trim(), ownerEmail: ownerEmail.trim() }),
      })
      const payload = await response.json() as { error?: string; dealer?: { id: string; name: string; status: string }; invitation?: { url?: string; delivery?: 'sent' | 'manual' | 'failed'; expiresInHours: number } }
      const deliveryState = payload.invitation?.delivery ?? 'manual'
      if (!response.ok || !payload.dealer || (deliveryState !== 'sent' && !payload.invitation?.url)) throw new Error(payload.error ?? 'No pudimos crear la invitación.')
      onCreated(asDealerRecord({ id: payload.dealer.id, name: payload.dealer.name, status: payload.dealer.status, user_count: 0, pending_invitation_count: 1 }))
      setInviteUrl(payload.invitation?.url ?? '')
      setDelivery(deliveryState)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos conectar con BDC OS.')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    } catch {
      setError('No pudimos copiar el enlace. Selecciónalo y cópialo manualmente.')
    }
  }

  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog admin-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <header><span className="dialog-icon">BDC</span><button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}>×</button></header>
      {inviteUrl || delivery === 'sent' ? <>
        <h2 id="invite-title">{delivery === 'sent' ? 'Invitación enviada' : 'Dealer creado'}</h2>
        <p>{delivery === 'sent' ? `Enviamos la invitación a ${ownerEmail}. El responsable definirá su contraseña desde el enlace.` : `El acceso de ${ownerEmail} está listo. Comparte este enlace para que defina su contraseña.`}</p>
        {inviteUrl && <><label className="invite-link-label" htmlFor="invite-link">{delivery === 'failed' ? 'No llegó el correo · enlace alternativo' : 'Invitación · vence en 72 horas'}</label><input id="invite-link" className="invite-link-input" readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /></>}
        {error && <p className="admin-form-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="secondary" onClick={onClose}>Cerrar</button>{inviteUrl && <button type="button" className="primary" onClick={() => void copyInvite()}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>}</div>
        {delivery !== 'sent' && <small className="invite-delivery-note">{delivery === 'failed' ? 'El envío por correo falló. Comparte el enlace de respaldo con el responsable.' : 'En esta versión, el enlace se comparte manualmente. Configura SMTP para enviar el correo desde BDC OS.'}</small>}
      </> : <>
        <h2 id="invite-title">Crear dealer</h2>
        <p>Registra la empresa e invita a su responsable. El equipo definirá sus propias contraseñas.</p>
        <form onSubmit={(event) => void submit(event)}>
          <label>Nombre del dealer<input autoFocus required maxLength={160} value={dealerName} onChange={(event) => setDealerName(event.target.value)} placeholder="Ej. Grupo Andino Motors" /></label>
          <label>Responsable principal<input required maxLength={160} value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Nombre y apellido" /></label>
          <label>Correo de invitación<input required maxLength={254} type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="responsable@empresa.com" /></label>
          <small>El dealer quedará en incorporación. Sus automatizaciones permanecen apagadas hasta configurarlas.</small>
          {error && <p className="admin-form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={submitting}>{submitting ? 'Creando…' : 'Crear e invitar'}</button></div>
        </form>
      </>}
    </section>
  </div>
}
