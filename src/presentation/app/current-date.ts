const BDC_TIME_ZONE = 'America/Bogota'

export function formatCurrentDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: BDC_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date).toLocaleUpperCase('es-CO')
}
