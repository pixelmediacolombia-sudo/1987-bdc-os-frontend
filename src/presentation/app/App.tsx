import { useEffect, useMemo, useState, type FormEvent } from 'react'
import LoginScreen from '../features/auth/LoginScreen'
import AdminDealerManager from '../features/admin/AdminDealerManager'
import { AdminOverview, DealerDirectory, DealerDetails } from '../features/admin/AdminWorkspace'
import AdminActivity from '../features/admin/AdminActivity'
import { AdminSystemHealth } from '../features/admin/AdminSystemHealth'
import { AdminUserDirectory } from '../features/admin/AdminUserDirectory'
import ContactsView from '../features/contacts/ContactsView'
import LocalSofiaSimulatorView from '../features/local-sofia-simulator/LocalSofiaSimulatorView'
import AppShell from '../layouts/AppShell'
import Icon from '../components/Icon'
import { navigationFor, sectionTitles, type IconName, type Section } from './navigation'
import { appServices } from '../../core/container'
import { filterDealers, type CreateDealerInput, type Dealer, type DealerStatus } from '../../domain/dealer/dealer'
import { filterLeads, type Lead } from '../../domain/crm/lead'
import type { AuthUser } from '../../domain/auth/auth-user'
import { demoLeads } from '../../infrastructure/demo/leads'
import '../styles/App.css'

