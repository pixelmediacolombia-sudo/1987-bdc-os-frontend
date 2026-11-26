import { useEffect, useMemo, useState } from 'react'
import LoginScreen from '../features/auth/LoginScreen'
import AdminDealerManager from '../features/admin/AdminDealerManager'
import { AdminOverview, DealerDirectory, DealerDetails } from '../features/admin/AdminWorkspace'
import AdminActivity from '../features/admin/AdminActivity'
import { AdminSystemHealth } from '../features/admin/AdminSystemHealth'
import { AdminUserDirectory } from '../features/admin/AdminUserDirectory'
import ContactsView from '../features/contacts/ContactsView'
import InboxView from '../features/inbox/InboxView'
import AppShell from '../layouts/AppShell'
import Icon from '../components/Icon'
import { navigationFor, sectionTitles, type Section } from './navigation'
import { appServices } from '../../core/container'
import { filterDealers, type CreateDealerInput, type Dealer, type DealerStatus } from '../../domain/dealer/dealer'
import type { AuthUser } from '../../domain/auth/auth-user'
import '../styles/App.css'
import '../styles/viewport-shell.css'
import '../styles/home-dashboard.css'
import HomeDashboard from '../features/home/HomeDashboard'
import OpportunitiesView from '../features/opportunities/OpportunitiesView'
import CalendarView from '../features/calendar/CalendarView'
import AutomationWorkflowsView from '../features/automations/AutomationWorkflowsView'

type DealerEntry = Dealer

const ACTIVE_SECTION_KEY = 'bdc-os:active-section:'

function defaultSectionFor(user: AuthUser): Section {
  return user.accountType === 'admin' ? 'Resumen' : 'Inicio'
}

