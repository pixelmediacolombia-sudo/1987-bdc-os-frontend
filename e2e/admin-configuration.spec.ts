import { createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const root = process.cwd()
const psql = (sql: string) => execFileSync('docker', [
  'compose', 'exec', '-T', 'postgres', 'psql', '-U', 'bdc_local', '-d', 'bdc_os_local', '-v', 'ON_ERROR_STOP=1', '-c', sql,
], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

let sessionHash = ''
let sessionToken = ''
const dealerIds: string[] = []

test.afterEach(async () => {
  try {
    for (const dealerId of dealerIds) {
      const response = await fetch(`http://127.0.0.1:3000/auth/admin/dealers/${dealerId}`, { method: 'DELETE', headers: { cookie: `bdc_os_session=${sessionToken}` } })
      if (response.status !== 204 && response.status !== 404) throw new Error(`ADM05 cleanup returned ${response.status}`)
    }
  } finally {
    if (sessionHash) psql(`DELETE FROM public.app_sessions WHERE token_hash = '${sessionHash}'`).trim()
    sessionHash = ''
    sessionToken = ''
    dealerIds.length = 0
  }
})

async function createDealer(page: Page, dealerName: string, email: string) {
  await page.getByRole('button', { name: /Crear dealer/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Crear dealer' })
  await dialog.getByLabel('Nombre del dealer').fill(dealerName)
  await dialog.getByLabel('Responsable principal').fill('Prueba ADM05')
  await dialog.getByLabel('Correo de invitación').fill(email)
  const responsePromise = page.waitForResponse((response) => response.url().includes('/backend/auth/admin/dealers') && response.request().method() === 'POST')
  await dialog.getByRole('button', { name: 'Crear e invitar' }).click()
  const response = await responsePromise
  expect(response.status()).toBe(201)
  const result = await response.json() as { dealer: { id: string } }
  dealerIds.push(result.dealer.id)
  await expect(page.getByRole('heading', { name: 'Invitación enviada' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  return result.dealer.id
}

async function openDealer(page: Page, dealerName: string) {
  await page.getByRole('button', { name: 'Dealers', exact: true }).click()
  await expect(page.getByText(dealerName, { exact: true })).toBeVisible()
  const responsePromise = page.waitForResponse((item) => item.url().includes('/configuration') && item.request().method() === 'GET')
  await page.getByRole('button', { name: `Ver dealer ${dealerName}` }).click()
  await expect(page.getByRole('heading', { name: 'Configuración e integraciones' })).toBeVisible()
  await expect(page.getByText('Consulta de solo lectura')).toBeVisible()
  const response = await responsePromise
  return response.json() as Promise<unknown>
}

test('global admin reviews safe dealer configuration with and without simulated credentials', async ({ page }) => {
  sessionToken = randomBytes(32).toString('base64url')
  sessionHash = createHash('sha256').update(sessionToken).digest('hex')
  expect(psql(`INSERT INTO public.app_sessions (user_id, token_hash, expires_at) SELECT id, '${sessionHash}', now() + interval '30 minutes' FROM public.app_users WHERE account_type = 'admin' AND status = 'active' LIMIT 1`)).toContain('INSERT 0 1')
  await page.context().addCookies([{ name: 'bdc_os_session', value: sessionToken, url: 'http://127.0.0.1:4173' }])
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Administración de dealers' })).toBeVisible()

  const stamp = Date.now()
  const configuredName = `ADM05 QA Simulado ${stamp}`
  const configuredId = await createDealer(page, configuredName, `adm05-config-${stamp}@example.test`)
  const simulatedMeta = `SIMULATED_ENCRYPTED_META_${stamp}`
  const seed = `UPDATE public.tenants SET meta_capi_enabled=true, meta_dataset_id='SIMULATED_DATASET_${stamp}', encrypted_meta_access_token='${simulatedMeta}', meta_test_event_code='SIMULATED_EVENT_CODE_${stamp}' WHERE dealer_id='${configuredId}'`
  psql(seed)
  const configuredResponse = await openDealer(page, configuredName) as Record<string, unknown>
  expect(JSON.stringify(configuredResponse)).not.toMatch(/ghl/i)
  await expect(page.getByText('Meta CAPI · Facebook')).toBeVisible()
  await expect(page.getByText('SIMULATED_DATASET_' + stamp)).toBeVisible()
  await expect(page.getByText('Configurado', { exact: true })).toBeVisible()
  await expect(page.getByText('GoHighLevel')).toHaveCount(0)
  const visibleText = await page.getByRole('dialog').innerText()
  for (const secret of [simulatedMeta, `SIMULATED_EVENT_CODE_${stamp}`]) expect(visibleText).not.toContain(secret)
  mkdirSync('output/evidence', { recursive: true })
  await page.screenshot({ path: 'output/evidence/adm-05-configuracion-con-credenciales-simuladas.png', fullPage: true })
  const configuredDrawer = page.getByRole('dialog')
  await configuredDrawer.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await page.screenshot({ path: 'output/evidence/adm-05-configuracion-con-credenciales-simuladas-detalle.png', fullPage: true })
  await page.getByRole('button', { name: 'Cerrar detalle del dealer' }).click()

  const emptyName = `ADM05 QA Sin credenciales ${stamp}`
  await createDealer(page, emptyName, `adm05-empty-${stamp}@example.test`)
  const emptyResponse = await openDealer(page, emptyName) as Record<string, unknown>
  expect(JSON.stringify(emptyResponse)).not.toMatch(/ghl/i)
  await expect(page.getByText('Meta CAPI · Facebook')).toBeVisible()
  await expect(page.getByText('Desactivado', { exact: true })).toBeVisible()
  await expect(page.getByText('Sin configurar', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('GoHighLevel')).toHaveCount(0)
  await expect(page.getByText('Las credenciales y códigos secretos nunca se muestran.')).toBeVisible()
  await page.screenshot({ path: 'output/evidence/adm-05-configuracion-sin-credenciales.png', fullPage: true })
  const emptyDrawer = page.getByRole('dialog')
  await emptyDrawer.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await page.screenshot({ path: 'output/evidence/adm-05-configuracion-sin-credenciales-detalle.png', fullPage: true })
})
