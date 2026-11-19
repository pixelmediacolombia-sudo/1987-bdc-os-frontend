export type DealerStatus = 'Activo' | 'En incorporación' | 'Suspendido'
export type DealerRecord = { id: string; name: string; location: string; users: number; status: DealerStatus; updated: string; initials: string }
export type DealerApiRecord = { id: string; name: string; status: string; user_count: number; pending_invitation_count: number }

export function asDealerRecord(value: DealerApiRecord): DealerRecord {
  const status: DealerStatus = value.status === 'disabled' || value.status === 'suspended'
    ? 'Suspendido'
    : value.user_count === 0 && value.pending_invitation_count > 0
      ? 'En incorporación'
      : 'Activo'
  return {
    id: value.id,
    name: value.name,
    location: 'Cuenta BDC OS',
    users: Number(value.user_count),
    status,
    updated: value.pending_invitation_count > 0 ? 'Invitación pendiente' : 'Cuenta registrada',
    initials: value.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BD',
  }
}

export function mapDealerRecords(values: DealerApiRecord[]): DealerRecord[] {
  return values.map(asDealerRecord)
}
