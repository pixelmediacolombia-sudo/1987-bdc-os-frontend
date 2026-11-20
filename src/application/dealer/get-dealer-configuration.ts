import type { DealerConfiguration } from '../../domain/dealer/dealer-configuration'

export interface DealerConfigurationRepository {
  get(dealerId: string): Promise<DealerConfiguration>
}

export class GetDealerConfiguration {
  private readonly repository: DealerConfigurationRepository

  constructor(repository: DealerConfigurationRepository) { this.repository = repository }

  execute(dealerId: string): Promise<DealerConfiguration> {
    return this.repository.get(dealerId)
  }
}
