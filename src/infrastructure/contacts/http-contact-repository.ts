import type { ContactDealer, ContactDetail, ContactSummary } from '../../domain/contact/contact'
import { HttpClient } from '../http/http-client'

type DealerResponse = { dealers: ContactDealer[] }
type ContactListResponse = { contacts: ContactSummary[]; total: number; limit: number; offset: number }
type ContactDetailResponse = { contact: ContactDetail }

export class HttpContactRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async listDealers(): Promise<ContactDealer[]> {
    const result = await this.http.get<DealerResponse>('/auth/contacts/dealers')
    return result.dealers
  }

  list(dealerId: string, search: string): Promise<ContactListResponse> {
    const query = new URLSearchParams({ dealerId, limit: '50', offset: '0' })
    if (search.trim()) query.set('search', search.trim())
    return this.http.get<ContactListResponse>(`/auth/contacts?${query.toString()}`)
  }

  async get(dealerId: string, contactId: string): Promise<ContactDetail> {
    const query = new URLSearchParams({ dealerId })
    const result = await this.http.get<ContactDetailResponse>(`/auth/contacts/${encodeURIComponent(contactId)}?${query.toString()}`)
    return result.contact
  }
}
