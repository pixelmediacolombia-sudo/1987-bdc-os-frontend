import type { HomeDashboardData, Opportunity, OpportunityActivity, OpportunityInput, OpportunityStage } from '../../domain/opportunity/opportunity'
import type { ContactDealer } from '../../domain/contact/contact'
import { HttpClient } from '../http/http-client'

export class HttpOpportunityRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async listDealers(): Promise<ContactDealer[]> {
    const result = await this.http.get<{ dealers: ContactDealer[] }>('/auth/contacts/dealers')
    return result.dealers
  }

  async dashboard(dealerId: string): Promise<HomeDashboardData> {
    return this.http.get<HomeDashboardData>(`/auth/dashboard?dealerId=${encodeURIComponent(dealerId)}`)
  }

  async list(dealerId: string): Promise<Opportunity[]> {
    const result = await this.http.get<{ opportunities: Opportunity[] }>(`/auth/opportunities?dealerId=${encodeURIComponent(dealerId)}`)
    return result.opportunities
  }

  async activity(dealerId: string, id: string): Promise<OpportunityActivity[]> {
    const result = await this.http.get<{ activity: OpportunityActivity[] }>(`/auth/opportunities/${encodeURIComponent(id)}/activity?dealerId=${encodeURIComponent(dealerId)}`)
    return result.activity
  }

  async create(input: OpportunityInput): Promise<Opportunity> {
    const result = await this.http.post<{ opportunity: Opportunity }>('/auth/opportunities', input)
    return result.opportunity
  }

  async update(dealerId: string, id: string, input: { stage?: OpportunityStage; assignedUserId?: string | null }): Promise<Opportunity> {
    const result = await this.http.patch<{ opportunity: Opportunity }>(`/auth/opportunities/${encodeURIComponent(id)}?dealerId=${encodeURIComponent(dealerId)}`, input)
    return result.opportunity
  }
}
