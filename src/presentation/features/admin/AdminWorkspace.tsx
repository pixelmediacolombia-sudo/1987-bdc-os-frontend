import { useState, type FormEvent } from 'react'
import Icon from '../../components/Icon'
import type { IconName } from '../../app/navigation'
import type { Dealer, DealerInvitation, DealerStatus } from '../../../domain/dealer/dealer'

type AdminDealer = Dealer

export function AdminOverview({ dealers, loading, error, onRetry, onCreateDealer, onViewAll, onSelectDealer }: { dealers: AdminDealer[]; loading: boolean; error: string; onRetry: () => void; onCreateDealer: () => void; onViewAll: () => void; onSelectDealer: (dealer: AdminDealer) => void }) {
  const activeCount = dealers.filter((dealer) => dealer.status === 'Activo').length
  const pendingCount = dealers.filter((dealer) => dealer.status === 'Pendiente').length
  const userCount = dealers.reduce((total, dealer) => total + dealer.users, 0)
  const needsAttention = dealers.find((dealer) => dealer.status === 'Pendiente')

  return <section className="admin-view" aria-label="Resumen de administración">
    <div className="page-heading admin-page-heading"><div><p className="eyebrow">PANEL DEL ADMINISTRADOR GLOBAL</p><h1>Administración de dealers</h1><p className="subtitle">Consulta el estado real del directorio y la incorporación de empresas.</p></div><div className="admin-heading-actions"><button className="secondary" onClick={onRetry} disabled={loading}>Actualizar</button><button className="primary" onClick={onCreateDealer}>+ Crear dealer</button></div></div>
    {loading ? <DataState>Consultando el directorio de dealers…</DataState> : error ? <DataError message={error} onRetry={onRetry} /> : <>
    <div className="admin-stat-grid" aria-label="Indicadores de dealers">
      <AdminStat icon="users" label="Dealers registrados" value={String(dealers.length)} note="En la plataforma" />
      <AdminStat icon="home" label="Dealers activos" value={String(activeCount)} note="Con acceso habilitado" />
      <AdminStat icon="clock" label="Pendientes" value={String(pendingCount)} note="A la espera de aceptar invitación" />
      <AdminStat icon="users" label="Miembros activos" value={String(userCount)} note="Invitaciones aceptadas" />
    </div>
    <div className="admin-grid">
      <section className="panel admin-directory-preview" aria-labelledby="admin-directory-title">
        <div className="panel-heading"><div><div className="title-count"><h2 id="admin-directory-title">Directorio de dealers</h2><b>{dealers.length}</b></div><p>Estado de las cuentas y sus equipos</p></div><button className="link-button" onClick={onViewAll}>Ver directorio <Icon name="arrow" size={14} /></button></div>
        <DealerTable dealers={dealers.slice(0, 4)} onSelectDealer={onSelectDealer} emptyMessage="Aún no hay dealers registrados." />
      </section>
      <aside className="admin-side-column">
        <section className="panel admin-attention">
          <div className="panel-heading compact"><div><h2>Invitaciones pendientes</h2><p>Dealers que esperan su primera aceptación</p></div><span className="admin-attention-count">{pendingCount}</span></div>
          {needsAttention ? <button className="admin-attention-item" onClick={() => onSelectDealer(needsAttention)}><span className="dealer-avatar">{needsAttention.initials}</span><span><strong>{needsAttention.name}</strong><small>{needsAttention.pendingInvitations} invitación{needsAttention.pendingInvitations === 1 ? '' : 'es'} pendiente{needsAttention.pendingInvitations === 1 ? '' : 's'}</small></span><Icon name="arrow" size={15} /></button> : <p className="admin-clear-state">No hay dealers pendientes.</p>}
        </section>
        <section className="panel admin-scope"><span className="admin-scope-mark"><Icon name="settings" size={17} /></span><h2>Control de la plataforma</h2><p>Desde esta cuenta puedes revisar cada dealer y su acceso. La atención de contactos y los pipelines aparecen en el espacio de cada dealer.</p><span>Datos recibidos del servicio de administración.</span></section>
      </aside>
    </div>
    </>}
  </section>
}

