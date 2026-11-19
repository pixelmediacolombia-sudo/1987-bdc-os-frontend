import type { Lead } from '../../domain/crm/lead'

export const demoLeads: Lead[] = [
  { id: 1, name: 'Laura Méndez', company: 'Dealer de muestra', channel: 'WhatsApp', summary: 'Pregunta por disponibilidad y opciones de financiación.', time: 'hace 4 min', status: 'Prioridad', initials: 'LM', tone: 'sand' },
  { id: 2, name: 'Andrés Rojas', company: 'Dealer de muestra', channel: 'Instagram', summary: 'Solicitó información sobre una SUV familiar.', time: 'hace 18 min', status: 'Nuevo', initials: 'AR', tone: 'lilac' },
  { id: 3, name: 'Valentina Cruz', company: 'Dealer de muestra', channel: 'Formulario web', summary: 'Dejó sus datos para agendar una prueba de manejo.', time: 'hace 36 min', status: 'Seguimiento', initials: 'VC', tone: 'mint' },
  { id: 4, name: 'Julián Torres', company: 'Dealer de muestra', channel: 'Facebook', summary: 'Tiene una pregunta pendiente de respuesta.', time: 'hace 52 min', status: 'Prioridad', initials: 'JT', tone: 'blue' },
  { id: 5, name: 'Mariana Ospina', company: 'Dealer de muestra', channel: 'WhatsApp', summary: 'Comparte el modelo que está buscando.', time: 'hace 1 h', status: 'Nuevo', initials: 'MO', tone: 'rose' },
]
