import { useState, type ReactNode } from 'react'
import type { AuthUser } from '../../domain/auth/auth-user'
import Icon from '../components/Icon'
import type { NavigationItem, Section } from '../app/navigation'

type AppShellProps = {
  user: AuthUser
  active: Section
  navigation: NavigationItem[]
  search: string
  isAdmin: boolean
  children: ReactNode
  onNavigate: (section: Section) => void
  onSearch: (value: string) => void
  onSignOut: () => void
}

export default function AppShell({ user, active, navigation, search, isAdmin, children, onNavigate, onSearch, onSignOut }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const userInitials = user.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BD'

  function navigate(section: Section) {
    onNavigate(section)
    setMobileNavOpen(false)
  }

  return <div className="app-shell">
    {mobileNavOpen && <button className="scrim" aria-label="Cerrar navegación" onClick={() => setMobileNavOpen(false)} />}
    <aside className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`}>
      <a href="#inicio" className="brand" onClick={(event) => { event.preventDefault(); navigate(isAdmin ? 'Resumen' : 'Inicio') }} aria-label="BDC OS CRM inicio"><img src="/bdc-os-crm.png" alt="BDC OS CRM" /></a>
      <div className="workspace"><span className="workspace-mark">19</span><span><strong>{isAdmin ? 'BDC OS' : '1987 Marketing'}</strong><small>{isAdmin ? 'Administración global' : 'Espacio de trabajo'}</small></span><Icon name="chevron" size={15} /></div>
      <nav aria-label="Navegación principal">{[...new Set(navigation.map((item) => item.group))].map((group) => <div className="nav-group" key={group}><p>{group}</p>{navigation.filter((item) => item.group === group).map((item) => <button key={item.name} className={`nav-item ${active === item.name ? 'is-active' : ''}`} aria-current={active === item.name ? 'page' : undefined} onClick={() => navigate(item.name)}><Icon name={item.icon} /><span>{item.name}</span>{item.name === 'Bandeja' && <b>8</b>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="team-line"><span className="team-faces"><i>{userInitials}</i><i>+</i></span><span><strong>{isAdmin ? 'Operación BDC OS' : 'Equipo comercial'}</strong><small>{isAdmin ? 'Todos los dealers' : 'Espacio local'}</small></span><Icon name="dots" size={16} /></div><button className="profile" onClick={onSignOut} aria-label="Cerrar sesión"><i>{userInitials}</i><span><strong>{user.displayName}</strong><small>{isAdmin ? 'Administrador global' : 'Usuario de dealer'}</small></span><span className="logout-label">Salir</span></button></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu" aria-label="Abrir navegación" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button><div className="breadcrumb"><span>{isAdmin ? 'Administración' : 'Espacio de trabajo'}</span><i>/</i><strong>{active}</strong></div><label className="search"><Icon name="search" size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={isAdmin ? 'Buscar dealers' : 'Buscar contactos'} aria-label={isAdmin ? 'Buscar dealers' : 'Buscar en el CRM'} /><kbd>⌘ K</kbd></label><span className="demo-tag"><i /> {isAdmin ? 'Vista de muestra' : 'Entorno de prueba'}</span><button className="top-avatar" aria-label={`Perfil de ${user.displayName}`} onClick={() => navigate('Configuración')}>{userInitials}</button></header>
      <main className="content">{children}</main>
    </div>
  </div>
}
