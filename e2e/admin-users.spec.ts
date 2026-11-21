import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const root = process.cwd()
const psql = (sql: string) => execFileSync('docker', [
  'compose', 'exec', '-T', 'postgres', 'psql', '-U', 'bdc_local', '-d', 'bdc_os_local', '-v', 'ON_ERROR_STOP=1', '-c', sql,
], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`
const dealerId = randomUUID()
const userEmail = `adm07-user-${stamp}@example.test`
const invitationEmail = `adm07-invite-${stamp}@example.test`
const invitationHash = createHash('sha256').update(randomBytes(32)).digest('hex')
const sessionToken = randomBytes(32).toString('base64url')
const sessionHash = createHash('sha256').update(sessionToken).digest('hex')

test.beforeAll(() => {
  psql(`INSERT INTO public.tenants (dealer_id, dealer_name, timezone, policy_version, status, sofia_enabled, qualification_flow_enabled, qualification_signal_enabled) VALUES ('${dealerId}', 'ADM07 ${stamp}', 'America/Bogota', 'pending_dealer_setup', 'active', false, false, false)`)
  psql(`INSERT INTO public.app_users (email, display_name, password_hash, account_type, status) VALUES ('${userEmail}', 'ADM07 User ${stamp}', NULL, 'user', 'active')`)
  psql(`INSERT INTO public.user_tenant_memberships (user_id, tenant_id) SELECT id, '${dealerId}' FROM public.app_users WHERE email='${userEmail}'`)
  psql(`INSERT INTO public.dealer_invitations (tenant_id, email, display_name, token_hash, invited_by, expires_at) SELECT '${dealerId}', '${invitationEmail}', 'ADM07 Invite ${stamp}', '${invitationHash}', id, now() + interval '2 days' FROM public.app_users WHERE account_type='admin' AND status='active' LIMIT 1`)
  psql(`INSERT INTO public.app_sessions (user_id, token_hash, expires_at) SELECT id, '${sessionHash}', now() + interval '30 minutes' FROM public.app_users WHERE account_type='admin' AND status='active' LIMIT 1`)
})

test.afterAll(() => {
  psql(`DELETE FROM public.dealer_invitations WHERE tenant_id='${dealerId}'`)
  psql(`DELETE FROM public.user_tenant_memberships WHERE tenant_id='${dealerId}'`)
  psql(`DELETE FROM public.tenants WHERE dealer_id='${dealerId}'`)
  psql(`DELETE FROM public.app_users WHERE email='${userEmail}'`)
  psql(`DELETE FROM public.app_sessions WHERE token_hash='${sessionHash}'`)
})

test('global admin sees filtered real user and invitation access from Docker', async ({ page }) => {
  await page.context().addCookies([{ name: 'bdc_os_session', value: sessionToken, url: 'http://127.0.0.1:4173' }])
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Administración de dealers' })).toBeVisible()
  await page.getByRole('button', { name: 'Usuarios', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Usuarios y accesos' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Buscar', exact: true }).fill(`ADM07 ${stamp}`)
  const response = page.waitForResponse((item) => {
    if (!item.url().includes('/backend/auth/admin/users?')) return false
    return new URL(item.url()).searchParams.get('search') === `ADM07 ${stamp}`
  })
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  const usersResponse = await response
  expect(usersResponse.status()).toBe(200)
  const payload = await usersResponse.json() as { total: number; entries: Array<{ record_type: string; status: string; dealers: Array<{ name: string }> }> }
  expect(payload.total).toBe(2)
  expect(payload.entries.map((entry) => [entry.record_type, entry.status])).toEqual([['invitation', 'pending'], ['user', 'active']])
  const dealerFilteredResponse = page.waitForResponse((item) => {
    if (!item.url().includes('/backend/auth/admin/users?')) return false
    const query = new URL(item.url()).searchParams
    return query.get('search') === `ADM07 ${stamp}` && query.get('dealerId') === dealerId
  })
  await page.locator('.admin-user-filters select').nth(0).selectOption(dealerId)
  const dealerResponse = await dealerFilteredResponse
  expect(dealerResponse.status()).toBe(200)
  expect((await dealerResponse.json() as { total: number }).total).toBe(2)
  await expect(page.getByText(`ADM07 User ${stamp}`)).toBeVisible()
  await expect(page.getByText(`ADM07 Invite ${stamp}`)).toBeVisible()
  await expect(page.getByText('Invitación pendiente')).toBeVisible()
  await expect(page.locator('.admin-user-table').getByText(`ADM07 ${stamp}`, { exact: true })).toHaveCount(2)
  expect(JSON.stringify(payload)).not.toMatch(/token_hash|password_hash|accept\?token=/i)
  mkdirSync('output/evidence', { recursive: true })
  await page.screenshot({ path: 'output/evidence/adm-07-directorio-usuarios-docker.png', fullPage: true })
})
