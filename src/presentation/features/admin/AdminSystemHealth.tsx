import { useEffect, useState } from 'react'
import { appServices } from '../../../core/container'
import type { SystemHealth, SystemServiceStatus } from '../../../application/system-health/get-system-health'
import { DataError, DataState } from './AdminStates'

const services: Array<{ key: keyof SystemHealth['services']; name: string; detail: string }> = [
  { key: 'api', name: 'API de BDC OS', detail: 'Responde solicitudes del panel.' },
  { key: 'postgresql', name: 'PostgreSQL', detail: 'Base de datos de la plataforma.' },
  { key: 'redis', name: 'Redis', detail: 'Colas y procesos en segundo plano.' },
]

export function AdminSystemHealth() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    setHealth(null)
    try {
      setHealth(await appServices.systemHealth.get.execute())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos consultar la salud del sistema.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return <section className="admin-view system-health-view" aria-label="Salud global del sistema">
    <div className="page-heading admin-page-heading">
      <div><p className="eyebrow">PLATAFORMA BDC OS</p><h1>Estado del sistema</h1><p className="subtitle">Disponibilidad de los servicios globales. Esta consulta es de solo lectura.</p></div>
      <div className="admin-heading-actions"><button className="secondary" onClick={() => void load()} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar estado'}</button></div>
    </div>

    {loading && !health && <DataState>Consultando API, PostgreSQL y Redis…</DataState>}
    {error && <DataError message={error} onRetry={() => void load()} />}
    {health && <>
      <section className={`system-health-summary ${health.overall}`} aria-live="polite">
        <span className="system-health-summary-dot" aria-hidden="true" />
        <div><h2>{health.overall === 'healthy' ? 'Servicios disponibles' : 'Hay servicios que requieren atención'}</h2><p>Última comprobación · {formatCheckedAt(health.checkedAt)}</p></div>
        <span className={`system-health-overall-label ${health.overall}`}>{health.overall === 'healthy' ? 'Operativo' : 'Degradado'}</span>
      </section>
      <section className="system-health-list" aria-label="Estado de servicios">
        {services.map((service) => <ServiceRow key={service.key} name={service.name} detail={service.detail} status={health.services[service.key]} />)}
      </section>
      <p className="system-health-note">El resumen no muestra credenciales ni detalles internos de conexión. Las configuraciones de cada dealer se consultan por separado.</p>
    </>}
  </section>
}

function ServiceRow({ name, detail, status }: { name: string; detail: string; status: SystemServiceStatus }) {
  return <div className="system-health-row">
    <span className={`system-health-dot ${status}`} aria-hidden="true" />
    <div><strong>{name}</strong><small>{detail}</small></div>
    <span className={`system-health-status ${status}`}>{status === 'healthy' ? 'Disponible' : 'No disponible'}</span>
  </div>
}

function formatCheckedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin registro' : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