type DemoDealer = Dealer
function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-out' | 'signed-in'>('checking')
  const [authError, setAuthError] = useState('')
  const [active, setActive] = useState<Section>('Inicio')
  const [filter, setFilter] = useState<'Todo' | 'Prioridad' | 'Nuevos'>('Todo')
  const [dealerStatusFilter, setDealerStatusFilter] = useState<'Todos' | DealerStatus>('Todos')
  const [search, setSearch] = useState('')
  const [leads, setLeads] = useState(demoLeads)
  const [dealers, setDealers] = useState<DemoDealer[]>([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [adminError, setAdminError] = useState('')
  const [adminRetryCount, setAdminRetryCount] = useState(0)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [selectedDealer, setSelectedDealer] = useState<DemoDealer | null>(null)
  const [creating, setCreating] = useState(false)
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
      if (user) { setAuthUser(user); setActive(user.accountType === 'admin' ? 'Resumen' : 'Inicio'); setAuthStatus('signed-in') }
      else setAuthStatus('signed-out')
    }).catch(() => {
      if (mounted) { setAuthError('No pudimos conectar con el servicio de acceso. Revisa que el backend local esté activo.'); setAuthStatus('signed-out') }
    })
    return () => { mounted = false }
  }, [])
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
  const visible = useMemo(() => filterLeads(leads, { status: filter, query: search }), [filter, leads, search])
  const visibleDealers = useMemo(() => filterDealers(dealers, { status: dealerStatusFilter, query: search }), [dealers, dealerStatusFilter, search])
  async function signIn(email: string, password: string) {
    setAuthError('')
    try {
      const user = await appServices.auth.signIn.execute(email, password)
      setAuthUser(user)
      setActive(user.accountType === 'admin' ? 'Resumen' : 'Inicio')
      setAuthStatus('signed-in')
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : 'No pudimos conectar con el servicio de acceso. Revisa que el backend local esté activo.')
    }
  }
  async function signOut() {
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
  const localSimulatorEnabled = import.meta.env.DEV || import.meta.env.VITE_LOCAL_SOFIA_SIMULATOR === 'true'
  const nav = navigationFor(authUser.accountType, localSimulatorEnabled)
  function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name') ?? '').trim(); if (!name) return
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
    setLeads((items) => [{ id: Date.now(), name, company: 'Dealer de muestra', channel: String(data.get('channel')), summary: 'Nuevo registro agregado en esta sesión de demostración.', time: 'ahora', status: 'Nuevo', initials, tone: 'neutral' }, ...items]); setFilter('Todo'); setCreating(false)
  }
  return <AppShell user={authUser} active={active} navigation={nav} search={search} isAdmin={isAdmin} onNavigate={setActive} onSearch={setSearch} onSignOut={() => void signOut()}>
        {isAdmin ? (active === 'Simulador Sofia' ? <LocalSofiaSimulatorView /> : active === 'Resumen' ? <AdminOverview dealers={dealers} loading={adminLoading} error={adminError} onRetry={retryAdminLoad} onCreateDealer={() => setCreatingDealer(true)} onViewAll={() => { setSearch(''); setDealerStatusFilter('Todos'); setActive('Dealers') }} onSelectDealer={setSelectedDealer} /> : active === 'Dealers' ? <DealerDirectory dealers={visibleDealers} total={dealers.length} loading={adminLoading} error={adminError} onRetry={retryAdminLoad} status={dealerStatusFilter} onStatusChange={setDealerStatusFilter} onCreateDealer={() => setCreatingDealer(true)} onSelectDealer={setSelectedDealer} /> : active === 'Usuarios' ? <AdminUserDirectory dealers={dealers} /> : active === 'Actividad' ? <AdminActivity dealers={dealers} /> : active === 'Configuración' ? <AdminSystemHealth /> : <section className="module-preview"><span className="preview-icon"><Icon name={nav.find((item) => item.name === active)?.icon ?? 'home'} size={21} /></span><p className="eyebrow">ADMINISTRACIÓN BDC OS</p><h1>{sectionTitles[active]}</h1><p>Esta vista se habilitará al conectar los servicios de administración del backend.</p><div><small>Alcance</small><strong>Preferencias generales y controles globales.</strong><span>Los datos de esta sección aún no están conectados.</span></div><button className="secondary" onClick={() => setActive('Resumen')}>Volver al resumen</button></section>) : active === 'Inicio' ? <>
          <div className="page-heading"><div><p className="eyebrow">MIÉRCOLES, 19 DE NOVIEMBRE</p><h1>{sectionTitles[active]}</h1><p className="subtitle">Una vista clara para saber qué necesita atención y cuál es el siguiente paso.</p></div><button className="primary" onClick={() => setCreating(true)}><Icon name="plus" size={16} /> Nueva oportunidad</button></div>
          <section className="metrics" aria-label="Indicadores de demostración">
            <article className="metric metric-feature"><div className="metric-top"><span className="metric-icon dark"><Icon name="inbox" size={16} /></span><span>requieren seguimiento</span><b>DEMO</b></div><div className="metric-number"><strong>08</strong><span>Conversaciones pendientes</span></div><div className="metric-foot"><span className="bars">▂ ▄ ▆ ▃ ▇ ▅ ▆ ▄ ▇</span>2 con prioridad alta</div></article>
            <article className="metric"><div className="metric-top"><span className="metric-icon"><Icon name="users" size={16} /></span><span>este mes</span></div><strong className="small-number">24</strong><b className="metric-title">Nuevos contactos</b><small>Información de muestra</small></article>
            <article className="metric"><div className="metric-top"><span className="metric-icon"><Icon name="clock" size={16} /></span><span>pendientes de hoy</span></div><strong className="small-number">03</strong><b className="metric-title">Tareas por completar</b><small>No conectado a datos reales</small></article>
            <article className="metric pipeline-metric"><div className="metric-top"><span className="metric-icon"><Icon name="pipeline" size={16} /></span><span>Pipeline de muestra</span></div><div className="potential"><strong>$128.4<small>k</small></strong><span>valor potencial</span></div><div className="stage-track"><i /><i /><i /><i /></div><div className="stage-labels"><span>Nuevo</span><span>En proceso</span><span>Cierre</span></div></article>
          </section>
          <div className="content-grid"><section className="panel queue" aria-labelledby="queue-title"><div className="panel-heading"><div><div className="title-count"><h2 id="queue-title">Necesitan tu atención</h2><b>{visible.length}</b></div><p>Personas con una conversación o tarea pendiente</p></div><button className="link-button" onClick={() => setActive('Bandeja')}>Ver bandeja <Icon name="arrow" size={14} /></button></div>
            <div className="filter-row"><div className="filters" role="group" aria-label="Filtrar contactos">{(['Todo', 'Prioridad', 'Nuevos'] as const).map((item) => <button key={item} className={filter === item ? 'selected' : ''} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}{item === 'Prioridad' && <i />}</button>)}</div><button className="date-filter"><Icon name="calendar" size={14} /> Últimos 7 días <Icon name="chevron" size={14} /></button></div>
            <div className="lead-list">{visible.length ? visible.map((lead) => <button className="lead-row" key={lead.id} onClick={() => setSelected(lead)}><span className={`lead-avatar ${lead.tone}`}>{lead.initials}</span><span className="lead-copy"><span className="lead-name"><strong>{lead.name}</strong><em className={`status status-${lead.status.toLowerCase()}`}><i />{lead.status === 'Prioridad' ? 'Atención prioritaria' : lead.status === 'Nuevo' ? 'Nuevo contacto' : 'Seguimiento'}</em></span><span className="lead-summary">{lead.summary}</span><span className="lead-meta">{lead.channel}<i />{lead.time}</span></span><span className="row-arrow"><Icon name="arrow" size={15} /></span></button>) : <div className="empty"><Icon name="search" size={18} /><strong>No encontramos resultados</strong><span>Prueba otro nombre o filtro.</span></div>}</div>
            <button className="queue-footer" onClick={() => setActive('Bandeja')}>Ir a la bandeja completa <Icon name="arrow" size={14} /></button>
          </section><aside className="side-column"><section className="panel next"><div className="panel-heading compact"><div><h2>Tu siguiente paso</h2><p>Una sugerencia para hoy</p></div><span className="sparkle"><Icon name="spark" size={15} /></span></div><div className="next-copy"><small>PRIORIDAD DEL EQUIPO</small><h3>Responde primero a los contactos que esperan desde ayer.</h3><p>Dos conversaciones de muestra llevan más tiempo sin respuesta.</p><button className="link-button" onClick={() => setFilter('Prioridad')}>Revisar prioridades <Icon name="arrow" size={14} /></button></div></section>
            <section className="panel activity"><div className="panel-heading compact"><div><h2>Actividad reciente</h2><p>Resumen de demostración</p></div><button className="icon-button" aria-label="Más opciones"><Icon name="dots" /></button></div><div className="activity-list"><Activity icon="users" title="Nuevo contacto" text="Laura Méndez llegó por WhatsApp" time="hace 4 min" /><Activity icon="calendar" title="Cita solicitada" text="Prueba de manejo · dealer demo" time="hace 26 min" /><Activity icon="phone" title="Seguimiento agendado" text="Camila · oportunidad de muestra" time="hace 48 min" /></div></section></aside></div>
          <footer className="disclaimer"><b>Entorno de prueba</b><i /> Los indicadores y contactos son ficticios. Esta pantalla todavía no consulta datos del backend.</footer>
        </> : active === 'Contactos' ? <ContactsView search={search} /> : active === 'Simulador Sofia' ? <LocalSofiaSimulatorView /> : <section className="module-preview"><span className="preview-icon"><Icon name={nav.find((item) => item.name === active)?.icon ?? 'home'} size={21} /></span><p className="eyebrow">BDC OS · PRIMERA ENTREGA</p><h1>{sectionTitles[active]}</h1><p>Esta sección se construirá por etapas, según los requerimientos de cada flujo y su contrato con el backend.</p><div><small>Siguiente paso</small><strong>Definir la vista, permisos y datos de {active.toLocaleLowerCase('es')}.</strong><span>Los endpoints y accesos de esta sección aún no están conectados.</span></div><button className="secondary" onClick={() => setActive('Inicio')}>Volver al inicio</button></section>}
    {creating && <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCreating(false) }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="create-title"><header><span className="dialog-icon"><Icon name="plus" size={16} /></span><button className="icon-button" aria-label="Cerrar" onClick={() => setCreating(false)}><Icon name="close" /></button></header><h2 id="create-title">Nueva oportunidad</h2><p>Registro temporal para probar la interfaz.</p><form onSubmit={addLead}><label>Nombre del contacto<input autoFocus name="name" required placeholder="Ej. Andrea Gómez" /></label><label>Canal de origen<select name="channel"><option>WhatsApp</option><option>Instagram</option><option>Facebook</option><option>Formulario web</option></select></label><small>El registro solo vive en esta sesión y desaparece al recargar.</small><div className="dialog-actions"><button type="button" className="secondary" onClick={() => setCreating(false)}>Cancelar</button><button className="primary">Crear en demo</button></div></form></section></div>}
    {selected && <div className="overlay drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null) }}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="contact-title"><div className="drawer-top"><span className="eyebrow">CONTACTO DE DEMOSTRACIÓN</span><button className="icon-button" aria-label="Cerrar detalle" onClick={() => setSelected(null)}><Icon name="close" /></button></div><span className={`drawer-avatar ${selected.tone}`}>{selected.initials}</span><h2 id="contact-title">{selected.name}</h2><p>{selected.company}</p><em className={`status status-${selected.status.toLowerCase()}`}><i />{selected.status === 'Prioridad' ? 'Atención prioritaria' : selected.status === 'Nuevo' ? 'Nuevo contacto' : 'Seguimiento'}</em><div className="drawer-actions"><button className="secondary"><Icon name="phone" size={15} /> Llamar</button><button className="primary"><Icon name="mail" size={15} /> Responder</button></div><hr /><span className="eyebrow">ÚLTIMA ACTIVIDAD</span><p className="drawer-summary">{selected.summary}</p><small>{selected.channel} · {selected.time}</small><div className="drawer-note">Los controles de contacto son de muestra y aún no envían mensajes.</div></aside></div>}
    {isAdmin && creatingDealer && <AdminDealerManager onClose={() => setCreatingDealer(false)} onCreate={(input: CreateDealerInput) => appServices.dealers.createWithInvitation.execute(input)} onCreated={({ dealer }) => setDealers((items) => [dealer, ...items])} />}
    {isAdmin && selectedDealer && <DealerDetails dealer={selectedDealer} onClose={() => setSelectedDealer(null)} onInviteMember={(displayName, email) => appServices.dealers.inviteMember.execute({ dealerId: selectedDealer.id, displayName, email })} onInvited={() => { setSelectedDealer((dealer) => dealer ? { ...dealer, pendingInvitations: dealer.pendingInvitations + 1 } : dealer); retryAdminLoad() }} onRename={async (name) => { await appServices.dealers.rename.execute(selectedDealer.id, name); const updated = { ...selectedDealer, name, initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BD' }; setDealers((items) => items.map((dealer) => dealer.id === updated.id ? updated : dealer)); setSelectedDealer(updated) }} onDelete={async (dealerId) => { await appServices.dealers.delete.execute(dealerId); setDealers((items) => items.filter((dealer) => dealer.id !== dealerId)); setSelectedDealer(null) }} />}
  </AppShell>
}

function Activity({ icon, title, text, time }: { icon: IconName; title: string; text: string; time: string }) { return <div className="activity-item"><span><Icon name={icon} size={14} /></span><p><strong>{title}</strong><small>{text}</small><small>{time}</small></p></div> }
export default App
