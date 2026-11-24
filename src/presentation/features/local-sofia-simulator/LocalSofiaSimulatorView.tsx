import { useEffect, useState, type FormEvent } from 'react'
import { simulatorFactLabel, type SofiaSimulatorStatus, type SofiaSimulatorTurn } from '../../../domain/sofia-simulator/sofia-simulator'
import { appServices } from '../../../core/container'
import Icon from '../../components/Icon'

export default function LocalSofiaSimulatorView() {
  const [status, setStatus] = useState<SofiaSimulatorStatus | null>(null)
  const [turn, setTurn] = useState<SofiaSimulatorTurn | null>(null)
  const [conversationId, setConversationId] = useState<string>()
  const [message, setMessage] = useState('')
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    appServices.localSofiaSimulator.status().then((result) => {
      if (active) setStatus(result)
    }).catch(() => {
      if (active) setError('No pudimos consultar el simulador local del backend.')
    }).finally(() => {
      if (active) setLoadingStatus(false)
    })
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = message.trim()
    if (!text || !status?.enabled || sending) return
    setSending(true)
    setError('')
    try {
      const result = await appServices.localSofiaSimulator.turn(text, conversationId)
      setConversationId(result.conversationId)
      setTurn(result)
      setMessage('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos procesar el turno local.')
    } finally {
      setSending(false)
    }
  }

  async function reset() {
    setError('')
    try {
      await appServices.localSofiaSimulator.reset(conversationId)
      setConversationId(undefined)
      setTurn(null)
      setMessage('')
    } catch {
      setError('No pudimos reiniciar la conversación local.')
    }
  }

  const messages = turn?.messages ?? []

  return <main className="content local-sofia-view">
    <header className="page-heading">
      <div><p className="eyebrow">HERRAMIENTA LOCAL · SOFIA</p><h1>Simulador de conversaciones</h1><p className="subtitle">Escribe como un contacto de prueba y observa el flujo del backend.</p></div>
      <button className="secondary" onClick={() => void reset()} disabled={!conversationId && !turn}><Icon name="plus" size={15} /> Nueva simulación</button>
    </header>

    <section className="local-simulator-notice" aria-label="Alcance de la simulación">
      <span className="local-simulator-status-icon"><Icon name="spark" size={17} /></span>
      <div><strong>{loadingStatus ? 'Comprobando backend local…' : status?.enabled ? 'Backend local conectado' : 'Simulador apagado'}</strong>
        <p>{status?.enabled ? `${status.modelMode} ${status.modelHost ? `Host del modelo: ${status.modelHost}.` : ''} El contacto y la conversación viven sólo en memoria; no se consulta Meta ni se envían mensajes.` : 'Enciende SOFIA_ENABLED y CONVERSATIONAL_AI_ENABLED en el backend de desarrollo, con CONVERSATIONAL_AI_SEND_ENABLED=false.'}</p>
      </div>
      <span className={`local-simulator-badge ${status?.enabled ? 'enabled' : ''}`}>{status?.enabled ? 'SOLO LOCAL' : 'INACTIVO'}</span>
    </section>

    {error && <div className="contacts-alert" role="alert">{error}</div>}

    <div className="local-simulator-grid">
      <section className="panel local-simulator-chat" aria-labelledby="simulator-chat-title">
        <header className="local-simulator-chat-heading">
          <div className="local-simulator-avatar"><Icon name="users" size={17} /></div>
          <div><h2 id="simulator-chat-title">{status?.contactName ?? 'Andrea Demo'}</h2><p>Contacto completamente simulado · dealer local</p></div>
          <span className="local-simulator-live"><i /> Backend</span>
        </header>
        <div className="local-simulator-messages" aria-live="polite" aria-label="Mensajes de la simulación">
          {!messages.length && <div className="local-simulator-empty"><span><Icon name="inbox" size={19} /></span><strong>Inicia una conversación</strong><p>Envía un mensaje de prueba. Sofia procesará cada turno y guardará el estado sólo en memoria.</p><button className="link-button" onClick={() => setMessage('Hola, busco una SUV para mi familia.')}>Probar con una consulta de vehículo <Icon name="arrow" size={13} /></button></div>}
          {messages.map((item) => <article key={item.id} className={`local-simulator-message ${item.direction}`}>
            <small>{item.direction === 'inbound' ? status?.contactName ?? 'Andrea Demo' : 'Sofia · reglas del backend'} · {formatTime(item.createdAt)}</small>
            <p>{item.content}</p>
          </article>)}
          {sending && <div className="local-simulator-thinking" role="status"><span className="loading-indicator" /> Sofia está pensando…</div>}
        </div>
        <form className="local-simulator-composer" onSubmit={(event) => void submit(event)}>
          <label className="visually-hidden" htmlFor="simulator-message">Mensaje del contacto simulado</label>
          <textarea id="simulator-message" maxLength={2000} rows={2} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe el siguiente mensaje del contacto…" disabled={!status?.enabled || sending} />
          <div><small>{message.length}/2000 · Sólo se envía al backend local</small><button className="primary" disabled={!status?.enabled || !message.trim() || sending}><Icon name="arrow" size={15} /> {sending ? 'Procesando…' : 'Enviar turno local'}</button></div>
        </form>
      </section>

      <aside className="local-simulator-analysis">
        <section className="panel local-simulator-analysis-card">
          <header><span className="local-analysis-icon"><Icon name="spark" size={15} /></span><div><h2>Lectura de OpenAI</h2><p>Hechos extraídos del último turno</p></div></header>
          {turn ? <>
            <div className={`local-ai-result ${turn.openai.status}`}><i />{turn.openai.status === 'ok' ? 'Análisis completado' : 'Sofia usó respuesta de respaldo'}</div>
            <dl className="local-ai-details"><div><dt>Intención</dt><dd>{turn.openai.extraction?.intent ?? 'Sin extracción'}</dd></div><div><dt>Acción que decide el backend</dt><dd>{turn.sofia.nextStep ?? 'Sin acción'}</dd></div><div><dt>Lead</dt><dd>{turn.sofia.leadLevel}</dd></div></dl>
            {Object.entries(turn.openai.modelFacts).length ? <ul className="local-ai-facts">{Object.entries(turn.openai.modelFacts).map(([key, value]) => <li key={key}><span>{simulatorFactLabel(key)}</span><strong>{formatFact(value)}</strong></li>)}</ul> : <p className="local-ai-empty">OpenAI no extrajo hechos nuevos en este turno.</p>}
            {!!turn.openai.safetyIssues.length && <p className="local-ai-warning" role="status">El modelo no respondió; Sofia conservó la salida determinística.</p>}
          </> : <p className="local-ai-empty">Al enviar un mensaje, aquí verás qué entendió OpenAI. La respuesta de Sofia seguirá gobernada por las reglas del backend.</p>}
          <p className="local-ai-footnote">La respuesta visible en el chat la produce Sofia con reglas determinísticas. Este simulador nunca envía respuestas a Meta.</p>
        </section>
      </aside>
    </div>
  </main>
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatFact(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'number' && value === 1500) return '$1.500'
  return String(value)
}
