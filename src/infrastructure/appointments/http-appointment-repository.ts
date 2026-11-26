import type { Appointment, AppointmentInput, AppointmentStatus, AvailabilityEntry } from '../../domain/appointment/appointment'
import { HttpClient } from '../http/http-client'

export class HttpAppointmentRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) { this.http = http }

  availability(dealerId: string): Promise<{ availability: AvailabilityEntry[]; timeZone: string }> {
    return this.http.get(`/auth/calendar/availability?dealerId=${encodeURIComponent(dealerId)}`)
  }
  async saveAvailability(dealerId: string, availability: AvailabilityEntry[]): Promise<AvailabilityEntry[]> {
    const result = await this.http.put<{ availability: AvailabilityEntry[] }>(`/auth/calendar/availability?dealerId=${encodeURIComponent(dealerId)}`, { availability })
    return result.availability
  }
  list(dealerId: string, from: Date, to: Date): Promise<{ appointments: Appointment[]; timeZone: string }> {
    const query = new URLSearchParams({ dealerId, from: from.toISOString(), to: to.toISOString() })
    return this.http.get(`/auth/appointments?${query.toString()}`)
  }
  async create(input: AppointmentInput): Promise<Appointment> {
    const result = await this.http.post<{ appointment: Appointment }>('/auth/appointments', input)
    return result.appointment
  }
  async update(dealerId: string, id: string, input: { status?: AppointmentStatus; assignedUserId?: string | null; startsAtLocal?: string; endsAtLocal?: string; title?: string; location?: string | null; notes?: string | null; reminderMinutes?: number | null }): Promise<Appointment> {
    const result = await this.http.patch<{ appointment: Appointment }>(`/auth/appointments/${encodeURIComponent(id)}?dealerId=${encodeURIComponent(dealerId)}`, input)
    return result.appointment
  }
}