function AdminStat({ icon, label, value, note }: { icon: IconName; label: string; value: string; note: string }) {
  return <article className="admin-stat"><div className="admin-stat-top"><span className="metric-icon"><Icon name={icon} size={16} /></span><span>{label}</span></div><strong>{value}</strong><small>{note}</small></article>
}

export function DealerDirectory({ dealers, total, loading, error, onRetry, status, onStatusChange, onCreateDealer, onSelectDealer }: { dealers: AdminDealer[]; total: number; loading: boolean; error: string; onRetry: () => void; status: 'Todos' | DealerStatus; onStatusChange: (status: 'Todos' | DealerStatus) => void; onCreateDealer: () => void; onSelectDealer: (dealer: AdminDealer) => void }) {
  return <section className="admin-view" aria-label="Directorio de dealers">
    <div className="page-heading admin-page-heading"><div><p className="eyebrow">ADMINISTRACIÓN GLOBAL</p><h1>Directorio de dealers</h1><p className="subtitle">Consulta el estado, el equipo y las invitaciones pendientes de cada empresa.</p></div><div className="admin-heading-actions"><button className="secondary" onClick={onRetry} disabled={loading}>Actualizar</button><button className="primary" onClick={onCreateDealer}>+ Crear dealer</button></div></div>
    <section className="panel admin-directory-panel"><div className="admin-directory-toolbar"><div><h2>Dealers</h2><p>{loading || error ? 'El conteo aparecerá al cargar los datos.' : `${dealers.length} visibles de ${total} cuentas`}</p></div><div className="filters admin-status-filters" role="group" aria-label="Filtrar dealers por estado">{(['Todos', 'Pendiente', 'Activo', 'Inactivo'] as const).map((item) => <button key={item} className={status === item ? 'selected' : ''} aria-pressed={status === item} onClick={() => onStatusChange(item)}>{item}</button>)}</div></div>{loading ? <DataState>Consultando el directorio de dealers…</DataState> : error ? <DataError message={error} onRetry={onRetry} /> : <DealerTable dealers={dealers} onSelectDealer={onSelectDealer} emptyMessage={total === 0 ? 'Aún no hay dealers registrados.' : 'No hay dealers con esos filtros. Prueba otro estado o cambia la búsqueda.'} />}</section>
  </section>
}

function DealerTable({ dealers, onSelectDealer, emptyMessage }: { dealers: AdminDealer[]; onSelectDealer: (dealer: AdminDealer) => void; emptyMessage: string }) {
  return <div className="admin-table-wrap">{dealers.length > 0 && <table className="admin-table"><thead><tr><th scope="col">Dealer</th><th scope="col">Estado</th><th scope="col">Miembros activos</th><th scope="col">Invitaciones pendientes</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{dealers.map((dealer) => <tr key={dealer.id}><td><div className="dealer-cell"><span className="dealer-avatar">{dealer.initials}</span><span><strong>{dealer.name}</strong><small title={dealer.id}>ID · {dealer.id}</small></span></div></td><td><DealerStatusBadge status={dealer.status} /></td><td><strong className="dealer-user-count">{dealer.users}</strong><small className="dealer-user-caption">{dealer.users === 1 ? 'miembro' : 'miembros'}</small></td><td className="dealer-updated">{dealer.pendingInvitations}</td><td><button className="link-button dealer-view-button" aria-label={`Ver dealer ${dealer.name}`} onClick={() => onSelectDealer(dealer)}>Ver <Icon name="arrow" size={14} /></button></td></tr>)}</tbody></table>}{dealers.length === 0 && <div className="empty admin-empty"><Icon name="search" size={18} /><strong>{emptyMessage}</strong></div>}</div>
}

