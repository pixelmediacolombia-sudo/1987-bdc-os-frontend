export type SystemServiceStatus = 'healthy' | 'unavailable'

export interface SystemHealth {
  overall: 'healthy' | 'degraded'
  checkedAt: string
  services: {
    api: SystemServiceStatus
    postgresql: SystemServiceStatus
    redis: SystemServiceStatus
  }
}

export interface SystemHealthRepository {
  get(): Promise<SystemHealth>
}

export class GetSystemHealth {
  private readonly repository: SystemHealthRepository

  constructor(repository: SystemHealthRepository) {
    this.repository = repository
  }

  execute(): Promise<SystemHealth> {
    return this.repository.get()
  }
}
