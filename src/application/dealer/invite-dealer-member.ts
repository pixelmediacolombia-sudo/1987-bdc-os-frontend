import type { DealerInvitation, DealerRepository, InviteDealerMemberInput } from '../../domain/dealer/dealer'

export class InviteDealerMember {
  private readonly dealers: DealerRepository

  constructor(dealers: DealerRepository) { this.dealers = dealers }

  execute(input: InviteDealerMemberInput): Promise<DealerInvitation> {
    return this.dealers.inviteMember(input)
  }
}
