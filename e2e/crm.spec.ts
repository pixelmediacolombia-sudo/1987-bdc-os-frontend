import { expect, test, type Page } from './fixtures'
import { formatCurrentDate } from '../src/presentation/app/current-date'

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
  await expect(page.locator('.home-dashboard .eyebrow')).toHaveText(formatCurrentDate())
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
      contentOverflow: document.querySelector('.content')!.scrollHeight - document.querySelector('.content')!.clientHeight,
      leadListOverflow: document.querySelector('.lead-list')!.scrollHeight - document.querySelector('.lead-list')!.clientHeight,
      contentWidth: document.querySelector('.home-dashboard')!.getBoundingClientRect().width,
      mainWidth: document.querySelector('.main-column')!.getBoundingClientRect().width,
    }))
    expect(layout.documentOverflow, `document overflow at ${viewport.width}x${viewport.height}`).toBe(0)
    expect(layout.contentOverflow, `content overflow at ${viewport.width}x${viewport.height}`).toBe(0)
    expect(layout.leadListOverflow, `contact list overflow at ${viewport.width}x${viewport.height}`).toBe(0)
    expect(layout.contentWidth).toBeGreaterThan(layout.mainWidth * 0.9)
    if (index === 0) await page.screenshot({ path: testInfo.outputPath('dashboard-no-scroll.png') })
  }

  await page.setViewportSize({ width: 1536, height: 730 })
  const homeGeometry = await page.evaluate(() => ({
    dashboardHeight: document.querySelector('.home-dashboard')!.getBoundingClientRect().height,
    shellHeight: document.querySelector('.app-shell')!.getBoundingClientRect().height,
    queueHeight: document.querySelector('.queue')!.getBoundingClientRect().height,
    leadRowHeight: document.querySelector('.lead-row')!.getBoundingClientRect().height,
  }))
  const homeContentWidth = await page.locator('.content').evaluate((element) => element.clientWidth)
  await page.locator('.sidebar .nav-item').filter({ hasText: 'Bandeja' }).click()
  await expect(page.locator('.breadcrumb strong')).toHaveText('Bandeja')
  const inboxLayout = await page.evaluate(() => ({
    documentOverflow: document.documentElement.scrollHeight - window.innerHeight,
    shellHeight: document.querySelector('.app-shell')!.getBoundingClientRect().height,
    contentHeight: document.querySelector('.content')!.clientHeight,
    viewHeight: document.querySelector('.inbox-view')!.getBoundingClientRect().height,
    contentPadding: getComputedStyle(document.querySelector('.content')!).padding,
    contentWidth: document.querySelector('.content')!.clientWidth,
    viewportHeight: window.innerHeight,
  }))
  expect(inboxLayout.documentOverflow, 'document overflow in Bandeja').toBe(0)
  expect(inboxLayout.shellHeight).toBe(inboxLayout.viewportHeight)
  expect(inboxLayout.shellHeight).toBe(homeGeometry.shellHeight)
  expect(inboxLayout.viewHeight).toBeCloseTo(homeGeometry.dashboardHeight, 0)
  expect(inboxLayout.contentHeight).toBeGreaterThan(0)
  expect(inboxLayout.contentWidth, 'content width shift in Bandeja').toBe(homeContentWidth)
  await page.screenshot({ path: testInfo.outputPath('inbox-no-document-scroll.png') })
  await page.locator('.sidebar .nav-item').filter({ hasText: 'Inicio' }).click()
  await expect(page.locator('.breadcrumb strong')).toHaveText('Inicio')
  const homeGeometryAfterReturn = await page.evaluate(() => ({
    dashboardHeight: document.querySelector('.home-dashboard')!.getBoundingClientRect().height,
    shellHeight: document.querySelector('.app-shell')!.getBoundingClientRect().height,
    queueHeight: document.querySelector('.queue')!.getBoundingClientRect().height,
    leadRowHeight: document.querySelector('.lead-row')!.getBoundingClientRect().height,
  }))
  expect(homeGeometryAfterReturn, 'dashboard geometry changed after returning from Bandeja').toEqual(homeGeometry)
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
  let manualActivities: Array<{ id: string; action: string; actorName: string; summary: string; createdAt: string }> = []
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
      manualActivities = [{ id: 'activity-created-e2e', action: 'contact.created', actorName: 'Asesor E2E', summary: 'Se creó el contacto manual.', createdAt: '2026-11-24T11:00:00.000Z' }]
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ contact: manual }) })
    }
    if (request.method() === 'PATCH' && url.pathname.endsWith('/' + manualId)) {
      manual = { ...manual!, displayName: 'Andrea Gómez Editada' }
      manualActivities = [...manualActivities, { id: 'activity-updated-e2e', action: 'contact.updated', actorName: 'Asesor E2E', summary: 'Se actualizaron campos de la ficha: nombre.', createdAt: '2026-11-24T11:10:00.000Z' }]
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contact: manual }) })
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/contacts')) {
      const contacts = manual ? [contact, manual] : [contact]
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contacts, total: contacts.length, limit: 25, offset: Number(url.searchParams.get('offset') ?? 0) }) })
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/' + contactId)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contact: { ...contact, activities: [], conversations: [{ id: 'conversation-e2e', channel: 'messenger', owner: null, state: 'open', lastActivity: contact.lastActivity, messages: [{ id: 'message-e2e', direction: 'inbound', senderType: 'contact', content: 'Mensaje sintético para QA', createdAt: contact.lastActivity }] }] } }) })
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/' + manualId)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contact: { ...manual!, activities: manualActivities, conversations: [] } }) })
    }
    return route.fallback()
  })
  await page.route('**/backend/auth/opportunities?*', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ opportunities: manual ? [{
      id: 'opportunity-linked-e2e', dealerId, title: 'SUV familiar de Andrea', contactId: manual.id, contactName: manual.displayName,
      contactPhone: manual.phone, amountCents: '420000000', stage: 'working', assignedUserId: null, assignedUserName: null,
      expectedCloseDate: null, notes: null, createdAt: manual.createdAt, updatedAt: manual.updatedAt,
    }] : [] }),
  }))
  await page.route('**/backend/auth/opportunities/*/activity?*', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ activity: [{
      id: 'opportunity-created-e2e', action: 'opportunity.created', actorName: 'Asesor E2E',
      summary: 'Se creó la oportunidad SUV familiar de Andrea.', createdAt: '2026-11-24T11:05:00.000Z',
    }] }),
  }))

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
  await expect(page.getByText('Se creó el contacto manual.')).toBeVisible()
  await expect(page.getByText('SUV familiar de Andrea', { exact: true })).toBeVisible()
  await expect(page.getByText('Se creó la oportunidad SUV familiar de Andrea.')).toBeVisible()
  await page.getByRole('button', { name: 'Editar' }).click()
  const edit = page.getByRole('dialog', { name: 'Editar contacto' })
  await edit.getByLabel('Nombre').fill('Andrea Gómez Editada')
  await edit.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('dialog', { name: 'Andrea Gómez Editada' })).toBeVisible()
  await expect(page.getByText('Se actualizaron campos de la ficha: nombre.')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('contact-activity.png'), fullPage: true })
})

