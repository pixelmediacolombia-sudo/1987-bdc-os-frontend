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
  await expect(page.getByRole('heading', { name: 'Usuarios y accesos' })).toBeVisible()
  await page.getByRole('button', { name: 'Resumen', exact: true }).click()
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

test('dealer start dashboard fits a desktop viewport without document scroll', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 730 })
  await page.route('**/backend/auth/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, user: { id: 'dealer-user-layout', email: 'layout@dealer.local', displayName: 'Asesor Layout', accountType: 'user' } }),
  }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tu operación, en un solo lugar' })).toBeVisible()
  for (const [index, viewport] of [{ width: 1536, height: 730 }, { width: 1920, height: 912 }].entries()) {
    await page.setViewportSize(viewport)
    await expect(page.getByText('Mariana Ospina', { exact: true })).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Nueva oportunidad' })).toBeInViewport()
    const layout = await page.evaluate(() => ({
      documentOverflow: document.documentElement.scrollHeight - window.innerHeight,
      leadListOverflow: document.querySelector('.lead-list')!.scrollHeight - document.querySelector('.lead-list')!.clientHeight,
      contentWidth: document.querySelector('.home-dashboard')!.getBoundingClientRect().width,
      mainWidth: document.querySelector('.main-column')!.getBoundingClientRect().width,
    }))
    expect(layout.documentOverflow, `document overflow at ${viewport.width}x${viewport.height}`).toBe(0)
    expect(layout.leadListOverflow, `contact list overflow at ${viewport.width}x${viewport.height}`).toBe(0)
    expect(layout.contentWidth).toBeGreaterThan(layout.mainWidth * 0.9)
    if (index === 0) await page.screenshot({ path: testInfo.outputPath('dashboard-no-scroll.png') })
  }

  await page.setViewportSize({ width: 1536, height: 730 })
  await page.locator('.sidebar .nav-item').filter({ hasText: 'Bandeja' }).click()
  await expect(page.locator('.breadcrumb strong')).toHaveText('Bandeja')
  const inboxLayout = await page.evaluate(() => ({
    documentOverflow: document.documentElement.scrollHeight - window.innerHeight,
    shellHeight: document.querySelector('.app-shell')!.getBoundingClientRect().height,
    contentHeight: document.querySelector('.content')!.clientHeight,
    viewportHeight: window.innerHeight,
  }))
  expect(inboxLayout.documentOverflow, 'document overflow in Bandeja').toBe(0)
  expect(inboxLayout.shellHeight).toBe(inboxLayout.viewportHeight)
  expect(inboxLayout.contentHeight).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('inbox-no-document-scroll.png') })
})

test('dealer users can browse, create, edit, and inspect contact history', async ({ page }, testInfo) => {
  const dealerId = '11111111-1111-4111-8111-111111111111'
  const contactId = '33333333-3333-4333-8333-333333333333'
  const manualId = '44444444-4444-4444-8444-444444444444'
  let contact = {
    id: contactId, dealerId, providerContactId: 'meta-contact-e2e', displayName: 'Buyer E2E', source: 'meta', phone: '+1 555 0100', email: 'buyer@example.test',
    preferredLanguage: 'en', consentState: 'unknown', createdAt: '2026-11-24T10:00:00.000Z', updatedAt: '2026-11-24T10:00:00.000Z',
    conversationCount: 1, lastActivity: '2026-11-24T10:00:00.000Z', channels: ['messenger'],
  }
  let manual: typeof contact | null = null
  await page.route('**/backend/auth/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, user: { id: 'dealer-user-e2e', email: 'asesor@dealer.local', displayName: 'Asesor E2E', accountType: 'user' } }),
  }))
  await page.route('**/backend/auth/contacts**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/contacts/dealers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dealers: [{ id: dealerId, name: 'Dealer E2E' }] }) })
    if (request.method() === 'POST' && url.pathname.endsWith('/contacts')) {
      manual = { id: manualId, dealerId, providerContactId: 'manual:local-e2e', displayName: 'Andrea Gómez', source: 'manual', phone: '+1 555 0101', email: null, preferredLanguage: 'unknown', consentState: 'unknown', createdAt: '2026-11-24T11:00:00.000Z', updatedAt: '2026-11-24T11:00:00.000Z', conversationCount: 0, lastActivity: null, channels: [] }
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ contact: manual }) })
    }
    if (request.method() === 'PATCH' && url.pathname.endsWith('/' + manualId)) {
      manual = { ...manual!, displayName: 'Andrea Gómez Editada' }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contact: manual }) })
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/contacts')) {
      const contacts = manual ? [contact, manual] : [contact]
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contacts, total: contacts.length, limit: 25, offset: Number(url.searchParams.get('offset') ?? 0) }) })
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/' + contactId)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contact: { ...contact, conversations: [{ id: 'conversation-e2e', channel: 'messenger', owner: null, state: 'open', lastActivity: contact.lastActivity, messages: [{ id: 'message-e2e', direction: 'inbound', senderType: 'contact', content: 'Mensaje sintético para QA', createdAt: contact.lastActivity }] }] } }) })
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/' + manualId)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contact: { ...manual!, conversations: [] } }) })
    }
    return route.fallback()
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tu operación, en un solo lugar' })).toBeVisible()
  await page.getByRole('button', { name: 'Contactos' }).click()
  await expect(page.getByRole('heading', { name: 'Directorio de contactos' })).toBeVisible()
  await expect(page.getByText('Buyer E2E', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('contacts-directory.png'), fullPage: true })

  await page.getByRole('button', { name: 'Abrir ficha de Buyer E2E' }).click()
  await expect(page.getByRole('dialog', { name: 'Buyer E2E' })).toBeVisible()
  await expect(page.getByText('Mensaje sintético para QA')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('contact-360.png'), fullPage: true })
  await page.getByRole('button', { name: 'Cerrar ficha' }).click()

  await page.getByRole('button', { name: 'Nuevo contacto' }).click()
  const editor = page.getByRole('dialog', { name: 'Nuevo contacto' })
  await editor.getByLabel('Nombre').fill('Andrea Gómez')
  await editor.getByLabel('Teléfono').fill('+1 555 0101')
  await editor.getByRole('button', { name: 'Crear contacto' }).click()
  await expect(page.getByRole('dialog', { name: 'Andrea Gómez' })).toBeVisible()
  await expect(page.getByText('Registro manual · Sin conexión a Meta')).toBeVisible()
  await page.getByRole('button', { name: 'Editar' }).click()
  const edit = page.getByRole('dialog', { name: 'Editar contacto' })
  await edit.getByLabel('Nombre').fill('Andrea Gómez Editada')
  await edit.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('dialog', { name: 'Andrea Gómez Editada' })).toBeVisible()
})
