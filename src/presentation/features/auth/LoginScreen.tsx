import { useState, type FormEvent } from 'react'

type LoginScreenProps = { error: string; onSubmit: (email: string, password: string) => Promise<void> }

export default function LoginScreen({ error, onSubmit }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try { await onSubmit(email, password) } finally { setSubmitting(false) }
  }

  return <main className="login-screen">
    <section className="login-panel">
      <a className="login-brand" href="#login" aria-label="BDC OS CRM"><img src="/bdc-os-crm.png" alt="BDC OS CRM" /></a>
      <div className="login-heading"><span className="login-kicker">1987 Marketing &amp; Films</span><h1>Inicia sesión</h1><p>Accede al espacio de trabajo de BDC OS.</p></div>
      <form className="login-form" onSubmit={submit}>
        <label>Correo electrónico<input type="email" name="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" /></label>
        <label>Contraseña<input type="password" name="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa tu contraseña" /></label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="login-submit" type="submit" disabled={submitting}>{submitting ? 'Validando…' : 'Entrar'}<span aria-hidden="true">→</span></button>
      </form>
      <footer>BDC OS CRM <span>·</span> 1987 Marketing &amp; Films</footer>
    </section>
    <aside className="login-side">
      <img className="login-side-mark" src="/bdc-os-crm.png" alt="BDC OS CRM" />
      <div className="login-side-copy"><p>Cada contacto merece una respuesta a tiempo.</p><span>Organiza el seguimiento y mantén cada oportunidad en movimiento.</span></div>
      <span className="login-side-index">1987 Marketing &amp; Films</span>
    </aside>
  </main>
}
