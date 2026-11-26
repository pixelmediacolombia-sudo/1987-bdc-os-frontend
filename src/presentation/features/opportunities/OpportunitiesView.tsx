import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Opportunity, OpportunityStage, OpportunityStageConfig } from '../../../domain/opportunity/opportunity'
import type { ContactSummary, InboxAssignee } from '../../../domain/contact/contact'
import { contactLabel } from '../../../domain/contact/contact'
import { appServices } from '../../../core/container'
import Icon from '../../components/Icon'
import './opportunities.css'
import './opportunity-contact-link.css'

const defaultStages: OpportunityStageConfig[] = [
  { stageKey: 'new', label: 'Nuevo', position: 0 }, { stageKey: 'working', label: 'En proceso', position: 1 },
  { stageKey: 'closing', label: 'Cierre', position: 2 }, { stageKey: 'won', label: 'Ganada', position: 3 }, { stageKey: 'lost', label: 'Perdida', position: 4 },
]
const money = (cents: string) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(cents || 0) / 100)
type Props = { search: string }

export default function OpportunitiesView({ search }: Props) {
  const [dealerId, setDealerId] = useState('')
  const [items, setItems] = useState<Opportunity[]>([])
  const [stages, setStages] = useState<OpportunityStageConfig[]>(defaultStages)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assignees, setAssignees] = useState<InboxAssignee[]>([])
  const [contactChoices, setContactChoices] = useState<ContactSummary[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contactLoadError, setContactLoadError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionEditingId, setActionEditingId] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<string, Array<{ id: string; summary: string; actorName: string; createdAt: string }>>>({})
  const [showArchived, setShowArchived] = useState(false)
  const [configuringStages, setConfiguringStages] = useState(false)
  const [stageDraft, setStageDraft] = useState<OpportunityStageConfig[]>(defaultStages)

  async function load() {
    setLoading(true); setError('')
    try {
      const dealers = await appServices.opportunities.listDealers()
      const current = dealers[0]?.id ?? ''
      setDealerId(current)
      if (!current) { setItems([]); return }
      const [opportunities, availableAssignees, configuredStages] = await Promise.all([
        appServices.opportunities.list(current, showArchived), appServices.contacts.listConversationAssignees(current), appServices.opportunities.stages(current),
      ])
      setItems(opportunities); setAssignees(availableAssignees); setStages(configuredStages.sort((a, b) => a.position - b.position))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar las oportunidades.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [showArchived])

  useEffect(() => {
    if (!creating || !dealerId) return
    let active = true
    setLoadingContacts(true); setContactLoadError('')
    const timer = window.setTimeout(() => {
      appServices.contacts.list(dealerId, { search: contactSearch, channel: '', consentState: '', sort: 'name', limit: 25, offset: 0 }).then((result) => { if (active) setContactChoices(result.contacts) }).catch(() => { if (active) setContactLoadError('No pudimos cargar contactos para vincular. Puedes continuar sin vínculo.') }).finally(() => { if (active) setLoadingContacts(false) })
    }, contactSearch ? 180 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [creating, dealerId, contactSearch])

  const visible = useMemo(() => items.filter((item) => `${item.title} ${item.contactName} ${item.assignedUserName ?? ''}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))), [items, search])
  const activeCount = visible.filter((item) => !item.archivedAt).length
  const openValue = visible.filter((item) => !item.archivedAt && ['new', 'working', 'closing'].includes(item.stage)).reduce((total, item) => total + Number(item.amountCents), 0)

  async function update(item: Opportunity, input: Parameters<typeof appServices.opportunities.update>[2]) {
    try {
      const updated = await appServices.opportunities.update(dealerId, item.id, input)
      setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate))
      setActionEditingId(null)
      if (expandedId === item.id) await loadActivity(item.id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar el cambio.') }
  }
  async function loadActivity(id: string) {
    try { const result = await appServices.opportunities.activity(dealerId, id); setHistory((current) => ({ ...current, [id]: result })) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar el historial.') }
  }
  async function toggleActivity(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id); await loadActivity(id)
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!dealerId) return
    const form = new FormData(event.currentTarget)
    const amount = Number(String(form.get('amount') ?? '0').replace(/[^\d]/g, ''))
    const contact = contactChoices.find((candidate) => candidate.id === String(form.get('contactId') ?? ''))
    setSaving(true); setError('')
    try {
      const created = await appServices.opportunities.create({ dealerId, title: String(form.get('title') ?? '').trim(), contactId: contact?.id ?? null, contactName: contact ? contactLabel(contact) : String(form.get('contactName') ?? '').trim(), contactPhone: contact ? contact.phone : String(form.get('contactPhone') ?? '').trim() || null, amountCents: amount * 100, stage: 'new', nextAction: String(form.get('nextAction') ?? '').trim() || null, nextActionAt: String(form.get('nextActionAt') ?? '') || null, notes: String(form.get('notes') ?? '').trim() || null })
      setItems((current) => [created, ...current]); setCreating(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar la oportunidad.') }
    finally { setSaving(false) }
  }
  async function saveStageConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true)
    try { const saved = await appServices.opportunities.saveStages(dealerId, stageDraft); setStages(saved.sort((a, b) => a.position - b.position)); setConfiguringStages(false) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar las etapas.') }
    finally { setSaving(false) }
  }
  function openCreate() { setContactSearch(''); setContactChoices([]); setSelectedContactId(''); setContactLoadError(''); setCreating(true) }
  return <section className="opportunities-view">
    <header className="opportunities-heading"><div><p className="eyebrow">VENTAS DEL DEALER</p><h1>Oportunidades</h1><p>Da seguimiento a cada oportunidad y conserva su historial en este dealer.</p></div><div className="opportunities-toolbar"><button className="secondary" onClick={() => { setStageDraft(stages.map((stage) => ({ ...stage }))); setConfiguringStages(true) }}>Configurar etapas</button><button className="primary" onClick={openCreate}><Icon name="plus" size={16} /> Nueva oportunidad</button></div></header>
    <section className="opportunities-summary"><span><strong>{activeCount}</strong> oportunidades activas</span><span><strong>{money(String(openValue))}</strong> valor abierto</span><span>Pipeline del dealer</span><label className="archived-filter"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Incluir archivadas</label><button className="icon-button" onClick={() => void load()} aria-label="Actualizar oportunidades"><Icon name="clock" size={16} /></button></section>
    {error && <div className="opportunities-error" role="alert">{error}<button onClick={() => void load()}>Reintentar</button></div>}
    {loading ? <div className="opportunities-loading">Cargando oportunidades…</div> : <div className="opportunity-board" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(190px, 1fr))` }}>{stages.map((lane) => {
      const records = visible.filter((item) => item.stage === lane.stageKey)
      return <section className={`opportunity-lane lane-${lane.stageKey}`} key={lane.stageKey}><header><h2>{lane.label}</h2><span>{records.length}</span></header><div className="opportunity-cards">{records.map((item) => <article className={`opportunity-card ${item.archivedAt ? 'is-archived' : ''}`} key={item.id}>
        <div className="opportunity-card-title"><strong>{item.title}</strong><button className="history-toggle" aria-expanded={expandedId === item.id} onClick={() => void toggleActivity(item.id)}>{expandedId === item.id ? 'Ocultar historial' : 'Historial'}</button></div>
        <p>{item.contactName}{item.contactPhone ? ` · ${item.contactPhone}` : ''}</p><b>{money(item.amountCents)}</b>{item.expectedCloseDate && <small>Cierre estimado · {item.expectedCloseDate}</small>}{item.notes && <small>{item.notes}</small>}
        {item.nextAction && <small className="next-action-summary"><strong>Próxima acción:</strong> {item.nextAction}{item.nextActionAt ? ` · ${item.nextActionAt}` : ''}</small>}
        {!item.archivedAt && <><label className="stage-control">Etapa<select value={item.stage} onChange={(event) => void update(item, { stage: event.target.value as OpportunityStage })} aria-label={`Etapa de ${item.title}`}>{stages.map((option) => <option value={option.stageKey} key={option.stageKey}>{option.label}</option>)}</select></label><label className="stage-control">Responsable<select value={item.assignedUserId ?? ''} onChange={(event) => void update(item, { assignedUserId: event.target.value || null })} aria-label={`Responsable de ${item.title}`}><option value="">Sin asignar</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.displayName}</option>)}</select></label>
          <button className="history-toggle" onClick={() => setActionEditingId(actionEditingId === item.id ? null : item.id)}>{actionEditingId === item.id ? 'Cancelar próxima acción' : 'Editar próxima acción'}</button>
          {actionEditingId === item.id && <form className="next-action-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void update(item, { nextAction: String(form.get('nextAction') ?? '').trim() || null, nextActionAt: String(form.get('nextActionAt') ?? '') || null }) }}><label>Acción<input name="nextAction" maxLength={500} defaultValue={item.nextAction ?? ''} placeholder="Ej. Llamar para confirmar" /></label><label>Fecha<input type="date" name="nextActionAt" defaultValue={item.nextActionAt ?? ''} /></label><button className="secondary">Guardar</button></form>}
        </>}
        {item.archivedAt ? <button className="history-toggle" onClick={() => void update(item, { archived: false })}>Restaurar oportunidad</button> : <button className="history-toggle archive-action" onClick={() => void update(item, { archived: true })}>Archivar</button>}
        {expandedId === item.id && <div className="opportunity-history" aria-label={`Historial de ${item.title}`}>{history[item.id]?.length ? history[item.id].map((entry) => <div key={entry.id}><p>{entry.summary}</p><small>{entry.actorName} · {new Date(entry.createdAt).toLocaleString('es-CO')}</small></div>) : <small>Sin cambios registrados todavía.</small>}</div>}
      </article>)}</div>{records.length === 0 && <div className="lane-empty">Sin oportunidades</div>}</section>
    })}</div>}
    {!loading && visible.length === 0 && <div className="opportunities-empty"><span className="preview-icon"><Icon name="pipeline" size={22} /></span><strong>{search ? 'Sin resultados para esta búsqueda' : 'El pipeline está listo para empezar'}</strong><p>{search ? 'Prueba con otro nombre o título.' : 'Al crear oportunidades, aparecerán aquí agrupadas por etapa.'}</p>{!search && <button className="secondary" onClick={openCreate}>Crear primera oportunidad</button>}</div>}

    {configuringStages && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfiguringStages(false) }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="opportunity-stages-title"><header><span className="dialog-icon"><Icon name="pipeline" size={16} /></span><button className="icon-button" aria-label="Cerrar" onClick={() => setConfiguringStages(false)}><Icon name="close" /></button></header><h2 id="opportunity-stages-title">Configurar pipeline</h2><p>Ajusta los nombres y el orden de las etapas para este dealer.</p><form onSubmit={(event) => void saveStageConfig(event)} className="stage-config-form">{stageDraft.map((stage) => <div className="stage-config-row" key={stage.stageKey}><label>Nombre<input required maxLength={60} value={stage.label} onChange={(event) => setStageDraft((current) => current.map((candidate) => candidate.stageKey === stage.stageKey ? { ...candidate, label: event.target.value } : candidate))} /></label><label>Orden<select value={stage.position} onChange={(event) => { const position = Number(event.target.value); setStageDraft((current) => current.map((candidate) => candidate.stageKey === stage.stageKey ? { ...candidate, position } : candidate)) }}>{stages.map((_, index) => <option key={index} value={index}>{index + 1}</option>)}</select></label></div>)}<div className="dialog-actions"><button type="button" className="secondary" onClick={() => setConfiguringStages(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar etapas'}</button></div></form></section></div>}

    {creating && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreating(false) }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="opportunity-create-title"><header><span className="dialog-icon"><Icon name="plus" size={16} /></span><button className="icon-button" aria-label="Cerrar" onClick={() => setCreating(false)}><Icon name="close" /></button></header><h2 id="opportunity-create-title">Nueva oportunidad</h2><p>Se guardará en el pipeline del dealer actual.</p><form onSubmit={(event) => void create(event)}><label>Nombre de la oportunidad<input autoFocus name="title" required minLength={2} maxLength={120} placeholder="Ej. SUV familiar" /></label><input type="hidden" name="contactId" value={selectedContactId} /><div className="opportunity-contact-picker"><label>Buscar contacto existente<input aria-label="Buscar contacto existente" value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} placeholder="Nombre, teléfono o correo" disabled={Boolean(selectedContactId)} /></label>{loadingContacts ? <p className="opportunity-contact-loading" role="status">Buscando contactos…</p> : <label>Vincular contacto existente<select aria-label="Vincular contacto existente" value={selectedContactId} onChange={(event) => setSelectedContactId(event.target.value)} disabled={Boolean(selectedContactId)}><option value="">Sin vincular</option>{contactChoices.map((contact) => <option value={contact.id} key={contact.id}>{contactLabel(contact)}{contact.phone ? ` · ${contact.phone}` : contact.email ? ` · ${contact.email}` : ''}</option>)}</select></label>}{contactLoadError && <p className="opportunity-contact-error" role="status">{contactLoadError}</p>}</div>{selectedContactId ? <p className="opportunity-contact-linked">Se asociará al contacto seleccionado. <button type="button" className="secondary" onClick={() => setSelectedContactId('')}>Quitar vínculo</button></p> : <><label>Nombre del contacto<input name="contactName" required maxLength={120} placeholder="Nombre del contacto" /></label><label>Teléfono<input name="contactPhone" type="tel" placeholder="Opcional" /></label></>}<label>Valor estimado (COP)<input name="amount" type="number" min="0" step="1" defaultValue="0" /></label><label>Próxima acción<input name="nextAction" maxLength={500} placeholder="Ej. Llamar para confirmar" /></label><label>Fecha de próxima acción<input name="nextActionAt" type="date" /></label><label>Notas<textarea name="notes" rows={3} maxLength={2000} placeholder="Detalles para el seguimiento" /></label><div className="dialog-actions"><button type="button" className="secondary" onClick={() => setCreating(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Guardando…' : 'Crear oportunidad'}</button></div></form></section></div>}
  </section>
}
