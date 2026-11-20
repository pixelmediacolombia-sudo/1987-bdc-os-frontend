import type { Dealer, DealerStatus } from '../../../domain/dealer/dealer'
import { DataError, DataState } from './AdminStates'
import { DealerTable } from './DealerTable'

export function DealerDirectory({ dealers, total, loading, error, onRetry, status, onStatusChange, onCreateDealer, onSelectDealer }: {
  dealers: Dealer[]; total: number; loading: boolean; error: string; onRetry: () => void; status: 'Todos' | DealerStatus
  onStatusChange: (status: 'Todos' | DealerStatus) => void; onCreateDealer: () => void; onSelectDealer: (dealer: Dealer) => void
}) {
  return <section className="admin-view" aria-label="Directorio de dealers">
    <div className="page-heading admin-page-heading"><div><p className="eyebrow">ADMINISTRACIÓN GLOBAL</p><h1>Directorio de dealers</h1><p className="subtitle">Consulta el estado, el equipo y las invitaciones pendientes de cada empresa.</p></div><div className="admin-heading-actions"><button className="secondary" onClick={onRetry} disabled={loading}>Actualizar</button><button className="primary" onClick={onCreateDealer}>+ Crear dealer</button></div></div>
    <section className="panel admin-directory-panel">
      <div className="admin-directory-toolbar"><div><h2>Dealers</h2><p>{loading || error ? 'El conteo aparecerá al cargar los datos.' : `${dealers.length} visibles de ${total} cuentas`}</p></div><div className="filters admin-status-filters" role="group" aria-label="Filtrar dealers por estado">{(['Todos', 'Pendiente', 'Activo', 'Inactivo'] as const).map((item) => <button key={item} className={status === item ? 'selected' : ''} aria-pressed={status === item} onClick={() => onStatusChange(item)}>{item}</button>)}</div></div>
      {loading ? <DataState>Consultando el directorio de dealers…</DataState> : error ? <DataError message={error} onRetry={onRetry} /> : <DealerTable dealers={dealers} onSelectDealer={onSelectDealer} emptyMessage={total === 0 ? 'Aún no hay dealers registrados.' : 'No hay dealers con esos filtros. Prueba otro estado o cambia la búsqueda.'} />}
    </section>
  </section>
}
