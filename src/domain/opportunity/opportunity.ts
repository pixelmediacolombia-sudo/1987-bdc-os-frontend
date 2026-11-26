export type OpportunityStage = 'new' | 'working' | 'closing' | 'won' | 'lost'
export type OpportunityStageConfig = { stageKey: OpportunityStage; label: string; position: number }

export type Opportunity = {
  id: string
  dealerId: string
  title: string
  contactId: string | null
  contactName: string
  contactPhone: string | null
  amountCents: string
  stage: OpportunityStage
  assignedUserId: string | null
  assignedUserName: string | null
  expectedCloseDate: string | null
  notes: string | null
  nextAction: string | null
  nextActionAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export type OpportunityInput = {
  dealerId: string
  title: string
  contactId?: string | null
  contactName: string
  contactPhone?: string | null
  amountCents: number
  stage?: OpportunityStage
  assignedUserId?: string | null
  expectedCloseDate?: string | null
  notes?: string | null
  nextAction?: string | null
  nextActionAt?: string | null
}

export type OpportunityActivity = { id: string; action: string; summary: string; actorName: string; createdAt: string }

export type HomeDashboardData = {
  metrics: {
    unreadConversations: number
    newContacts: number
    activeOpportunities: number
    pipelineValueCents: string
  }
  attention: Array<{
    id: string
    contactId: string
    name: string
    channel: string
    lastActivity: string
    summary: string | null
  }>
  activities: Array<{
    id: string
    category: string
    action: string
    summary: string
    createdAt: string
  }>
}
