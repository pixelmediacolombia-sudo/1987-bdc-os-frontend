import Icon from '../../components/Icon'
import type { IconName } from '../../app/navigation'
import type { Dealer } from '../../../domain/dealer/dealer'
import { DataError, DataState } from './AdminStates'
import { DealerTable } from './DealerTable'

export function AdminOverview({ dealers, loading, error, onRetry, onCreateDealer, onViewAll, onSelectDealer }: {
  dealers: Dealer[]; loading: boolean; error: string; onRetry: () => void; onCreateDealer: () => void; onViewAll: () => void; onSelectDealer: (dealer: Dealer) => void
}) {
  const activeCount = dealers.filter((dealer) => dealer.status === 'Activo').length
  const pendingCount = dealers.filter((dealer) => dealer.status === 'Pendiente').length
  const userCount = dealers.reduce((total, dealer) => total + dealer.users, 0)
  const needsAttention = dealers.find((dealer) => dealer.status === 'Pendiente')

  return <section className="admin-view" aria-label="Resumen de administración">
    <div className="page-heading admin-page-heading">
      <div><p className="eyebrow">PANEL DEL ADMINISTRADOR GLOBAL</p><h1>Administración de dealers</h1><p className="subtitle">Consulta el estado real del directorio y la incorporación de empresas.</p></div>
      <div className="admin-heading-actions"><button className="secondary" onClick={onRetry} disabled={loading}>Actualizar</button><button className="primary" onClick={onCreateDealer}>+ Crear dealer</button></div>
    </div>
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
