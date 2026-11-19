import Icon from '../../components/Icon'
import type { IconName } from '../../app/navigation'
import type { Dealer, DealerStatus } from '../../../domain/dealer/dealer'

type DemoDealer = Dealer

export function AdminOverview({ dealers, loading, error, onCreateDealer, onViewAll, onSelectDealer }: { dealers: DemoDealer[]; loading: boolean; error: string; onCreateDealer: () => void; onViewAll: () => void; onSelectDealer: (dealer: DemoDealer) => void }) {
  const activeCount = dealers.filter((dealer) => dealer.status === 'Activo').length
  const onboardingCount = dealers.filter((dealer) => dealer.status === 'En incorporación').length
  const userCount = dealers.reduce((total, dealer) => total + dealer.users, 0)
  const needsAttention = dealers.find((dealer) => dealer.status === 'En incorporación')

  return <section className="admin-view" aria-label="Resumen de administración">
    <div className="page-heading admin-page-heading"><div><p className="eyebrow">PANEL DEL ADMINISTRADOR GLOBAL</p><h1>Administración de dealers</h1><p className="subtitle">Gestiona las cuentas, los accesos y el estado de cada empresa.</p></div><button className="primary" onClick={onCreateDealer}>+ Crear dealer</button></div>
    <div className="admin-stat-grid" aria-label="Indicadores globales de muestra">
      <AdminStat icon="users" label="Dealers registrados" value={String(dealers.length).padStart(2, '0')} note="En la plataforma" />
      <AdminStat icon="home" label="Dealers activos" value={String(activeCount).padStart(2, '0')} note="Con acceso habilitado" />
      <AdminStat icon="clock" label="En incorporación" value={String(onboardingCount).padStart(2, '0')} note="Pendientes de completar" />
      <AdminStat icon="users" label="Usuarios de dealer" value={String(userCount).padStart(2, '0')} note="Asociados a sus empresas" />
    </div>
    <div className="admin-grid">
      <section className="panel admin-directory-preview" aria-labelledby="admin-directory-title">
        <div className="panel-heading"><div><div className="title-count"><h2 id="admin-directory-title">Directorio de dealers</h2><b>{dealers.length}</b></div><p>Estado de las cuentas y sus equipos</p></div><button className="link-button" onClick={onViewAll}>Ver directorio <Icon name="arrow" size={14} /></button></div>
        <DealerTable dealers={dealers.slice(0, 4)} onSelectDealer={onSelectDealer} />
      </section>
      <aside className="admin-side-column">
        <section className="panel admin-attention">
          <div className="panel-heading compact"><div><h2>Seguimiento de incorporación</h2><p>Dealer que requiere completar su acceso</p></div><span className="admin-attention-count">{onboardingCount}</span></div>
          {needsAttention ? <button className="admin-attention-item" onClick={() => onSelectDealer(needsAttention)}><span className="dealer-avatar">{needsAttention.initials}</span><span><strong>{needsAttention.name}</strong><small>Invitación pendiente</small></span><Icon name="arrow" size={15} /></button> : <p className="admin-clear-state">No hay incorporaciones pendientes.</p>}
        </section>
        <section className="panel admin-scope"><span className="admin-scope-mark"><Icon name="settings" size={17} /></span><h2>Control de la plataforma</h2><p>Desde esta cuenta puedes revisar cada dealer y su acceso. La atención de contactos y los pipelines aparecen en el espacio de cada dealer.</p><span>Los datos de este panel son de demostración.</span></section>
      </aside>
    </div>
    {loading && <p className="admin-data-state" role="status">Cargando dealers…</p>}
    {error && <p className="admin-form-error admin-load-error" role="alert">{error}</p>}
  </section>
}

function AdminStat({ icon, label, value, note }: { icon: IconName; label: string; value: string; note: string }) {
  return <article className="admin-stat"><div className="admin-stat-top"><span className="metric-icon"><Icon name={icon} size={16} /></span><span>{label}</span></div><strong>{value}</strong><small>{note}</small></article>
}

