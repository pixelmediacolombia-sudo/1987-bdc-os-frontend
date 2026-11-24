import type { SofiaSimulatorStatus, SofiaSimulatorTurn } from '../../domain/sofia-simulator/sofia-simulator'
import { HttpClient } from '../http/http-client'

export class HttpSofiaSimulatorRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  status() {
    return this.http.get<SofiaSimulatorStatus>('/auth/local/sofia-simulator/status')
  }

  turn(message: string, conversationId?: string) {
    return this.http.post<SofiaSimulatorTurn>('/auth/local/sofia-simulator/turn', { message, conversationId })
  }

  reset(conversationId?: string) {
    return this.http.post<{ reset: boolean; localOnly: boolean }>('/auth/local/sofia-simulator/reset', { conversationId })
  }
}
