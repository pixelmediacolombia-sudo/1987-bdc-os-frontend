import type { DealerRepository } from '../../domain/dealer/dealer'

export class ListDealers {
  private readonly dealers: DealerRepository

  constructor(dealers: DealerRepository) { this.dealers = dealers }

  execute() {
    return this.dealers.list()
  }
}
