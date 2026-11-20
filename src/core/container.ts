import { CreateDealerWithInvitation } from '../application/dealer/create-dealer'
import { ListDealers } from '../application/dealer/list-dealers'
import { InviteDealerMember } from '../application/dealer/invite-dealer-member'
import { DeleteDealer } from '../application/dealer/delete-dealer'
import { GetCurrentSession } from '../application/auth/get-current-session'
import { SignIn } from '../application/auth/sign-in'
import { SignOut } from '../application/auth/sign-out'
import { HttpAuthRepository } from '../infrastructure/auth/http-auth-repository'
import { HttpClient } from '../infrastructure/http/http-client'
import { HttpDealerRepository } from '../infrastructure/dealer/http-dealer-repository'
import { HttpAuditRepository } from '../infrastructure/admin-audit/http-audit-repository'
import { ListAuditEvents } from '../application/admin-audit/list-audit-events'

const http = new HttpClient('/backend')
const authRepository = new HttpAuthRepository(http)
const dealerRepository = new HttpDealerRepository(http)
const auditRepository = new HttpAuditRepository(http)

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
  },
  audit: { list: new ListAuditEvents(auditRepository) },
}
