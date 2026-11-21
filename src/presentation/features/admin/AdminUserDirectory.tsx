import { useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import { appServices } from '../../../core/container'
import type { AdminUserEntry, AdminUserStatus } from '../../../domain/admin-users/admin-user'
import type { Dealer } from '../../../domain/dealer/dealer'
import { DataError, DataState } from './AdminStates'

const statuses: Array<{ value: AdminUserStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'disabled', label: 'Deshabilitados' },
  { value: 'invited', label: 'Cuentas invitadas' },
  { value: 'pending', label: 'Invitaciones pendientes' },
  { value: 'expired', label: 'Invitaciones vencidas' },
]

const statusLabels: Record<AdminUserStatus, string> = {
  active: 'Activo',
  disabled: 'Deshabilitado',
  invited: 'Invitado',
  pending: 'Invitación pendiente',
  expired: 'Invitación vencida',
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date)
}

function UserRow({ entry }: { entry: AdminUserEntry }) {
  const initials = entry.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('es')).join('') || 'U'
  const statusClass = entry.status === 'active' ? 'active' : entry.status === 'pending' || entry.status === 'invited' ? 'pending' : entry.status === 'expired' ? 'expired' : 'disabled'
  return <tr>
    <td><span className="admin-user-identity"><span className="admin-user-avatar">{initials}</span><span><strong>{entry.displayName}</strong><small>{entry.email}</small></span></span></td>
    <td>{entry.kind === 'invitation' ? 'Invitación' : entry.accountType === 'admin' ? 'Admin global' : 'Usuario'}</td>
    <td><span className="admin-user-dealers">{entry.dealers.length ? entry.dealers.map((dealer) => dealer.name?.trim() || 'Dealer sin nombre').join(', ') : 'Plataforma'}</span></td>
    <td><span className={`admin-user-status ${statusClass}`}><i />{statusLabels[entry.status]}</span>{entry.expiresAt && <small className="admin-user-expiry">Vence {formatDate(entry.expiresAt)}</small>}</td>
    <td><time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time></td>
  </tr>
}

export function AdminUserDirectory({ dealers }: { dealers: Dealer[] }) {
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [dealerId, setDealerId] = useState('')
  const [status, setStatus] = useState<AdminUserStatus | 'all'>('all')
  const [accountType, setAccountType] = useState<'admin' | 'user' | 'all'>('all')
  const [offset, setOffset] = useState(0)
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<{ key: string; entries: AdminUserEntry[]; total: number } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const limit = 50
  const requestKey = JSON.stringify({ accountType, dealerId, offset, reload, status, submittedSearch })

  useEffect(() => {
    let mounted = true
    appServices.adminUsers.list.execute({ search: submittedSearch, dealerId, status, accountType, limit, offset })
      .then((page) => { if (mounted) { setResult({ key: requestKey, entries: page.entries, total: page.total }); setFailure(null) } })
      .catch((cause: unknown) => { if (mounted) setFailure({ key: requestKey, message: cause instanceof Error ? cause.message : 'No pudimos cargar los usuarios de la plataforma.' }) })
    return () => { mounted = false }
  }, [accountType, dealerId, offset, reload, requestKey, status, submittedSearch])

  function clearFilters() {
    setSearch(''); setSubmittedSearch(''); setDealerId(''); setStatus('all'); setAccountType('all'); setOffset(0)
  }

  const page = result?.key === requestKey ? result : null
  const error = failure?.key === requestKey ? failure.message : ''
  const loading = page === null && !error
  const total = page?.total ?? 0
  const pageStart = total ? offset + 1 : 0
  const pageEnd = Math.min(offset + limit, total)
  const hasFilters = Boolean(submittedSearch || dealerId || status !== 'all' || accountType !== 'all')

  return <section className="admin-view" aria-label="Usuarios y accesos de la plataforma">
    <div className="page-heading admin-page-heading"><div><p className="eyebrow">ADMINISTRACIÓN GLOBAL</p><h1>Usuarios y accesos</h1><p className="subtitle">Consulta las cuentas, los dealers asociados y las invitaciones emitidas.</p></div><div className="admin-heading-actions"><button className="secondary" onClick={() => setReload((value) => value + 1)} disabled={loading}><Icon name="clock" size={14} /> Actualizar</button></div></div>
    <section className="panel admin-user-panel" aria-labelledby="admin-users-title">
      <div className="panel-heading"><div><h2 id="admin-users-title">Directorio de acceso</h2><p>Solo lectura · las invitaciones se administran desde el dealer</p></div><span className="audit-range">{pageStart}–{pageEnd} de {total}</span></div>
      <form className="admin-user-filters" onSubmit={(event) => { event.preventDefault(); setOffset(0); setSubmittedSearch(search.trim()) }}>
        <label className="admin-user-search">Buscar<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, correo o dealer" /></label>
        <label>Dealer<select value={dealerId} onChange={(event) => { setDealerId(event.target.value); setOffset(0) }}><option value="">Todos los dealers</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</select></label>
        <label>Tipo de cuenta<select value={accountType} onChange={(event) => { setAccountType(event.target.value as typeof accountType); setOffset(0) }}><option value="all">Todos</option><option value="admin">Admin global</option><option value="user">Usuario</option></select></label>
        <label>Estado<select value={status} onChange={(event) => { setStatus(event.target.value as AdminUserStatus | 'all'); setOffset(0) }}>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <button className="primary admin-user-search-button" type="submit">Buscar</button>
        {hasFilters && <button className="link-button admin-user-clear" type="button" onClick={clearFilters}>Limpiar filtros</button>}
      </form>
      {loading && <DataState>Cargando usuarios e invitaciones…</DataState>}
      {error && <DataError message={error} onRetry={() => setReload((value) => value + 1)} />}
      {page && <>
        {page.entries.length ? <div className="admin-table-wrap"><table className="admin-table admin-user-table"><thead><tr><th scope="col">Usuario</th><th scope="col">Tipo</th><th scope="col">Dealer asociado</th><th scope="col">Estado</th><th scope="col">Creado</th></tr></thead><tbody>{page.entries.map((entry) => <UserRow key={`${entry.kind}-${entry.id}`} entry={entry} />)}</tbody></table></div> : <div className="admin-user-empty"><Icon name="users" size={20} /><strong>{hasFilters ? 'No hay resultados para estos filtros' : 'Todavía no hay usuarios registrados'}</strong><span>{hasFilters ? 'Prueba ajustar la búsqueda o limpiar los filtros.' : 'Los accesos aparecerán aquí cuando se creen cuentas o invitaciones.'}</span></div>}
        <div className="audit-pagination"><span>Mostrando {pageStart}–{pageEnd} de {total} accesos</span><div><button className="secondary" onClick={() => setOffset((value) => Math.max(0, value - limit))} disabled={offset === 0}>Anterior</button><button className="secondary" onClick={() => setOffset((value) => value + limit)} disabled={offset + limit >= total}>Siguiente</button></div></div>
      </>}
    </section>
    <p className="audit-footnote">El directorio no muestra contraseñas, tokens de invitación ni credenciales.</p>
  </section>
}
