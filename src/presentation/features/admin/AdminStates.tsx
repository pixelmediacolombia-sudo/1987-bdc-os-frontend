import type { DealerStatus } from '../../../domain/dealer/dealer'

export function DealerStatusBadge({ status }: { status: DealerStatus }) {
  const statusClass = status === 'Activo' ? 'active' : status === 'Pendiente' ? 'onboarding' : 'suspended'
  return <span className={`dealer-status dealer-status-${statusClass}`}><i />{status}</span>
}

export function DataState({ children }: { children: string }) {
  return <p className="admin-data-state" role="status">{children}</p>
}

export function DataError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="admin-error-state" role="alert"><p>{message}</p><button className="secondary" onClick={onRetry}>Reintentar</button></div>
}
