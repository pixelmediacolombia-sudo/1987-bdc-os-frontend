import { useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import { appServices } from '../../../core/container'
import type { AuditCategory, AuditEvent, AuditPage } from '../../../domain/admin-audit/audit-event'
import type { Dealer } from '../../../domain/dealer/dealer'

const categories: Array<{ value: AuditCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Todas las categorías' },
  { value: 'dealers', label: 'Dealers' },
  { value: 'users', label: 'Usuarios' },
  { value: 'invitations', label: 'Invitaciones' },
  { value: 'settings', label: 'Configuración' },
  { value: 'security', label: 'Seguridad' },
]

const actionLabels: Record<string, string> = {
  'dealer.created': 'Dealer creado',
  'dealer.deleted': 'Dealer eliminado',
  'invitation.created': 'Invitación enviada',
  'invitation.accepted': 'Invitación aceptada',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function categoryLabel(category: AuditCategory) {
  return categories.find((item) => item.value === category)?.label ?? category
}

function EventRow({ event }: { event: AuditEvent }) {
  const [expanded, setExpanded] = useState(false)
  return <>
    <tr className={expanded ? 'audit-row is-expanded' : 'audit-row'}>
      <td><time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time></td>
      <td><span className="audit-actor"><span className="audit-avatar">{event.actorName.slice(0, 1).toUpperCase()}</span><span><strong>{event.actorName}</strong><small>{event.actorEmail}</small></span></span></td>
      <td><span className="audit-action"><i aria-hidden="true" />{actionLabels[event.action] ?? event.action}</span><small className="audit-category">{categoryLabel(event.category)}</small></td>
      <td><strong className="audit-dealer">{event.dealerName ?? 'Dealer eliminado'}</strong>{event.dealerId && <small className="audit-dealer-id" title={event.dealerId}>{event.dealerId.slice(0, 8)}</small>}</td>
      <td><span className={`audit-outcome audit-outcome-${event.outcome}`}>{event.outcome === 'success' ? 'Correcto' : 'Fallido'}</span></td>
      <td><button className="icon-button audit-expand" aria-expanded={expanded} aria-label={`${expanded ? 'Ocultar' : 'Ver'} detalles del evento ${event.id}`} onClick={() => setExpanded((value) => !value)}><Icon name="chevron" size={16} /></button></td>
    </tr>
    {expanded && <tr className="audit-detail-row"><td colSpan={6}><div><span>{event.summary}</span><small>Referencia · <code>{event.referenceId}</code></small></div></td></tr>}
  </>
}

export default function AdminActivity({ dealers }: { dealers: Dealer[] }) {
  const [dealerId, setDealerId] = useState('')
  const [actor, setActor] = useState('')
  const [category, setCategory] = useState<AuditCategory | 'all'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [result, setResult] = useState<{ key: string; page: AuditPage } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const [reload, setReload] = useState(0)
  const limit = 50
  const requestKey = JSON.stringify({ actor, category, dealerId, from, offset, reload, submittedSearch, to })

  useEffect(() => {
    let mounted = true
    appServices.audit.list.execute({ dealerId, actor, category, from, to, search: submittedSearch, limit, offset })
      .then((page) => { if (mounted) { setResult({ key: requestKey, page }); setFailure(null) } })
      .catch((cause: unknown) => { if (mounted) setFailure({ key: requestKey, message: cause instanceof Error ? cause.message : 'No pudimos cargar la actividad administrativa.' }) })
    return () => { mounted = false }
  }, [actor, category, dealerId, from, offset, reload, requestKey, submittedSearch, to])

  function clearFilters() {
    setDealerId(''); setActor(''); setCategory('all'); setFrom(''); setTo(''); setSearch(''); setSubmittedSearch(''); setOffset(0)
  }

  const page = result?.key === requestKey ? result.page : null
  const loading = page === null && failure?.key !== requestKey
  const error = failure?.key === requestKey ? failure.message : ''
  const hasFilters = Boolean(dealerId || actor || category !== 'all' || from || to || submittedSearch)
  const total = page?.total ?? 0
  const pageStart = total === 0 ? 0 : offset + 1
  const pageEnd = Math.min(offset + limit, total)

  return <section className="admin-view" aria-label="Actividad administrativa">
    <div className="page-heading admin-page-heading"><div><p className="eyebrow">ADMINISTRACIÓN GLOBAL</p><h1>Actividad administrativa</h1><p className="subtitle">Consulta quién hizo cada cambio, a qué dealer afectó y cuándo ocurrió.</p></div><div className="admin-heading-actions"><button className="secondary" onClick={() => setReload((value) => value + 1)} disabled={loading}><Icon name="clock" size={14} /> Actualizar</button></div></div>
    <div className="audit-overview">
      <article className="audit-total"><span className="metric-icon"><Icon name="clock" size={16} /></span><div><small>Eventos encontrados</small><strong>{loading && !page ? '—' : total.toLocaleString('es-CO')}</strong></div></article>
      <p><span className="audit-live-dot" /> Registro de solo lectura <span>Los eventos se guardan en el backend.</span></p>
    </div>
    <section className="panel audit-panel" aria-labelledby="audit-log-title">
      <div className="panel-heading"><div><h2 id="audit-log-title">Registro de actividad</h2><p>Eventos administrativos persistentes</p></div><span className="audit-range">{pageStart}–{pageEnd} de {total}</span></div>
      <form className="audit-filters" onSubmit={(event) => { event.preventDefault(); setOffset(0); setSubmittedSearch(search.trim()) }}>
        <label>Dealer<select value={dealerId} onChange={(event) => { setDealerId(event.target.value); setOffset(0) }}><option value="">Todos los dealers</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</select></label>
        <label>Actor<input value={actor} onChange={(event) => { setActor(event.target.value); setOffset(0) }} placeholder="Nombre o correo" /></label>
        <label>Categoría<select value={category} onChange={(event) => { setCategory(event.target.value as AuditCategory | 'all'); setOffset(0) }}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Desde<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setOffset(0) }} /></label>
        <label>Hasta<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setOffset(0) }} /></label>
        <label className="audit-search">Buscar<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Evento, dealer o referencia" /></label>
        <button className="primary audit-search-button"><Icon name="search" size={14} /> Buscar</button>
        {hasFilters && <button type="button" className="audit-clear" onClick={clearFilters}>Limpiar filtros</button>}
      </form>
      {loading ? <div className="audit-state" role="status"><span className="audit-loader" />Cargando eventos de auditoría…</div> : error ? <div className="audit-state audit-error" role="alert"><Icon name="close" size={18} /><strong>No se pudo cargar la auditoría</strong><span>{error}</span><button className="secondary" onClick={() => setReload((value) => value + 1)}>Reintentar</button></div> : total === 0 ? <div className="audit-state audit-empty"><Icon name="clock" size={20} /><strong>{hasFilters ? 'No hay eventos con estos filtros' : 'Aún no hay eventos registrados'}</strong><span>{hasFilters ? 'Ajusta la búsqueda o limpia los filtros para ver otros cambios.' : 'Los cambios administrativos aparecerán aquí cuando ocurran.'}</span>{hasFilters && <button className="link-button" onClick={clearFilters}>Limpiar filtros</button>}</div> : <>
        <div className="admin-table-wrap"><table className="admin-table audit-table"><thead><tr><th scope="col">Fecha y hora</th><th scope="col">Actor</th><th scope="col">Evento</th><th scope="col">Dealer afectado</th><th scope="col">Resultado</th><th scope="col"><span className="sr-only">Detalles</span></th></tr></thead><tbody>{page?.events.map((event) => <EventRow key={event.id} event={event} />)}</tbody></table></div>
        <div className="audit-pagination"><span>Mostrando {pageStart}–{pageEnd} de {total} eventos</span><div><button className="secondary" onClick={() => setOffset((value) => Math.max(0, value - limit))} disabled={offset === 0}>Anterior</button><button className="secondary" onClick={() => setOffset((value) => value + limit)} disabled={offset + limit >= total}>Siguiente</button></div></div>
      </>}
    </section>
    <p className="audit-footnote">No se muestran contraseñas, tokens ni credenciales en este registro.</p>
  </section>
}
