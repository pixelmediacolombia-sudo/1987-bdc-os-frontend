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
      <a className="login-brand" href="#login" aria-label="BDC OS CRM"><span>BDC</span><i>OS</i><small>CRM</small></a>
      <div className="login-heading"><span className="login-kicker">1987 MARKETING & FILMS</span><h1>Tu operación comercial empieza aquí</h1><p>Ingresa a tu espacio de trabajo de BDC OS.</p></div>
      <form className="login-form" onSubmit={submit}>
        <label>Correo electrónico<input type="email" name="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" /></label>
        <label>Contraseña<input type="password" name="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa tu contraseña" /></label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="login-submit" type="submit" disabled={submitting}>{submitting ? 'Validando…' : 'Entrar'}<span aria-hidden="true">→</span></button>
      </form>
      <p className="login-local-note"><i /> Entorno local de pruebas</p>
      <footer>BDC OS CRM <span>·</span> 1987 Marketing & Films</footer>
    </section>
    <aside className="login-side"><div className="login-side-mark"><span>BDC</span><i>OS</i><small>CRM</small></div><div><p>Una experiencia propia, conectada a nuestro backend.</p><span>Esta instancia es local y está aislada de producción.</span></div><span className="login-side-index">01 / ESPACIO COMERCIAL</span></aside>
  </main>
}
