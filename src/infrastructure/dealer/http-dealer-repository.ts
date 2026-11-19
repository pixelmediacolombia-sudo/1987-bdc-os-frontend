import { dealerFromSnapshot, type CreateDealerInput, type CreatedDealer, type Dealer, type DealerRepository } from '../../domain/dealer/dealer'
import { HttpClient } from '../http/http-client'

type DealerResponse = {
  id: string
  name: string
  status: string
  user_count: number
  pending_invitation_count: number
}

type ListDealersResponse = { dealers: DealerResponse[] }
type CreateDealerResponse = {
  dealer: Pick<DealerResponse, 'id' | 'name' | 'status'>
  invitation: { email: string; url?: string; delivery?: 'sent' | 'manual' | 'failed'; expiresInHours: number }
}

function fromApi(value: DealerResponse): Dealer {
  return dealerFromSnapshot({
    id: value.id,
    name: value.name,
    status: value.status,
    userCount: value.user_count,
    pendingInvitationCount: value.pending_invitation_count,
  })
}

export class HttpDealerRepository implements DealerRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) { this.http = http }

  async list(): Promise<Dealer[]> {
    const result = await this.http.get<ListDealersResponse>('/auth/admin/dealers')
    return result.dealers.map(fromApi)
  }

  async createWithInvitation(input: CreateDealerInput): Promise<CreatedDealer> {
    const result = await this.http.post<CreateDealerResponse>('/auth/admin/dealers', input)
    return {
      dealer: fromApi({ ...result.dealer, user_count: 0, pending_invitation_count: 1 }),
      invitation: {
        email: result.invitation.email ?? input.ownerEmail,
        url: result.invitation.url,
        delivery: result.invitation.delivery ?? 'manual',
        expiresInHours: result.invitation.expiresInHours,
      },
    }
  }
}
