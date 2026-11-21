import type { SystemHealth, SystemHealthRepository, SystemServiceStatus } from '../../application/system-health/get-system-health'
import type { HttpClient } from '../http/http-client'

type SystemHealthResponse = {
  overall: SystemHealth['overall']
  checked_at: string
  services: SystemHealth['services']
}

export class HttpSystemHealthRepository implements SystemHealthRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async get(): Promise<SystemHealth> {
    const response = await this.http.get<SystemHealthResponse>('/auth/admin/system/health')
    if (!isSystemHealthResponse(response)) throw new Error('La respuesta de salud del sistema no es válida.')

    return {
      overall: response.overall,
      checkedAt: response.checked_at,
      services: response.services,
    }
  }
}

function isSystemHealthResponse(value: unknown): value is SystemHealthResponse {
  if (!value || typeof value !== 'object') return false
  const response = value as Partial<SystemHealthResponse>
  return (response.overall === 'healthy' || response.overall === 'degraded') &&
    typeof response.checked_at === 'string' && !Number.isNaN(Date.parse(response.checked_at)) &&
    Boolean(response.services && isServiceStatus(response.services.api) &&
      isServiceStatus(response.services.postgresql) && isServiceStatus(response.services.redis))
}

function isServiceStatus(value: unknown): value is SystemServiceStatus {
  return value === 'healthy' || value === 'unavailable'
}
