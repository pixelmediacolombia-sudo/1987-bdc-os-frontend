import { createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from './fixtures'

const root = process.cwd()
const psql = (sql: string) => execFileSync('docker', [
  'compose', 'exec', '-T', 'postgres', 'psql', '-U', 'bdc_local', '-d', 'bdc_os_local', '-v', 'ON_ERROR_STOP=1', '-c', sql,
], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

let sessionHash = ''
let sessionToken = ''

test.afterEach(async () => {
  if (sessionHash) psql(`DELETE FROM public.app_sessions WHERE token_hash = '${sessionHash}'`).trim()
  sessionHash = ''
  sessionToken = ''
})

test('global admin sees real Docker API, PostgreSQL and Redis health', async ({ page }) => {
  sessionToken = randomBytes(32).toString('base64url')
  sessionHash = createHash('sha256').update(sessionToken).digest('hex')
  const insert = psql(`INSERT INTO public.app_sessions (user_id, token_hash, expires_at) SELECT id, '${sessionHash}', now() + interval '30 minutes' FROM public.app_users WHERE account_type = 'admin' AND status = 'active' LIMIT 1`)
  expect(insert).toContain('INSERT 0 1')

  await page.context().addCookies([{ name: 'bdc_os_session', value: sessionToken, url: 'http://127.0.0.1:4173' }])
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Administración de dealers' })).toBeVisible()

  const healthResponse = page.waitForResponse((response) => response.url().includes('/backend/auth/admin/system/health'))
  await page.getByRole('button', { name: 'Configuración', exact: true }).click()
  const response = await healthResponse
  expect(response.status()).toBe(200)
  const payload = await response.json() as {
    overall: string
    services: { api: string; postgresql: string; redis: string }
  }
  expect(payload).toEqual({
    overall: 'healthy',
    checked_at: expect.any(String),
    services: { api: 'healthy', postgresql: 'healthy', redis: 'healthy' },
  })

  await expect(page.getByRole('heading', { name: 'Estado del sistema' })).toBeVisible()
  await expect(page.getByText('Servicios disponibles')).toBeVisible()
  await expect(page.getByText('PostgreSQL')).toBeVisible()
  await expect(page.getByText('Redis')).toBeVisible()
  await expect(page.getByText('API de BDC OS')).toBeVisible()
  await expect(page.locator('.system-health-row').getByText('Disponible', { exact: true })).toHaveCount(3)

  mkdirSync('output/evidence', { recursive: true })
  await page.screenshot({ path: 'output/evidence/adm-06-salud-global-docker.png', fullPage: true })
})

test('dealer users cannot open global system health', async ({ page }) => {
  await page.route('**/backend/auth/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, user: { id: 'dealer-user', email: 'asesor@example.test', displayName: 'Asesor Dealer', accountType: 'user' } }),
  }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tu operación, en un solo lugar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Configuración', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Configuración', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Estado del sistema' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Actualizar estado' })).toHaveCount(0)
})
