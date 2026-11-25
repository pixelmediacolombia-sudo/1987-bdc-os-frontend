import { useEffect, useMemo, useState } from 'react'
import type { HomeDashboardData } from '../../../domain/opportunity/opportunity'
import { appServices } from '../../../core/container'
import Icon from '../../components/Icon'
import type { IconName } from '../../app/navigation'
import { formatCurrentDate } from '../../app/current-date'

type Props = { search: string; onNavigate: (section: 'Bandeja' | 'Oportunidades') => void }
type Filter = 'Todo' | 'Prioridad'
const relativeTime = (value: string) => {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'ayer' : `hace ${days} días`
}
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'CO'
const currency = (cents: string) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(cents || 0) / 100)
const channelName = (channel: string) => ({ whatsapp: 'WhatsApp', messenger: 'Messenger', facebook: 'Facebook', instagram: 'Instagram' }[channel.toLowerCase()] ?? channel)

export default function HomeDashboard({ search, onNavigate }: Props) {
  const [data, setData] = useState<HomeDashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('Todo')

  async function load() {
    setLoading(true); setError('')
    try {
      const dealers = await appServices.opportunities.listDealers()
      if (!dealers.length) { setData({ metrics: { unreadConversations: 0, newContacts: 0, activeOpportunities: 0, pipelineValueCents: '0' }, attention: [], activities: [] }); return }
      const result = await appServices.opportunities.dashboard(dealers[0].id)
      setData(result)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar los datos locales.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const visible = useMemo(() => (data?.attention ?? []).filter((item, index) => {
    const matchesSearch = !search.trim() || `${item.name} ${item.summary ?? ''} ${channelName(item.channel)}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))
    const matchesFilter = filter !== 'Prioridad' || index === 0
    return matchesSearch && matchesFilter
  }), [data, filter, search])
  const next = data?.attention[0]
  const metrics = data?.metrics

  return <div className="home-dashboard">
    <div className="page-heading"><div><p className="eyebrow">{formatCurrentDate()}</p><h1>Tu operación, en un solo lugar</h1><p className="subtitle">Una vista clara para saber qué necesita atención y cuál es el siguiente paso.</p></div><button className="primary" onClick={() => onNavigate('Oportunidades')}><Icon name="plus" size={16} /> Nueva oportunidad</button></div>
    {error && <div className="home-data-error" role="alert"><span>{error}</span><button className="secondary" onClick={() => void load()}>Reintentar</button></div>}
    <section className="metrics" aria-label="Indicadores de datos locales">
      <article className="metric metric-feature"><div className="metric-top"><span className="metric-icon dark"><Icon name="inbox" size={16} /></span><span>sin leer</span><b>LOCAL</b></div><div className="metric-number"><strong>{loading ? '—' : metrics?.unreadConversations ?? 0}</strong><span>Conversaciones pendientes</span></div><div className="metric-foot">Basado en conversaciones locales</div></article>
      <article className="metric"><div className="metric-top"><span className="metric-icon"><Icon name="users" size={16} /></span><span>este mes</span></div><strong className="small-number">{loading ? '—' : metrics?.newContacts ?? 0}</strong><b className="metric-title">Nuevos contactos</b><small>Registros guardados en PostgreSQL local</small></article>
      <article className="metric"><div className="metric-top"><span className="metric-icon"><Icon name="target" size={16} /></span><span>en curso</span></div><strong className="small-number">{loading ? '—' : metrics?.activeOpportunities ?? 0}</strong><b className="metric-title">Oportunidades activas</b><small>Etapas nuevo, en proceso y cierre</small></article>
      <article className="metric pipeline-metric"><div className="metric-top"><span className="metric-icon"><Icon name="pipeline" size={16} /></span><span>pipeline activo</span></div><div className="potential"><strong>{loading ? '—' : currency(metrics?.pipelineValueCents ?? '0')}</strong><span>valor potencial</span></div><div className="stage-track"><i /><i /><i /></div><div className="stage-labels"><span>Nuevo</span><span>En proceso</span><span>Cierre</span></div></article>
    </section>
    <div className="content-grid"><section className="panel queue" aria-labelledby="queue-title"><div className="panel-heading"><div><div className="title-count"><h2 id="queue-title">Necesitan tu atención</h2><b>{loading ? '—' : visible.length}</b></div><p>Conversaciones sin leer del dealer actual</p></div><button className="link-button" onClick={() => onNavigate('Bandeja')}>Ver bandeja <Icon name="arrow" size={14} /></button></div>
      <div className="filter-row"><div className="filters" role="group" aria-label="Filtrar conversaciones">{(['Todo', 'Prioridad'] as const).map((item) => <button key={item} className={filter === item ? 'selected' : ''} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}{item === 'Prioridad' && <i />}</button>)}</div><span className="date-filter"><Icon name="calendar" size={14} /> Pendientes actuales</span></div>
      <div className="lead-list">{loading ? <div className="empty"><strong>Cargando datos locales…</strong></div> : visible.length ? visible.slice(0, 6).map((item, index) => <button className="lead-row" key={item.id} onClick={() => onNavigate('Bandeja')}><span className={`lead-avatar ${index % 2 ? 'neutral' : 'warm'}`}>{initials(item.name)}</span><span className="lead-copy"><span className="lead-name"><strong>{item.name}</strong><em className={`status ${index === 0 ? 'status-prioridad' : 'status-seguimiento'}`}><i />{index === 0 ? 'Pendiente más antiguo' : 'Sin leer'}</em></span><span className="lead-summary">{item.summary || 'Sin mensaje de texto disponible.'}</span><span className="lead-meta">{channelName(item.channel)}<i />{relativeTime(item.lastActivity)}</span></span><span className="row-arrow"><Icon name="arrow" size={15} /></span></button>) : <div className="empty"><Icon name="inbox" size={18} /><strong>{search ? 'No encontramos conversaciones' : 'No hay conversaciones pendientes'}</strong><span>{search ? 'Prueba otra búsqueda.' : 'Las conversaciones sin leer aparecerán aquí.'}</span></div>}</div>
      <button className="queue-footer" onClick={() => onNavigate('Bandeja')}>Ir a la bandeja completa <Icon name="arrow" size={14} /></button>
    </section><aside className="side-column"><section className="panel next"><div className="panel-heading compact"><div><h2>Tu siguiente paso</h2><p>Según la conversación pendiente más antigua</p></div><span className="sparkle"><Icon name="spark" size={15} /></span></div><div className="next-copy">{next ? <><small>PRIORIDAD DEL EQUIPO</small><h3>Responde a {next.name}</h3><p>{next.summary || 'Tiene una conversación pendiente de respuesta.'} · {relativeTime(next.lastActivity)}.</p><button className="link-button" onClick={() => onNavigate('Bandeja')}>Abrir bandeja <Icon name="arrow" size={14} /></button></> : <><small>TODO AL DÍA</small><h3>No hay conversaciones sin leer.</h3><p>Los nuevos mensajes de este dealer aparecerán aquí.</p></>}</div></section>
      <section className="panel activity"><div className="panel-heading compact"><div><h2>Actividad reciente</h2><p>Altas y cambios guardados</p></div><span className="local-activity-label">LOCAL</span></div><div className="activity-list">{(data?.activities ?? []).length ? data!.activities.map((activity) => <Activity key={activity.id} icon={activity.category === 'opportunities' ? 'pipeline' : 'users'} title={activity.category === 'opportunities' ? 'Oportunidad actualizada' : 'Contacto actualizado'} text={activity.summary} time={relativeTime(activity.createdAt)} />) : <div className="activity-empty">La actividad registrada aparecerá aquí.</div>}</div></section></aside></div>
    <footer className="disclaimer"><b>Entorno local</b><i /> Indicadores, conversaciones y actividad consultados desde los datos guardados del dealer.</footer>
  </div>
}

function Activity({ icon, title, text, time }: { icon: IconName; title: string; text: string; time: string }) {
  return <div className="activity-item"><span><Icon name={icon} size={14} /></span><p><strong>{title}</strong><small>{text}</small><small>{time}</small></p></div>
}
