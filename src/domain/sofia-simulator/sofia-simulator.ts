export type SofiaSimulatorStatus = {
  enabled: boolean
  localOnly: boolean
  sendsMessages: false
  contactName: string
  modelMode: string
  modelHost: string | null
}

export type SofiaSimulatorMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  content: string
  createdAt: string
}

export type SofiaSimulatorTurn = {
  conversationId: string
  contact: { name: string; providerContactId: string }
  messages: SofiaSimulatorMessage[]
  sofia: {
    response: string
    facts: Record<string, string | number | boolean | undefined>
    leadLevel: 'A' | 'B' | 'C'
    nextStep?: 'ask' | 'handoff' | 'follow_up' | 'none'
  }
  openai: {
    status: 'ok' | 'fallback'
    extraction: { facts: Record<string, unknown>; intent: string; missingFields: string[] } | null
    modelFacts: Record<string, string | number | boolean | undefined>
    safetyIssues: string[]
    responseSource: 'deterministic_rule'
  }
}

export function simulatorFactLabel(key: string) {
  const labels: Record<string, string> = {
    vehicle_category: 'Tipo de vehículo',
    vehicle_model_interest: 'Modelo de interés',
    down_payment_declared: 'Enganche declarado',
    has_trade_in: 'Vehículo para entregar',
    purchase_timeline: 'Fecha de compra',
    first_time_buyer: 'Primera compra',
  }
  return labels[key] ?? key.replaceAll('_', ' ')
}
