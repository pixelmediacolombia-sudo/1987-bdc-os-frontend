import { createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const root = process.cwd()
const psql = (sql: string) => execFileSync('docker', [
  'compose', 'exec', '-T', 'postgres', 'psql', '-U', 'bdc_local', '-d', 'bdc_os_local', '-v', 'ON_ERROR_STOP=1', '-c', sql,
], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

let sessionHash = ''
let sessionToken = ''
let createdDealerId = ''
test.afterEach(async () => {
  try {
    if (createdDealerId && sessionToken) {
      const response = await fetch(`http://127.0.0.1:3000/auth/admin/dealers/${createdDealerId}`, { method: 'DELETE', headers: { cookie: `bdc_os_session=${sessionToken}` } })
      if (response.status !== 204 && response.status !== 404) throw new Error(`QA cleanup returned ${response.status}`)
    }
  } finally {
    if (sessionHash) psql(`DELETE FROM public.app_sessions WHERE token_hash = '${sessionHash}'`).trim()
    sessionHash = ''
    sessionToken = ''
    createdDealerId = ''
  }
})

test('global admin creates and deletes a dealer, then sees both events in the Docker audit log', async ({ page }) => {
  sessionToken = randomBytes(32).toString('base64url')
  sessionHash = createHash('sha256').update(sessionToken).digest('hex')
  const insert = psql(`INSERT INTO public.app_sessions (user_id, token_hash, expires_at) SELECT id, '${sessionHash}', now() + interval '30 minutes' FROM public.app_users WHERE account_type = 'admin' AND status = 'active' LIMIT 1`)
  expect(insert).toContain('INSERT 0 1')

  await page.context().addCookies([{ name: 'bdc_os_session', value: sessionToken, url: 'http://127.0.0.1:4173' }])
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Administración de dealers' })).toBeVisible()

  const stamp = Date.now()
  const dealerName = `ADM04 QA ${stamp}`
  await page.getByRole('button', { name: /Crear dealer/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Crear dealer' })
  await dialog.getByLabel('Nombre del dealer').fill(dealerName)
  await dialog.getByLabel('Responsable principal').fill('Prueba de auditoría')
  await dialog.getByLabel('Correo de invitación').fill(`adm04-${stamp}@example.test`)
  const createResponsePromise = page.waitForResponse((response) => response.url().includes('/backend/auth/admin/dealers') && response.request().method() === 'POST')
  await dialog.getByRole('button', { name: 'Crear e invitar' }).click()
  const createResponse = await createResponsePromise
  const created = await createResponse.json() as { dealer: { id: string } }
  createdDealerId = created.dealer.id
  await expect(page.getByRole('heading', { name: 'Invitación enviada' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).last().click()

  await page.getByRole('button', { name: 'Dealers', exact: true }).click()
  await expect(page.getByText(dealerName, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: `Ver dealer ${dealerName}` }).click()
  await page.getByRole('button', { name: 'Eliminar dealer' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, eliminar dealer' }).click()
  await expect(page.getByRole('dialog', { name: dealerName })).toHaveCount(0)

  await page.getByRole('button', { name: 'Actividad', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Actividad administrativa' })).toBeVisible()
  const auditRows = page.locator('tr.audit-row').filter({ hasText: dealerName })
  await expect(auditRows).toHaveCount(2)
  await expect(auditRows.first()).toContainText('Dealer eliminado')
  await expect(auditRows.nth(1)).toContainText('Dealer creado')
  await page.getByRole('textbox', { name: 'Buscar', exact: true }).fill(dealerName)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByText('2', { exact: true })).toBeVisible()
  await expect(page.locator('tr.audit-row')).toHaveCount(2)
  mkdirSync('output/evidence', { recursive: true })
  await page.screenshot({ path: 'output/evidence/adm-04-auditoria-docker-local.png', fullPage: true })
  await page.locator('tr.audit-row').first().getByRole('button', { name: /Ver detalles del evento/ }).click()
  await expect(page.getByText(/Referencia ·/)).toBeVisible()
  await page.screenshot({ path: 'output/evidence/adm-04-auditoria-detalle-docker-local.png', fullPage: true })
})
