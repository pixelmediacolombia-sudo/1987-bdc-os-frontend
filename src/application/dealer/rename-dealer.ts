import type { DealerRepository } from '../../domain/dealer/dealer'

export class RenameDealer {
  private readonly dealers: DealerRepository

  constructor(dealers: DealerRepository) { this.dealers = dealers }

  execute(dealerId: string, name: string): Promise<void> {
    return this.dealers.rename(dealerId, name)
  }
}
