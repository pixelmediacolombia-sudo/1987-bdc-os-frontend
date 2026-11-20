export type DealerConfiguration = {
  dealer: { id: string; name: string | null; status: string; timezone: string | null; ghlLocationId: string | null }
  policy: { version: string | null; financialPolicyKeys: string[] }
  flags: {
    sofiaEnabled: boolean
    qualificationFlowEnabled: boolean
    qualificationSignalEnabled: boolean
    metaCapiEnabled: boolean
    conversationAiShadowEnabled: boolean
    conversationAiSendEnabled: boolean
    facebookPageConfigured: boolean
  }
  integrations: {
    ghl: {
      status: 'connected' | 'degraded' | 'revoked' | 'not_connected'
      locationId: string | null
      scopes: string[]
      hasStoredAccessToken: boolean
      hasStoredRefreshToken: boolean
      tokenExpiresAt: string | null
      connectedAt: string | null
      updatedAt: string | null
      lastVerifiedAt: string | null
    }
    metaCapi: {
      enabled: boolean
      status: 'disabled' | 'incomplete' | 'configured'
      credentialSource: 'dealer' | 'environment' | 'none'
      hasCredential: boolean
      datasetId: string | null
      eventName: string
      testEventCodeConfigured: boolean
      lastEventStatus: string | null
      lastEventAt: string | null
    }
  }
}
