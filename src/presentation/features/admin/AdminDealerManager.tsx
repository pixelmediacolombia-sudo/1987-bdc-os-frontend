import { useState, type FormEvent } from 'react'
import type { CreateDealerInput, CreatedDealer } from '../../../domain/dealer/dealer'

type Props = {
  onCreate: (input: CreateDealerInput) => Promise<CreatedDealer>
  onCreated: (dealer: CreatedDealer) => void
  onClose: () => void
}

export default function AdminDealerManager({ onCreate, onCreated, onClose }: Props) {
  const [dealerName, setDealerName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [result, setResult] = useState<CreatedDealer | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const created = await onCreate({ dealerName: dealerName.trim(), ownerName: ownerName.trim(), ownerEmail: ownerEmail.trim() })
      onCreated(created)
      setResult(created)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos conectar con BDC OS.')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyInvite() {
    if (!result?.invitation.url) return
    try {
      await navigator.clipboard.writeText(result.invitation.url)
      setCopied(true)
    } catch {
      setError('No pudimos copiar el enlace. Selecciónalo y cópialo manualmente.')
    }
  }

  const invitation = result?.invitation
  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog admin-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <header><span className="dialog-icon">BDC</span><button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}>×</button></header>
      {result && invitation ? <>
        <h2 id="invite-title">{invitation.delivery === 'sent' ? 'Invitación enviada' : 'Dealer creado'}</h2>
        <p>{invitation.delivery === 'sent' ? `Enviamos la invitación a ${invitation.email}. El responsable definirá su contraseña desde el enlace.` : `El acceso de ${invitation.email} está listo. Comparte este enlace para que defina su contraseña.`}</p>
        {invitation.url && <><label className="invite-link-label" htmlFor="invite-link">{invitation.delivery === 'failed' ? 'No llegó el correo · enlace alternativo' : `Invitación · vence en ${invitation.expiresInHours} horas`}</label><input id="invite-link" className="invite-link-input" readOnly value={invitation.url} onFocus={(event) => event.currentTarget.select()} /></>}
        {error && <p className="admin-form-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="secondary" onClick={onClose}>Cerrar</button>{invitation.url && <button type="button" className="primary" onClick={() => void copyInvite()}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>}</div>
        {invitation.delivery !== 'sent' && <small className="invite-delivery-note">{invitation.delivery === 'failed' ? 'El envío por correo falló. Comparte el enlace de respaldo con el responsable.' : 'En esta versión, el enlace se comparte manualmente. Configura SMTP para enviar el correo desde BDC OS.'}</small>}
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
