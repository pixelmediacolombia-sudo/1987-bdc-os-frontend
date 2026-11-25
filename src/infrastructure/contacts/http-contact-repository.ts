import type { ContactDealer, ContactDetail, ContactInput, ContactSummary, InboxConversation } from '../../domain/contact/contact'
import { HttpClient } from '../http/http-client'

type DealerResponse = { dealers: ContactDealer[] }
type ContactListResponse = { contacts: ContactSummary[]; total: number; limit: number; offset: number }
type ContactDetailResponse = { contact: ContactDetail }
type ContactCreateResponse = { contact: ContactSummary }
type ContactUpdateResponse = { contact: ContactSummary }
type InboxListResponse = { conversations: InboxConversation[]; total: number; limit: number; offset: number }
export type ContactFilters = { search: string; channel: string; consentState: string; sort: 'recent' | 'name'; limit: number; offset: number }

export class HttpContactRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async listDealers(): Promise<ContactDealer[]> {
    const result = await this.http.get<DealerResponse>('/auth/contacts/dealers')
    return result.dealers
  }

  list(dealerId: string, filters: ContactFilters): Promise<ContactListResponse> {
    const query = new URLSearchParams({ dealerId, limit: String(filters.limit), offset: String(filters.offset), sort: filters.sort })
    if (filters.search.trim()) query.set('search', filters.search.trim())
    if (filters.channel) query.set('channel', filters.channel)
    if (filters.consentState) query.set('consentState', filters.consentState)
    return this.http.get<ContactListResponse>(`/auth/contacts?${query.toString()}`)
  }

  async get(dealerId: string, contactId: string): Promise<ContactDetail> {
    const query = new URLSearchParams({ dealerId })
    const result = await this.http.get<ContactDetailResponse>(`/auth/contacts/${encodeURIComponent(contactId)}?${query.toString()}`)
    return result.contact
  }

  listConversations(dealerId: string, filters: { search: string; channel: string }): Promise<InboxListResponse> {
    const query = new URLSearchParams({ dealerId, limit: '100', offset: '0' })
    if (filters.search.trim()) query.set('search', filters.search.trim())
    if (filters.channel) query.set('channel', filters.channel)
    return this.http.get<InboxListResponse>(`/auth/conversations?${query.toString()}`)
  }

  async create(input: ContactInput): Promise<ContactSummary> {
    const result = await this.http.post<ContactCreateResponse>('/auth/contacts', input)
    return result.contact
  }

  async update(dealerId: string, contactId: string, input: Omit<ContactInput, 'dealerId'>): Promise<ContactSummary> {
    const result = await this.http.patch<ContactUpdateResponse>(`/auth/contacts/${encodeURIComponent(contactId)}?dealerId=${encodeURIComponent(dealerId)}`, input)
    return result.contact
  }
}