test('dealer contacts paginate and apply the selected search, channel, consent, and sort filters', async ({ page }) => {
  const dealerId = '11111111-1111-4111-8111-111111111111'
  const contacts = Array.from({ length: 26 }, (_, index) => {
    const number = String(index + 1).padStart(3, '0')
    const channel = index % 2 === 0 ? 'messenger' : 'instagram'
    const consentState = index % 3 === 0 ? 'granted' : 'unknown'
    return {
      id: `contact-${number}`, dealerId, providerContactId: `synthetic-${number}`, displayName: `Contacto ${number}`,
      source: index % 4 === 0 ? 'manual' : 'meta', phone: null, email: `contact${number}@example.test`,
      preferredLanguage: 'es', consentState, createdAt: '2026-11-25T10:00:00.000Z', updatedAt: '2026-11-25T10:00:00.000Z',
      conversationCount: 0, lastActivity: null, channels: [channel],
    }
  })
  const listRequests: URL[] = []
  await page.route('**/backend/auth/session', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, user: { id: 'dealer-user-contacts-list', email: 'qa@dealer.local', displayName: 'Asesor QA', accountType: 'user' } }),
  }))
  await page.route('**/backend/auth/contacts**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/contacts/dealers')) return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ dealers: [{ id: dealerId, name: 'Dealer Contactos QA' }] }),
    })
    if (route.request().method() !== 'GET' || !url.pathname.endsWith('/contacts')) return route.fallback()
    listRequests.push(url)
    let filtered = contacts
    const query = (url.searchParams.get('search') ?? '').toLocaleLowerCase('es')
    const channel = url.searchParams.get('channel')
    const consent = url.searchParams.get('consentState')
    if (query) filtered = filtered.filter((contact) => contact.displayName.toLocaleLowerCase('es').includes(query))
    if (channel) filtered = filtered.filter((contact) => contact.channels.includes(channel))
    if (consent) filtered = filtered.filter((contact) => contact.consentState === consent)
    if (url.searchParams.get('sort') === 'name') filtered = [...filtered].sort((left, right) => left.displayName.localeCompare(right.displayName, 'es'))
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const limit = Number(url.searchParams.get('limit') ?? 25)
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ contacts: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset }),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Contactos' }).click()
  await expect(page.getByText('Contacto 001', { exact: true })).toBeVisible()
  await expect(page.getByText('Mostrando 1–25 de 26')).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText('Contacto 026', { exact: true })).toBeVisible()
  await expect(page.getByText('Mostrando 26–26 de 26')).toBeVisible()
  expect(listRequests.at(-1)?.searchParams.get('offset')).toBe('25')

  await page.getByRole('button', { name: 'Anterior' }).click()
  await expect(page.getByText('Contacto 001', { exact: true })).toBeVisible()
  await page.getByLabel('Canal').selectOption('instagram')
  await expect(page.getByText('13 contactos', { exact: true })).toBeVisible()
  expect(listRequests.at(-1)?.searchParams.get('channel')).toBe('instagram')

  await page.getByLabel('Consentimiento').selectOption('granted')
  await expect(page.getByText('4 contactos', { exact: true })).toBeVisible()
  expect(listRequests.at(-1)?.searchParams.get('consentState')).toBe('granted')
  expect(listRequests.at(-1)?.searchParams.get('offset')).toBe('0')

  await page.getByLabel('Ordenar contactos').selectOption('name')
  await expect.poll(() => listRequests.at(-1)?.searchParams.get('sort')).toBe('name')
  await page.getByPlaceholder('Buscar contactos').fill('Contacto 022')
  await expect(page.getByText('Contacto 022', { exact: true })).toBeVisible()
  await expect.poll(() => listRequests.at(-1)?.searchParams.get('search')).toBe('Contacto 022')
  expect(listRequests.at(-1)?.searchParams.get('channel')).toBe('instagram')
  expect(listRequests.at(-1)?.searchParams.get('consentState')).toBe('granted')
})