export function DealerDirectory({ dealers, total, loading, error, status, onStatusChange, onCreateDealer, onSelectDealer }: { dealers: DemoDealer[]; total: number; loading: boolean; error: string; status: 'Todos' | DealerStatus; onStatusChange: (status: 'Todos' | DealerStatus) => void; onCreateDealer: () => void; onSelectDealer: (dealer: DemoDealer) => void }) {
  return <section className="admin-view" aria-label="Directorio de dealers">
    <div className="page-heading admin-page-heading"><div><p className="eyebrow">ADMINISTRACIÓN GLOBAL</p><h1>Directorio de dealers</h1><p className="subtitle">Consulta la cuenta, el equipo y el estado de cada empresa.</p></div><button className="primary" onClick={onCreateDealer}>+ Crear dealer</button></div>
    <section className="panel admin-directory-panel"><div className="admin-directory-toolbar"><div><h2>Dealers</h2><p>{dealers.length} de {total} cuentas</p></div><div className="filters admin-status-filters" role="group" aria-label="Filtrar dealers por estado">{(['Todos', 'Activo', 'En incorporación', 'Suspendido'] as const).map((item) => <button key={item} className={status === item ? 'selected' : ''} aria-pressed={status === item} onClick={() => onStatusChange(item)}>{item}</button>)}</div></div><DealerTable dealers={dealers} onSelectDealer={onSelectDealer} /></section>
    {loading && <p className="admin-data-state" role="status">Cargando dealers…</p>}
    {error && <p className="admin-form-error admin-load-error" role="alert">{error}</p>}
  </section>
}

function DealerTable({ dealers, onSelectDealer }: { dealers: DemoDealer[]; onSelectDealer: (dealer: DemoDealer) => void }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Dealer</th><th scope="col">Estado</th><th scope="col">Usuarios</th><th scope="col">Actividad</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{dealers.map((dealer) => <tr key={dealer.id}><td><div className="dealer-cell"><span className="dealer-avatar">{dealer.initials}</span><span><strong>{dealer.name}</strong><small>{dealer.location}</small></span></div></td><td><span className={`dealer-status dealer-status-${dealer.status === 'Activo' ? 'active' : dealer.status === 'Suspendido' ? 'suspended' : 'onboarding'}`}><i />{dealer.status}</span></td><td><strong className="dealer-user-count">{dealer.users}</strong><small className="dealer-user-caption">{dealer.users === 1 ? 'usuario' : 'usuarios'}</small></td><td className="dealer-updated">{dealer.updated}</td><td><button className="link-button dealer-view-button" aria-label={`Ver dealer ${dealer.name}`} onClick={() => onSelectDealer(dealer)}>Ver <Icon name="arrow" size={14} /></button></td></tr>)}</tbody></table>{dealers.length === 0 && <div className="empty admin-empty"><Icon name="search" size={18} /><strong>No hay dealers con esos filtros</strong><span>Cambia el estado o la búsqueda.</span></div>}</div>
}

export function DealerDetails({ dealer, onClose }: { dealer: DemoDealer; onClose: () => void }) {
  const statusClass = dealer.status === 'Activo' ? 'active' : dealer.status === 'Suspendido' ? 'suspended' : 'onboarding'
  return <div className="overlay drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="drawer admin-dealer-drawer" role="dialog" aria-modal="true" aria-labelledby="dealer-detail-title"><div className="drawer-top"><span className="eyebrow">FICHA DEL DEALER · MUESTRA</span><button className="icon-button" aria-label="Cerrar detalle del dealer" onClick={onClose}><Icon name="close" /></button></div><span className="dealer-detail-avatar">{dealer.initials}</span><h2 id="dealer-detail-title">{dealer.name}</h2><p>{dealer.location}</p><span className={`dealer-status dealer-status-${statusClass}`}><i />{dealer.status}</span><div className="dealer-detail-facts"><div><small>Usuarios</small><strong>{dealer.users}</strong></div><div><small>Estado de cuenta</small><strong>{dealer.status}</strong></div><div><small>Última actividad</small><strong>{dealer.updated}</strong></div></div><div className="dealer-detail-note">La administración de accesos y cambios de estado se habilitará al conectar los endpoints del backend.</div><button className="secondary dealer-detail-close" onClick={onClose}>Cerrar ficha</button></aside></div>
}
