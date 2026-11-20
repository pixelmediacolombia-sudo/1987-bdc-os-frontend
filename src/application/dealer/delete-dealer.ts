import type { DealerRepository } from '../../domain/dealer/dealer'

export class DeleteDealer {
  private readonly dealers: DealerRepository

  constructor(dealers: DealerRepository) { this.dealers = dealers }

  execute(dealerId: string): Promise<void> {
    return this.dealers.delete(dealerId)
  }
}
