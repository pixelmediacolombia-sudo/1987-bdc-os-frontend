export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export type Appointment = {
  id: string
  dealerId: string
  contactId: string | null
  opportunityId: string | null
  assignedUserId: string | null
  assignedUserName: string | null
  title: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  location: string | null
  notes: string | null
  reminderMinutes: number | null
  reminderAt: string | null
  createdAt: string
  updatedAt: string
}

export type AvailabilityEntry = { weekday: number; isAvailable: boolean; opensAt: string | null; closesAt: string | null }
export type AppointmentInput = {
  dealerId: string
  title: string
  contactId?: string | null
  opportunityId?: string | null
  assignedUserId?: string | null
  startsAtLocal: string
  endsAtLocal: string
  location?: string | null
  notes?: string | null
  reminderMinutes?: number | null
}
