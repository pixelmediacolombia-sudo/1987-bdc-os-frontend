import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import './App.css'

type Section = 'Inicio' | 'Bandeja' | 'Contactos' | 'Oportunidades' | 'Automatizaciones' | 'Calendario' | 'Reportes' | 'Configuración'
type Lead = { id: number; name: string; company: string; channel: string; summary: string; time: string; status: 'Prioridad' | 'Nuevo' | 'Seguimiento'; initials: string; tone: string }
type IconName = 'home' | 'inbox' | 'users' | 'pipeline' | 'automation' | 'calendar' | 'chart' | 'settings' | 'search' | 'plus' | 'arrow' | 'clock' | 'phone' | 'mail' | 'dots' | 'chevron' | 'close' | 'menu' | 'spark'

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" /></>, inbox: <><path d="M4 4h16v16H4zM4 14h4l2 2h4l2-2h4" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c.5-3.4 2.4-5 6-5s5.5 1.6 6 5m1-14a3 3 0 0 1 0 6m1 3c2.2.5 3.4 2 3.8 5" /></>,
  pipeline: <><rect x="3" y="4" width="6" height="6" rx="1" /><rect x="15" y="14" width="6" height="6" rx="1" /><path d="M9 7h3a3 3 0 0 1 3 3v4m-2-2 2 2 2-2" /></>,
  automation: <><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.9 4.9l2.8 2.8m8.6 8.6 2.8 2.8m0-14.2-2.8 2.8m-8.6 8.6-2.8 2.8" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 3h2" /></>, chart: <><path d="M4 20V4m0 16h16M7 15l4-4 3 2 5-6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19 13 2 1-2 4-2-1-2 1v2H9v-2l-2-1-2 1-2-4 2-1v-2l-2-1 2-4 2 1 2-1V4h6v2l2 1 2-1 2 4-2 1z" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>, plus: <><path d="M12 5v14M5 12h14" /></>, arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, phone: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M10 6h4m-3 12h2" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>, dots: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  spark: <><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6z" /></>,  chevron: <path d="m8 10 4 4 4-4" />, close: <><path d="m6 6 12 12M18 6 6 18" /></>, menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
}
function Icon({ name, size = 18 }: { name: IconName; size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg> }

const nav: { name: Section; icon: IconName; group: string }[] = [
  { name: 'Inicio', icon: 'home', group: 'Trabajo' }, { name: 'Bandeja', icon: 'inbox', group: 'Trabajo' }, { name: 'Contactos', icon: 'users', group: 'Trabajo' },
  { name: 'Oportunidades', icon: 'pipeline', group: 'Gestión' }, { name: 'Automatizaciones', icon: 'automation', group: 'Gestión' }, { name: 'Calendario', icon: 'calendar', group: 'Gestión' }, { name: 'Reportes', icon: 'chart', group: 'Gestión' }, { name: 'Configuración', icon: 'settings', group: 'Gestión' },
]
const copy: Record<Section, string> = { Inicio: 'Tu operación, en un solo lugar', Bandeja: 'Bandeja', Contactos: 'Contactos', Oportunidades: 'Oportunidades', Automatizaciones: 'Automatizaciones', Calendario: 'Calendario', Reportes: 'Reportes', Configuración: 'Configuración' }
const demo: Lead[] = [
  { id: 1, name: 'Laura Méndez', company: 'Dealer de muestra', channel: 'WhatsApp', summary: 'Pregunta por disponibilidad y opciones de financiación.', time: 'hace 4 min', status: 'Prioridad', initials: 'LM', tone: 'sand' },
  { id: 2, name: 'Andrés Rojas', company: 'Dealer de muestra', channel: 'Instagram', summary: 'Solicitó información sobre una SUV familiar.', time: 'hace 18 min', status: 'Nuevo', initials: 'AR', tone: 'lilac' },
  { id: 3, name: 'Valentina Cruz', company: 'Dealer de muestra', channel: 'Formulario web', summary: 'Dejó sus datos para agendar una prueba de manejo.', time: 'hace 36 min', status: 'Seguimiento', initials: 'VC', tone: 'mint' },
  { id: 4, name: 'Julián Torres', company: 'Dealer de muestra', channel: 'Facebook', summary: 'Tiene una pregunta pendiente de respuesta.', time: 'hace 52 min', status: 'Prioridad', initials: 'JT', tone: 'blue' },
  { id: 5, name: 'Mariana Ospina', company: 'Dealer de muestra', channel: 'WhatsApp', summary: 'Comparte el modelo que está buscando.', time: 'hace 1 h', status: 'Nuevo', initials: 'MO', tone: 'rose' },
]

function App() {
  const [active, setActive] = useState<Section>('Inicio')
  const [filter, setFilter] = useState<'Todo' | 'Prioridad' | 'Nuevos'>('Todo')
  const [search, setSearch] = useState('')
  const [leads, setLeads] = useState(demo)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [creating, setCreating] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const visible = useMemo(() => leads.filter((lead) => {
    const matchStatus = filter === 'Todo' || (filter === 'Prioridad' ? lead.status === 'Prioridad' : lead.status === 'Nuevo')
    const query = search.trim().toLocaleLowerCase('es')
    return matchStatus && (!query || `${lead.name} ${lead.channel} ${lead.summary}`.toLocaleLowerCase('es').includes(query))
  }), [filter, leads, search])
  function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name') ?? '').trim(); if (!name) return
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
    setLeads((items) => [{ id: Date.now(), name, company: 'Dealer de muestra', channel: String(data.get('channel')), summary: 'Nuevo registro agregado en esta sesión de demostración.', time: 'ahora', status: 'Nuevo', initials, tone: 'neutral' }, ...items]); setFilter('Todo'); setCreating(false)
  }
  return <div className="app-shell">
    {mobileNav && <button className="scrim" aria-label="Cerrar navegación" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}>
      <a href="#inicio" className="brand" onClick={(e) => { e.preventDefault(); setActive('Inicio'); setMobileNav(false) }} aria-label="BDC OS CRM inicio"><span>BDC</span><i>OS</i><small>CRM</small></a>
      <div className="workspace"><span className="workspace-mark">19</span><span><strong>1987 Marketing</strong><small>Espacio de trabajo</small></span><Icon name="chevron" size={15} /></div>
      <nav aria-label="Navegación principal">{['Trabajo', 'Gestión'].map((group) => <div className="nav-group" key={group}><p>{group}</p>{nav.filter((item) => item.group === group).map((item) => <button key={item.name} className={`nav-item ${active === item.name ? 'is-active' : ''}`} aria-current={active === item.name ? 'page' : undefined} onClick={() => { setActive(item.name); setMobileNav(false) }}><Icon name={item.icon} /><span>{item.name}</span>{item.name === 'Bandeja' && <b>8</b>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="team-line"><span className="team-faces"><i>CM</i><i>JR</i><i>+</i></span><span><strong>Equipo comercial</strong><small>3 integrantes</small></span><Icon name="dots" size={16} /></div><button className="profile" onClick={() => setActive('Configuración')}><i>CM</i><span><strong>Camila Martínez</strong><small>Administradora</small></span><Icon name="dots" size={16} /></button></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu" aria-label="Abrir navegación" onClick={() => setMobileNav(true)}><Icon name="menu" /></button><div className="breadcrumb"><span>Espacio de trabajo</span><i>/</i><strong>{active}</strong></div><label className="search"><Icon name="search" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contactos" aria-label="Buscar en el CRM" /><kbd>⌘ K</kbd></label><span className="demo-tag"><i /> Entorno de prueba</span><button className="top-avatar" aria-label="Perfil de Camila Martínez" onClick={() => setActive('Configuración')}>CM</button></header>
      <main className="content">
        {active === 'Inicio' ? <>
          <div className="page-heading"><div><p className="eyebrow">MIÉRCOLES, 19 DE NOVIEMBRE</p><h1>{copy[active]}</h1><p className="subtitle">Una vista clara para saber qué necesita atención y cuál es el siguiente paso.</p></div><button className="primary" onClick={() => setCreating(true)}><Icon name="plus" size={16} /> Nueva oportunidad</button></div>
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
        </> : <section className="module-preview"><span className="preview-icon"><Icon name={nav.find((item) => item.name === active)?.icon ?? 'home'} size={21} /></span><p className="eyebrow">BDC OS · PRIMERA ENTREGA</p><h1>{copy[active]}</h1><p>Esta sección se construirá por etapas, según los requerimientos de cada flujo y su contrato con el backend.</p><div><small>Siguiente paso</small><strong>Definir la vista, permisos y datos de {active.toLocaleLowerCase('es')}.</strong><span>Los endpoints y accesos de esta sección aún no están conectados.</span></div><button className="secondary" onClick={() => setActive('Inicio')}>Volver al inicio</button></section>}
      </main>
    </div>
    {creating && <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCreating(false) }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="create-title"><header><span className="dialog-icon"><Icon name="plus" size={16} /></span><button className="icon-button" aria-label="Cerrar" onClick={() => setCreating(false)}><Icon name="close" /></button></header><h2 id="create-title">Nueva oportunidad</h2><p>Registro temporal para probar la interfaz.</p><form onSubmit={addLead}><label>Nombre del contacto<input autoFocus name="name" required placeholder="Ej. Andrea Gómez" /></label><label>Canal de origen<select name="channel"><option>WhatsApp</option><option>Instagram</option><option>Facebook</option><option>Formulario web</option></select></label><small>El registro solo vive en esta sesión y desaparece al recargar.</small><div className="dialog-actions"><button type="button" className="secondary" onClick={() => setCreating(false)}>Cancelar</button><button className="primary">Crear en demo</button></div></form></section></div>}
    {selected && <div className="overlay drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null) }}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="contact-title"><div className="drawer-top"><span className="eyebrow">CONTACTO DE DEMOSTRACIÓN</span><button className="icon-button" aria-label="Cerrar detalle" onClick={() => setSelected(null)}><Icon name="close" /></button></div><span className={`drawer-avatar ${selected.tone}`}>{selected.initials}</span><h2 id="contact-title">{selected.name}</h2><p>{selected.company}</p><em className={`status status-${selected.status.toLowerCase()}`}><i />{selected.status === 'Prioridad' ? 'Atención prioritaria' : selected.status === 'Nuevo' ? 'Nuevo contacto' : 'Seguimiento'}</em><div className="drawer-actions"><button className="secondary"><Icon name="phone" size={15} /> Llamar</button><button className="primary"><Icon name="mail" size={15} /> Responder</button></div><hr /><span className="eyebrow">ÚLTIMA ACTIVIDAD</span><p className="drawer-summary">{selected.summary}</p><small>{selected.channel} · {selected.time}</small><div className="drawer-note">Los controles de contacto son de muestra y aún no envían mensajes.</div></aside></div>}
  </div>
}
function Activity({ icon, title, text, time }: { icon: IconName; title: string; text: string; time: string }) { return <div className="activity-item"><span><Icon name={icon} size={14} /></span><p><strong>{title}</strong><small>{text}</small><small>{time}</small></p></div> }
export default App