export function DealerDetails({ dealer, onClose, onInviteMember, onInvited, onDelete }: { dealer: AdminDealer; onClose: () => void; onInviteMember: (name: string, email: string) => Promise<DealerInvitation>; onInvited: () => void; onDelete: (dealerId: string) => Promise<void> }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  async function deleteDealer() {
    setDeleting(true)
    setDeleteError('')
    try { await onDelete(dealer.id) } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : 'No pudimos eliminar el dealer.') } finally { setDeleting(false) }
  }
  return <div className="overlay drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !confirmDelete) onClose() }}><aside className="drawer admin-dealer-drawer" role="dialog" aria-modal="true" aria-labelledby="dealer-detail-title"><div className="drawer-top"><span className="eyebrow">RESUMEN DE CUENTA</span><button className="icon-button" aria-label="Cerrar detalle del dealer" onClick={onClose}><Icon name="close" /></button></div><span className="dealer-detail-avatar">{dealer.initials}</span><h2 id="dealer-detail-title">{dealer.name}</h2><p className="dealer-id">ID · {dealer.id}</p><DealerStatusBadge status={dealer.status} /><div className="dealer-detail-facts"><div><small>Miembros activos</small><strong>{dealer.users}</strong></div><div><small>Invitaciones pendientes</small><strong>{dealer.pendingInvitations}</strong></div></div><div className="dealer-detail-note">Los miembros se cuentan después de aceptar la invitación y crear su contraseña. El estado se actualizará a Activo al completar ese proceso.</div><MemberInviteForm onInvite={onInviteMember} onInvited={onInvited} /><button className="secondary dealer-detail-close" onClick={onClose}>Cerrar ficha</button><button className="dealer-delete-trigger" onClick={() => setConfirmDelete(true)}>Eliminar dealer</button>{deleteError && <p className="admin-form-error" role="alert">{deleteError}</p>}{confirmDelete && <div className="dealer-delete-confirm" role="alertdialog" aria-labelledby="dealer-delete-title" aria-describedby="dealer-delete-warning"><h3 id="dealer-delete-title">¿Eliminar {dealer.name}?</h3><p id="dealer-delete-warning">Esta acción no se puede deshacer. También eliminará sus invitaciones, membresías y datos asociados al dealer.</p><div><button className="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</button><button className="dealer-delete-button" onClick={() => void deleteDealer()} disabled={deleting}>{deleting ? 'Eliminando…' : 'Sí, eliminar dealer'}</button></div></div>}</aside></div>
}

function MemberInviteForm({ onInvite, onInvited }: { onInvite: (name: string, email: string) => Promise<DealerInvitation>; onInvited: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [invitation, setInvitation] = useState<DealerInvitation | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await onInvite(name.trim(), email.trim())
      setInvitation(result)
      onInvited()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos emitir la invitación.')
    } finally {
      setSubmitting(false)
    }
  }

  return <section className="admin-member-invite" aria-label="Invitar miembro al dealer"><h3>Invitar miembro</h3>{invitation ? <div className="admin-invite-result" role="status"><strong>{invitation.delivery === 'sent' ? 'Invitación enviada' : 'Invitación creada'}</strong><span>{invitation.email} · vence en {invitation.expiresInHours} horas</span>{invitation.url && <><input aria-label="Enlace de invitación" readOnly value={invitation.url} onFocus={(event) => event.currentTarget.select()} /><small>{invitation.delivery === 'failed' ? 'Falló el envío por correo; comparte este enlace manualmente.' : 'Comparte este enlace con el responsable.'}</small></>}</div> : <form onSubmit={(event) => void submit(event)}><label>Nombre del miembro<input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Correo electrónico<input required maxLength={254} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p className="admin-form-error" role="alert">{error}</p>}<button className="primary" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar invitación'}</button></form>}</section>
}

function DealerStatusBadge({ status }: { status: DealerStatus }) {
  const statusClass = status === 'Activo' ? 'active' : status === 'Pendiente' ? 'onboarding' : 'suspended'
  return <span className={`dealer-status dealer-status-${statusClass}`}><i />{status}</span>
}

function DataState({ children }: { children: string }) {
  return <p className="admin-data-state" role="status">{children}</p>
}

function DataError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="admin-error-state" role="alert"><p>{message}</p><button className="secondary" onClick={onRetry}>Reintentar</button></div>
}
