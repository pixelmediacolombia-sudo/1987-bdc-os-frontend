import type { DealerConfiguration } from '../../domain/dealer/dealer-configuration'
import type { HttpClient } from '../http/http-client'
import type { DealerConfigurationRepository } from '../../application/dealer/get-dealer-configuration'

export class HttpDealerConfigurationRepository implements DealerConfigurationRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) { this.http = http }

  get(dealerId: string): Promise<DealerConfiguration> {
    return this.http.get<DealerConfiguration>(`/auth/admin/dealers/${encodeURIComponent(dealerId)}/configuration`)
  }
}