function activeSectionFor(user: AuthUser): Section {
  const fallback = defaultSectionFor(user)
  try {
    const saved = window.sessionStorage.getItem(`${ACTIVE_SECTION_KEY}${user.id}`)
    if (saved && navigationFor(user.accountType).some((item) => item.name === saved)) return saved as Section
  } catch { /* Keep the default section when browser storage is unavailable. */ }
  return fallback
}

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-out' | 'signed-in'>('checking')
  const [authError, setAuthError] = useState('')
  const [active, setActive] = useState<Section>('Inicio')
  const [dealerStatusFilter, setDealerStatusFilter] = useState<'Todos' | DealerStatus>('Todos')
  const [search, setSearch] = useState('')
  const [dealers, setDealers] = useState<DealerEntry[]>([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [adminError, setAdminError] = useState('')
  const [adminRetryCount, setAdminRetryCount] = useState(0)
  const [selectedDealer, setSelectedDealer] = useState<DealerEntry | null>(null)
  const [creatingDealer, setCreatingDealer] = useState(false)
  function retryAdminLoad() {
    setAdminLoading(true)
    setAdminError('')
    setAdminRetryCount((count) => count + 1)
  }
  useEffect(() => {
    let mounted = true
    appServices.auth.getCurrentSession.execute().then((user) => {
      if (!mounted) return
      if (user) { setAuthUser(user); setActive(activeSectionFor(user)); setAuthStatus('signed-in') }
      else setAuthStatus('signed-out')
    }).catch(() => {
      if (mounted) { setAuthError('No pudimos conectar con el servicio de acceso. Revisa tu conexión e inténtalo de nuevo.'); setAuthStatus('signed-out') }
    })
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    if (!authUser) return
    const allowed = navigationFor(authUser.accountType).some((item) => item.name === active)
    if (!allowed) { setActive(defaultSectionFor(authUser)); return }
    try { window.sessionStorage.setItem(`${ACTIVE_SECTION_KEY}${authUser.id}`, active) } catch { /* Navigation still works without browser storage. */ }
  }, [authUser, active])
  useEffect(() => {
    if (authUser?.accountType !== 'admin') return
    let mounted = true
    appServices.dealers.list.execute().then((result) => {
      if (mounted) setDealers(result)
    }).catch((cause: unknown) => {
      if (mounted) setAdminError(cause instanceof Error ? cause.message : 'No pudimos conectar con BDC OS.')
    }).finally(() => { if (mounted) setAdminLoading(false) })
    return () => { mounted = false }
  }, [authUser, adminRetryCount])
  const visibleDealers = useMemo(() => filterDealers(dealers, { status: dealerStatusFilter, query: search }), [dealers, dealerStatusFilter, search])
  async function signIn(email: string, password: string) {
    setAuthError('')
    try {
      const user = await appServices.auth.signIn.execute(email, password)
      setAuthUser(user)
      setActive(activeSectionFor(user))
      setAuthStatus('signed-in')
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : 'No pudimos conectar con el servicio de acceso. Revisa tu conexión e inténtalo de nuevo.')
    }
  }
  async function signOut() {
    if (authUser) {
      try { window.sessionStorage.removeItem(`${ACTIVE_SECTION_KEY}${authUser.id}`) } catch { /* Ignore unavailable browser storage. */ }
    }
    await appServices.auth.signOut.execute()
    setAuthUser(null)
    setAuthStatus('signed-out')
    setActive('Inicio')
    setAdminLoading(true)
    setAdminError('')
  }
  if (authStatus === 'checking') return <main className="auth-loading" aria-live="polite"><img className="auth-logo" src="/bdc-os-crm.png" alt="BDC OS CRM" /><span>Verificando tu acceso…</span></main>
  if (authStatus !== 'signed-in' || !authUser) return <LoginScreen error={authError} onSubmit={signIn} />
  const isAdmin = authUser.accountType === 'admin'
  const nav = navigationFor(authUser.accountType)
  return <AppShell user={authUser} active={active} navigation={nav} search={search} isAdmin={isAdmin} onNavigate={setActive} onSearch={setSearch} onSignOut={() => void signOut()}>
        {isAdmin ? (active === 'Resumen' ? <AdminOverview dealers={dealers} loading={adminLoading} error={adminError} onRetry={retryAdminLoad} onCreateDealer={() => setCreatingDealer(true)} onViewAll={() => { setSearch(''); setDealerStatusFilter('Todos'); setActive('Dealers') }} onSelectDealer={setSelectedDealer} /> : active === 'Dealers' ? <DealerDirectory dealers={visibleDealers} total={dealers.length} loading={adminLoading} error={adminError} onRetry={retryAdminLoad} status={dealerStatusFilter} onStatusChange={setDealerStatusFilter} onCreateDealer={() => setCreatingDealer(true)} onSelectDealer={setSelectedDealer} /> : active === 'Usuarios' ? <AdminUserDirectory dealers={dealers} /> : active === 'Actividad' ? <AdminActivity dealers={dealers} /> : active === 'Configuración' ? <AdminSystemHealth /> : <section className="module-preview"><span className="preview-icon"><Icon name={nav.find((item) => item.name === active)?.icon ?? 'home'} size={21} /></span><p className="eyebrow">ADMINISTRACIÓN BDC OS</p><h1>{sectionTitles[active]}</h1><p>Esta vista se habilitará al conectar los servicios de administración del backend.</p><div><small>Alcance</small><strong>Preferencias generales y controles globales.</strong><span>Los datos de esta sección aún no están conectados.</span></div><button className="secondary" onClick={() => setActive('Resumen')}>Volver al resumen</button></section>) : active === 'Inicio' ? <HomeDashboard search={search} onNavigate={setActive} /> : active === 'Bandeja' ? <InboxView search={search} /> : active === 'Contactos' ? <ContactsView search={search} /> : active === 'Oportunidades' ? <OpportunitiesView search={search} /> : active === 'Calendario' ? <CalendarView search={search} /> : active === 'Automatizaciones' ? <AutomationWorkflowsView search={search} /> : <section className="module-preview"><span className="preview-icon"><Icon name={nav.find((item) => item.name === active)?.icon ?? 'home'} size={21} /></span><p className="eyebrow">BDC OS · PRIMERA ENTREGA</p><h1>{sectionTitles[active]}</h1><p>Esta sección se construirá por etapas, según los requerimientos de cada flujo y su contrato con el backend.</p><div><small>Siguiente paso</small><strong>Definir la vista, permisos y datos de {active.toLocaleLowerCase('es')}.</strong><span>Los endpoints y accesos de esta sección aún no están conectados.</span></div><button className="secondary" onClick={() => setActive('Inicio')}>Volver al inicio</button></section>}
    {isAdmin && creatingDealer && <AdminDealerManager onClose={() => setCreatingDealer(false)} onCreate={(input: CreateDealerInput) => appServices.dealers.createWithInvitation.execute(input)} onCreated={({ dealer }) => setDealers((items) => [dealer, ...items])} />}
    {isAdmin && selectedDealer && <DealerDetails dealer={selectedDealer} onClose={() => setSelectedDealer(null)} onInviteMember={(displayName, email) => appServices.dealers.inviteMember.execute({ dealerId: selectedDealer.id, displayName, email })} onInvited={() => { setSelectedDealer((dealer) => dealer ? { ...dealer, pendingInvitations: dealer.pendingInvitations + 1 } : dealer); retryAdminLoad() }} onRename={async (name) => { await appServices.dealers.rename.execute(selectedDealer.id, name); const updated = { ...selectedDealer, name, initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BD' }; setDealers((items) => items.map((dealer) => dealer.id === updated.id ? updated : dealer)); setSelectedDealer(updated) }} onDelete={async (dealerId) => { await appServices.dealers.delete.execute(dealerId); setDealers((items) => items.filter((dealer) => dealer.id !== dealerId)); setSelectedDealer(null) }} />}
  </AppShell>
}

export default App
