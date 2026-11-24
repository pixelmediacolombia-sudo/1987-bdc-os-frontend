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

const http = new HttpClient('/backend')
const authRepository = new HttpAuthRepository(http)
const dealerRepository = new HttpDealerRepository(http)
const auditRepository = new HttpAuditRepository(http)
const configurationRepository = new HttpDealerConfigurationRepository(http)
const systemHealthRepository = new HttpSystemHealthRepository(http)
const adminUserRepository = new HttpAdminUserRepository(http)

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
}
