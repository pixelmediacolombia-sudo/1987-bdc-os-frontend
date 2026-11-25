import { CreateDealerWithInvitation } from '../application/dealer/create-dealer'
import { ListDealers } from '../application/dealer/list-dealers'
import { InviteDealerMember } from '../application/dealer/invite-dealer-member'
import { DeleteDealer } from '../application/dealer/delete-dealer'
import { RenameDealer } from '../application/dealer/rename-dealer'
import { GetCurrentSession } from '../application/auth/get-current-session'
import { SignIn } from '../application/auth/sign-in'
import { SignOut } from '../application/auth/sign-out'
import { HttpAuthRepository } from '../infrastructure/auth/http-auth-repository'
import { HttpClient } from '../infrastructure/http/http-client'
import { HttpDealerRepository } from '../infrastructure/dealer/http-dealer-repository'
import { HttpAuditRepository } from '../infrastructure/admin-audit/http-audit-repository'
import { ListAuditEvents } from '../application/admin-audit/list-audit-events'
import { GetDealerConfiguration } from '../application/dealer/get-dealer-configuration'
import { HttpDealerConfigurationRepository } from '../infrastructure/dealer/http-dealer-configuration-repository'
import { GetSystemHealth } from '../application/system-health/get-system-health'
import { HttpSystemHealthRepository } from '../infrastructure/system-health/http-system-health-repository'
import { HttpAdminUserRepository } from '../infrastructure/admin-users/http-admin-user-repository'
import { ListAdminUsers } from '../application/admin-users/list-admin-users'
import { HttpContactRepository } from '../infrastructure/contacts/http-contact-repository'
import { HttpOpportunityRepository } from '../infrastructure/opportunities/http-opportunity-repository'

const http = new HttpClient('/backend')
const authRepository = new HttpAuthRepository(http)
const dealerRepository = new HttpDealerRepository(http)
const auditRepository = new HttpAuditRepository(http)
const configurationRepository = new HttpDealerConfigurationRepository(http)
const systemHealthRepository = new HttpSystemHealthRepository(http)
const adminUserRepository = new HttpAdminUserRepository(http)
const contactRepository = new HttpContactRepository(http)
const opportunityRepository = new HttpOpportunityRepository(http)

export const appServices = {
  auth: {
    getCurrentSession: new GetCurrentSession(authRepository),
    signIn: new SignIn(authRepository),
    signOut: new SignOut(authRepository),
  },
  dealers: {
    list: new ListDealers(dealerRepository),
    createWithInvitation: new CreateDealerWithInvitation(dealerRepository),
    inviteMember: new InviteDealerMember(dealerRepository),
    delete: new DeleteDealer(dealerRepository),
    rename: new RenameDealer(dealerRepository),
  },
  audit: { list: new ListAuditEvents(auditRepository) },
  configuration: { getDealer: new GetDealerConfiguration(configurationRepository) },
  systemHealth: { get: new GetSystemHealth(systemHealthRepository) },
  adminUsers: { list: new ListAdminUsers(adminUserRepository) },
  contacts: {
    listDealers: () => contactRepository.listDealers(),
    list: (dealerId: string, filters: import('../infrastructure/contacts/http-contact-repository').ContactFilters) => contactRepository.list(dealerId, filters),
    get: (dealerId: string, contactId: string) => contactRepository.get(dealerId, contactId),
    listConversations: (dealerId: string, filters: { search: string; channel: string }) => contactRepository.listConversations(dealerId, filters),
    listConversationAssignees: (dealerId: string) => contactRepository.listConversationAssignees(dealerId),
    updateConversation: (dealerId: string, conversationId: string, input: { assignedUserId?: string | null; isRead?: boolean }) => contactRepository.updateConversation(dealerId, conversationId, input),
    create: (input: import('../domain/contact/contact').ContactInput) => contactRepository.create(input),
    update: (dealerId: string, contactId: string, input: Omit<import('../domain/contact/contact').ContactInput, 'dealerId'>) => contactRepository.update(dealerId, contactId, input),
  },
  opportunities: {
    listDealers: () => opportunityRepository.listDealers(),
    dashboard: (dealerId: string) => opportunityRepository.dashboard(dealerId),
    list: (dealerId: string) => opportunityRepository.list(dealerId),
    activity: (dealerId: string, id: string) => opportunityRepository.activity(dealerId, id),
    create: (input: import('../domain/opportunity/opportunity').OpportunityInput) => opportunityRepository.create(input),
    update: (dealerId: string, id: string, input: { stage?: import('../domain/opportunity/opportunity').OpportunityStage; assignedUserId?: string | null }) => opportunityRepository.update(dealerId, id, input),
  },
}
