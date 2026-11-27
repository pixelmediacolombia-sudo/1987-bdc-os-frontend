import type { AccountType } from '../../domain/auth/auth-user'

export type Section = 'Resumen' | 'Dealers' | 'Usuarios' | 'Actividad' | 'Inicio' | 'Bandeja' | 'Contactos' | 'Oportunidades' | 'Automatizaciones' | 'Calendario' | 'Reportes' | 'Configuración'

export type IconName = 'home' | 'inbox' | 'users' | 'pipeline' | 'target' | 'workflow' | 'calendar' | 'chart' | 'settings' | 'search' | 'plus' | 'arrow' | 'arrow-left' | 'clock' | 'phone' | 'mail' | 'dots' | 'chevron' | 'close' | 'menu' | 'spark'

export type NavigationItem = { name: Section; icon: IconName; group: string }

const dealerNavigation: NavigationItem[] = [
  { name: 'Inicio', icon: 'home', group: 'Trabajo' },
  { name: 'Bandeja', icon: 'inbox', group: 'Trabajo' },
  { name: 'Contactos', icon: 'users', group: 'Trabajo' },
  { name: 'Oportunidades', icon: 'target', group: 'Gestión' },
  { name: 'Automatizaciones', icon: 'workflow', group: 'Gestión' },
  { name: 'Calendario', icon: 'calendar', group: 'Gestión' },
  { name: 'Reportes', icon: 'chart', group: 'Gestión' },
  { name: 'Configuración', icon: 'settings', group: 'Gestión' },
]

const adminNavigation: NavigationItem[] = [
  { name: 'Resumen', icon: 'home', group: 'Administración' },
  { name: 'Dealers', icon: 'users', group: 'Administración' },
  { name: 'Usuarios', icon: 'users', group: 'Plataforma' },
  { name: 'Actividad', icon: 'clock', group: 'Plataforma' },
  { name: 'Configuración', icon: 'settings', group: 'Plataforma' },
]

export const sectionTitles: Record<Section, string> = {
  Resumen: 'Administración de dealers',
  Dealers: 'Directorio de dealers',
  Usuarios: 'Usuarios de la plataforma',
  Actividad: 'Actividad de la plataforma',
  Inicio: 'Tu operación, en un solo lugar',
  Bandeja: 'Bandeja',
  Contactos: 'Contactos',
  Oportunidades: 'Oportunidades',
  Automatizaciones: 'Automatizaciones',
  Calendario: 'Calendario',
  Reportes: 'Reportes',
  Configuración: 'Configuración',
}

export function navigationFor(accountType: AccountType): NavigationItem[] {
  return accountType === 'admin' ? adminNavigation : dealerNavigation
}
