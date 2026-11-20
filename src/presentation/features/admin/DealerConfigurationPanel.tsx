import { useEffect, useState } from 'react'
import { appServices } from '../../../core/container'
import type { DealerConfiguration } from '../../../domain/dealer/dealer-configuration'

export function DealerConfigurationPanel({ dealerId }: { dealerId: string }) {
  const [configuration, setConfiguration] = useState<DealerConfiguration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await appServices.configuration.getDealer.execute(dealerId)
      if (!isDealerConfiguration(result)) throw new Error('La respuesta de configuración no es válida.')
      setConfiguration(result)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos consultar la configuración.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [dealerId])

  return <section className="admin-config" aria-label="Configuración e integraciones del dealer"><div className="admin-config-heading"><div><h3>Configuración e integraciones</h3><p>Consulta de solo lectura</p></div><button className="secondary" onClick={() => void load()} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</button></div>
    {loading && <p className="admin-config-state" role="status">Consultando ajustes y conexiones…</p>}
    {error && <div className="admin-config-error" role="alert"><span>{error}</span><button className="link-button" onClick={() => void load()}>Reintentar</button></div>}
    {configuration && !loading && <>
      <div className="admin-config-card"><div className="admin-config-card-heading"><strong>GoHighLevel</strong><ConfigStatus status={configuration.integrations.ghl.status} /></div><ConfigFact label="Ubicación" value={configuration.integrations.ghl.locationId ?? 'Sin configurar'} /><ConfigFact label="Token" value={configuration.integrations.ghl.hasStoredAccessToken ? 'Guardado · valor oculto' : 'Sin credencial'} /><ConfigFact label="Última verificación" value={formatConfigDate(configuration.integrations.ghl.lastVerifiedAt)} />{configuration.integrations.ghl.scopes.length > 0 && <ConfigFact label="Permisos" value={configuration.integrations.ghl.scopes.join(', ')} />}</div>
      <div className="admin-config-card"><div className="admin-config-card-heading"><strong>Meta Conversions API</strong><ConfigStatus status={configuration.integrations.metaCapi.status} /></div><ConfigFact label="Origen de credencial" value={configuration.integrations.metaCapi.credentialSource === 'none' ? 'Sin configurar' : configuration.integrations.metaCapi.credentialSource === 'environment' ? 'Configuración del servidor' : 'Configuración del dealer'} /><ConfigFact label="Dataset" value={configuration.integrations.metaCapi.datasetId ?? 'Sin configurar'} /><ConfigFact label="Evento" value={configuration.integrations.metaCapi.eventName} /><ConfigFact label="Código de prueba" value={configuration.integrations.metaCapi.testEventCodeConfigured ? 'Configurado · valor oculto' : 'No configurado'} />{configuration.integrations.metaCapi.lastEventStatus && <ConfigFact label="Último evento" value={`${configuration.integrations.metaCapi.lastEventStatus} · ${formatConfigDate(configuration.integrations.metaCapi.lastEventAt)}`} />}</div>
      <div className="admin-config-card"><div className="admin-config-card-heading"><strong>Políticas y funciones</strong><span>{configuration.policy.version ?? 'Sin versión'}</span></div><ConfigFact label="Zona horaria" value={configuration.dealer.timezone ?? 'Sin configurar'} />{configuration.policy.financialPolicyKeys.length > 0 && <ConfigFact label="Reglas financieras" value={configuration.policy.financialPolicyKeys.join(', ')} />}<ConfigFlag label="Sofía" enabled={configuration.flags.sofiaEnabled} /><ConfigFlag label="Flujo de calificación" enabled={configuration.flags.qualificationFlowEnabled} /><ConfigFlag label="Señales de calificación" enabled={configuration.flags.qualificationSignalEnabled} /><ConfigFlag label="Asistente en sombra" enabled={configuration.flags.conversationAiShadowEnabled} /><ConfigFlag label="Envío conversacional" enabled={configuration.flags.conversationAiSendEnabled} /><ConfigFlag label="Página de Facebook" enabled={configuration.flags.facebookPageConfigured} /><small className="admin-config-footnote">Las credenciales y códigos secretos nunca se muestran.</small></div>
    </>}
  </section>
}

function isDealerConfiguration(value: unknown): value is DealerConfiguration {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<DealerConfiguration>
  return Boolean(result.dealer && result.policy && result.flags && result.integrations?.ghl && result.integrations?.metaCapi)
}

function ConfigFact({ label, value }: { label: string; value: string }) { return <div className="admin-config-fact"><span>{label}</span><strong title={value}>{value}</strong></div> }
function ConfigFlag({ label, enabled }: { label: string; enabled: boolean }) { return <ConfigFact label={label} value={enabled ? 'Activo' : 'Inactivo'} /> }
function ConfigStatus({ status }: { status: string }) { const labels: Record<string, string> = { connected: 'Conectado', degraded: 'Revisar', revoked: 'Revocado', not_connected: 'Sin conectar', disabled: 'Desactivado', incomplete: 'Incompleto', configured: 'Configurado' }; return <span className={`admin-config-status ${status}`}>{labels[status] ?? status}</span> }
function formatConfigDate(value: string | null): string { if (!value) return 'Sin registro'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Sin registro' : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date) }
