import type { CreateDealerInput, DealerRepository } from '../../domain/dealer/dealer'

export class CreateDealerWithInvitation {
  private readonly dealers: DealerRepository

  constructor(dealers: DealerRepository) { this.dealers = dealers }

  execute(input: CreateDealerInput) {
    return this.dealers.createWithInvitation(input)
  }
}