test('dealer can create a contact when phone is missing but email identifies the contact', async ({ page }) => {
  const dealerId = '11111111-1111-4111-8111-111111111111'
  const contactId = '77777777-7777-4777-8777-777777777777'
  let createBody: Record<string, unknown> | null = null
  const detail = {
    id: contactId, dealerId, providerContactId: 'manual:incomplete-e2e', displayName: 'Contacto con datos mínimos',
    source: 'manual', phone: null, email: 'qa-contact@example.test', preferredLanguage: 'unknown', consentState: 'unknown',
    createdAt: '2026-11-26T10:00:00.000Z', updatedAt: '2026-11-26T10:00:00.000Z', activities: [], conversations: [],
  }
  await page.route('**/backend/auth/session', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, user: { id: 'dealer-user-minimal', email: 'qa@dealer.local', displayName: 'Asesor QA', accountType: 'user' } }),
  }))
  await page.route('**/backend/auth/opportunities?*', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ opportunities: [] }),
  }))
  await page.route('**/backend/auth/contacts**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/contacts/dealers')) return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ dealers: [{ id: dealerId, name: 'Dealer Datos Mínimos' }] }),
    })
    if (request.method() === 'POST' && url.pathname.endsWith('/contacts')) {
      createBody = request.postDataJSON() as Record<string, unknown>
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ contact: detail }) })
    }
    if (request.method() === 'GET' && url.pathname.endsWith(`/${contactId}`)) return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ contact: detail }),
    })
    if (request.method() === 'GET' && url.pathname.endsWith('/contacts')) return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ contacts: [], total: 0, limit: 25, offset: 0 }),
    })
    return route.fallback()
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Contactos' }).click()
  await page.locator('.contacts-state').getByRole('button', { name: 'Nuevo contacto' }).click()
  const editor = page.getByRole('dialog', { name: 'Nuevo contacto' })
  await editor.getByLabel('Nombre').fill('Contacto con datos mínimos')
  await editor.getByLabel('Correo electrónico').fill('qa-contact@example.test')
  await editor.getByRole('button', { name: 'Crear contacto' }).click()
  await expect(page.getByRole('dialog', { name: 'Contacto con datos mínimos' })).toBeVisible()
  await expect(page.getByText('No disponible', { exact: true })).toHaveCount(1)
  expect(createBody).toMatchObject({ dealerId, displayName: 'Contacto con datos mínimos', phone: null, email: 'qa-contact@example.test' })
})

