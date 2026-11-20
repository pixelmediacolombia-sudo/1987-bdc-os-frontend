import { expect, test, type Page } from '@playwright/test'

const email = process.env.BDC_E2E_ADMIN_EMAIL ?? 'admin@bdc-os.local'

async function signInAdmin(page: Page) {
  await page.route('**/backend/auth/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, user: { id: 'admin-e2e', email, displayName: 'Admin E2E', accountType: 'admin' } }),
  }))
  await page.route('**/backend/auth/admin/dealers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ dealers: [
      { id: 'dealer-andino', name: 'Grupo Andino Motors', status: 'active', user_count: 5, pending_invitation_count: 0 },
      { id: 'dealer-valle', name: 'Autocentro del Valle', status: 'active', user_count: 3, pending_invitation_count: 0 },
      { id: 'dealer-norte', name: 'Ruta Norte Autos', status: 'active', user_count: 0, pending_invitation_count: 1 },
      { id: 'dealer-costa', name: 'Costa Motor Group', status: 'suspended', user_count: 2, pending_invitation_count: 0 },
    ] }),
  }))
  await page.route('**/backend/auth/logout', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false }) }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Administración de dealers' })).toBeVisible()
}

test('admin lands on the global dealer overview', async ({ page }) => {
  await signInAdmin(page)
  await expect(page.getByText('Dealers registrados')).toBeVisible()
  await expect(page.getByLabel('Indicadores de dealers').getByText('Miembros activos')).toBeVisible()
  await expect(page.getByText('Grupo Andino Motors')).toBeVisible()
  await expect(page.getByText('Necesitan tu atención', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nueva oportunidad' })).toHaveCount(0)
})

test('admin filters dealer accounts and opens their detail', async ({ page }) => {
  await signInAdmin(page)
  await page.getByRole('button', { name: 'Dealers' }).click()
  await page.getByRole('button', { name: 'Inactivo' }).click()
  await expect(page.getByText('Costa Motor Group')).toBeVisible()
  await expect(page.getByText('Grupo Andino Motors')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ver dealer Costa Motor Group' }).click()
  await expect(page.getByRole('dialog', { name: 'Costa Motor Group' })).toBeVisible()
})

test('admin can inspect platform modules and log out', async ({ page }) => {
  await signInAdmin(page)
  const adminName = await page.getByText('Admin E2E', { exact: true }).boundingBox()
  const logoutLabel = await page.getByText('Salir', { exact: true }).boundingBox()
  expect(adminName).not.toBeNull()
  expect(logoutLabel).not.toBeNull()
  expect(adminName!.x + adminName!.width).toBeLessThanOrEqual(logoutLabel!.x)
  await page.getByRole('button', { name: 'Usuarios' }).click()
  await expect(page.getByRole('heading', { name: 'Usuarios de la plataforma' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver al resumen' }).click()
  await expect(page.getByRole('heading', { name: 'Administración de dealers' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible()
})

test('admin creates a dealer and shares the generated invitation link', async ({ page }) => {
  await signInAdmin(page)
  await page.route('**/backend/auth/admin/dealers', (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ dealer: { id: 'dealer-new', name: 'Dealer de prueba', status: 'onboarding' }, invitation: { url: 'http://localhost:3000/auth/invitations/accept?token=e2e-token', expiresInHours: 72 } }),
    })
  })
  await page.getByRole('button', { name: /Crear dealer/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Crear dealer' })
  await dialog.getByLabel('Nombre del dealer').fill('Dealer de prueba')
  await dialog.getByLabel('Responsable principal').fill('Ana Pérez')
  await dialog.getByLabel('Correo de invitación').fill('ana@example.com')
  await dialog.getByRole('button', { name: 'Crear e invitar' }).click()
  await expect(page.getByRole('heading', { name: 'Dealer creado' })).toBeVisible()
  await expect(page.getByLabel('Invitación · vence en 72 horas')).toHaveValue(/token=e2e-token/)
  await expect(page.getByText(/se comparte manualmente/)).toBeVisible()
})

test('dealer users keep their attention dashboard and sales tools', async ({ page }) => {
  await page.route('**/backend/auth/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, user: { id: 'dealer-user', email: 'asesor@dealer.local', displayName: 'Asesor Dealer', accountType: 'user' } }),
  }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tu operación, en un solo lugar' })).toBeVisible()
  await expect(page.getByText('Necesitan tu atención')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nueva oportunidad' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Administración de dealers' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Prioridad', exact: true }).click()
  await expect(page.getByText('Laura Méndez', { exact: true })).toBeVisible()
  await expect(page.getByText('Andrés Rojas', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Todo', exact: true }).click()
  await page.getByRole('button', { name: /Laura Méndez/ }).click()
  await expect(page.getByRole('dialog', { name: 'Laura Méndez' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar detalle' }).click()
  await page.getByRole('button', { name: 'Nueva oportunidad' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nueva oportunidad' })
  await dialog.getByLabel('Nombre del contacto').fill('Andrea Gómez')
  await dialog.getByRole('button', { name: 'Crear en demo' }).click()
  await expect(page.getByText('Andrea Gómez')).toBeVisible()
})