test('dealer inbox lists local conversations and opens persisted message history', async ({ page }, testInfo) => {
  const dealerId = '11111111-1111-4111-8111-111111111111'
  const contactId = '33333333-3333-4333-8333-333333333333'
  const conversationId = '55555555-5555-4555-8555-555555555555'
  const assigneeId = '66666666-6666-4666-8666-666666666666'
  let messagePosts = 0
  let isRead = false
  let assignedUserId: string | null = null
  await page.setViewportSize({ width: 1536, height: 900 })
  await page.addInitScript(() => {
    if (sessionStorage.getItem('crm-local-reply-test-initialized') !== 'yes') {
      localStorage.clear()
      sessionStorage.setItem('crm-local-reply-test-initialized', 'yes')
    }
    const originalSetItem = Storage.prototype.setItem
    let failNextLocalReply = true
    Storage.prototype.setItem = function (key: string, value: string) {
      if (failNextLocalReply && key.startsWith('bdc-os:local-replies:')) {
        failNextLocalReply = false
        throw new DOMException('Synthetic local storage failure', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    }
  })
  await page.route('**/backend/auth/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, user: { id: 'dealer-user-inbox', email: 'asesor@dealer.local', displayName: 'Asesor Bandeja', accountType: 'user' } }),
  }))
  await page.route('**/backend/auth/contacts/dealers', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ dealers: [{ id: dealerId, name: 'Dealer Inbox Local' }] }),
  }))
  await page.route('**/backend/auth/conversations**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/assignees')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ assignees: [{ id: assigneeId, displayName: 'Asesora Local' }] }) })
    if (request.method() === 'POST') { messagePosts += 1; return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'No existe un endpoint de envío en la simulación local.' }) }) }
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON() as { assignedUserId?: string | null; isRead?: boolean }
      if (Object.hasOwn(body, 'assignedUserId')) assignedUserId = body.assignedUserId ?? null
      if (Object.hasOwn(body, 'isRead')) isRead = body.isRead ?? false
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversation: { id: conversationId, assignedUserId, isRead } }) })
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/conversations')) return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ conversations: [{
        id: conversationId, dealerId, contactId, contactName: 'Ana Prueba', phone: '+1 555 0100', channel: 'messenger',
        owner: null, state: 'open', lastActivity: '2026-11-25T10:00:00.000Z', lastMessage: 'Hola, quiero conocer el inventario.', lastDirection: 'inbound',
        assignedUserId, assignedUserName: assignedUserId ? 'Asesora Local' : null, isRead,
      }], total: 1, limit: 100, offset: 0 }),
    })
    return route.fallback()
  })
  await page.route(`**/backend/auth/contacts/${contactId}?*`, (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ contact: {
      id: contactId, dealerId, providerContactId: 'synthetic-inbox-contact', displayName: 'Ana Prueba', source: 'meta', phone: '+1 555 0100',
      email: null, preferredLanguage: 'es', consentState: 'unknown', createdAt: '2026-11-25T09:00:00.000Z', updatedAt: '2026-11-25T09:00:00.000Z',
      activities: [], conversations: [{ id: conversationId, channel: 'messenger', owner: null, state: 'open', lastActivity: '2026-11-25T10:00:00.000Z', messages: [
        { id: 'message-inbound-e2e', direction: 'inbound', senderType: 'contact', content: 'Hola, quiero conocer el inventario.', createdAt: '2026-11-25T10:00:00.000Z' },
        { id: 'message-outbound-e2e', direction: 'outbound', senderType: 'agent', content: 'Claro, ¿qué tipo de vehículo buscas?', createdAt: '2026-11-25T10:05:00.000Z' },
      ] }],
    } }),
  }))
  await page.goto('/')
  await page.locator('.sidebar .nav-item').filter({ hasText: 'Bandeja' }).click()
  await expect(page.getByRole('heading', { name: 'Bandeja' })).toBeVisible()
  await expect(page.getByText('Revisa las conversaciones locales por canal, asignación y estado de lectura.')).toBeVisible()
  await expect(page.locator('.sidebar .nav-item').filter({ hasText: 'Bandeja' }).locator('b')).toHaveCount(0)
  await expect(page.getByLabel('Dealer de la bandeja')).toHaveCount(0)
  await expect(page.getByText('ACCESO DEL DEALER')).toBeVisible()
  await expect(page.getByText('Hola, quiero conocer el inventario.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Ana Prueba/ }).click()
  await expect(page.getByText('Claro, ¿qué tipo de vehículo buscas?', { exact: true })).toBeVisible()
  await expect(page.getByText('La respuesta se guarda solo en este navegador; no se envía a Meta ni al servidor.')).toBeVisible()
  await expect(page.getByText('No leída', { exact: true })).toBeVisible()
  await page.getByLabel('Asignar conversación').selectOption(assigneeId)
  await expect(page.getByText('Asignada a Asesora Local', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Marcar leída' }).click()
  await expect(page.getByRole('button', { name: 'Marcar no leída' })).toBeVisible()
  await expect(page.getByText('No leída', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'No leídas' }).click()
  await expect(page.getByText('No hay conversaciones sin leer')).toBeVisible()
  await page.getByRole('button', { name: 'No leídas' }).click()
  await page.getByLabel('Respuesta de prueba').fill('Respuesta sintética de la asesora.')
  await page.getByRole('button', { name: 'Simular respuesta' }).click()
  await expect(page.getByRole('alert')).toContainText('No pudimos guardar la respuesta simulada')
  await expect(page.getByLabel('Respuesta de prueba')).toHaveValue('Respuesta sintética de la asesora.')
  await page.getByRole('button', { name: 'Reintentar guardado' }).click()
  await expect(page.locator('.inbox-message.simulated').getByText('Respuesta sintética de la asesora.', { exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Respuesta simulada localmente. No se envió a Meta.')
  await expect(page.locator('.inbox-message.outbound')).toHaveCount(2)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Bandeja' })).toBeVisible()
  await expect(page.getByText('Respuesta sintética de la asesora.', { exact: true })).toBeVisible()
  await expect(page.getByText('Asignada a Asesora Local', { exact: true })).toBeVisible()
  await page.locator('.inbox-conversation-card').click()
  await expect(page.getByText('Claro, ¿qué tipo de vehículo buscas?', { exact: true })).toBeVisible()
  await expect(page.locator('.inbox-message.simulated').getByText('Respuesta sintética de la asesora.', { exact: true })).toBeVisible()
  await expect(page.locator('.inbox-conversation-card')).toContainText('Respuesta sintética de la asesora.')
  expect(messagePosts).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('crm02-inbox-local.png'), fullPage: true })
})
