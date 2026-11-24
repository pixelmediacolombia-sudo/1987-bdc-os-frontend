import { expect, test } from '@playwright/test'

test('local admin can run a synthetic multi-turn Sofia conversation without Meta', async ({ page }, testInfo) => {
  const calls: string[] = []
  let conversationId = ''
  let messages: Array<{ id: string; direction: 'inbound' | 'outbound'; content: string; createdAt: string }> = []
  await page.route('**/backend/auth/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, user: { id: 'admin-local-e2e', email: 'admin@bdc-os.local', displayName: 'Admin local', accountType: 'admin' } }),
  }))
  await page.route('**/backend/auth/admin/dealers', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dealers: [] }) }))
  await page.route('**/backend/auth/local/sofia-simulator/status', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: true, localOnly: true, sendsMessages: false, contactName: 'Andrea Demo', modelHost: 'api.openai.com', modelMode: 'OpenAI interpreta; Sofia genera la respuesta con reglas del backend.' }),
  }))
  await page.route('**/backend/auth/local/sofia-simulator/turn', async (route) => {
    const body = route.request().postDataJSON() as { message: string; conversationId?: string }
    calls.push(body.message)
    conversationId ||= 'local-conversation-e2e'
    messages = [...messages, { id: 'in-' + calls.length, direction: 'inbound', content: body.message, createdAt: '2026-11-24T15:00:00.000Z' }]
    const response = calls.length === 1
      ? 'Con gusto le ayudo. ¿Qué presupuesto tiene previsto para el enganche?'
      : 'Entendido. ¿En cuánto tiempo espera comprar el vehículo?'
    messages = [...messages, { id: 'out-' + calls.length, direction: 'outbound', content: response, createdAt: '2026-11-24T15:00:01.000Z' }]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        conversationId,
        contact: { name: 'Andrea Demo', providerContactId: 'local-contact-e2e' },
        messages,
        sofia: { response, facts: calls.length === 1 ? { vehicle_category: 'suv' } : { vehicle_category: 'suv', down_payment_declared: 1500 }, leadLevel: 'C', nextStep: 'ask' },
        openai: { status: 'ok', extraction: { facts: calls.length === 1 ? { vehicle_category: 'suv' } : { down_payment_declared: 1500 }, intent: 'vehicle_inquiry', missingFields: ['purchase_timeline'] }, modelFacts: calls.length === 1 ? { vehicle_category: 'suv' } : { down_payment_declared: 1500 }, safetyIssues: [], responseSource: 'deterministic_rule' },
      }),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Simulador Sofia' }).click()
  await expect(page.getByRole('heading', { name: 'Simulador de conversaciones' })).toBeVisible()
  await page.getByLabel('Mensaje del contacto simulado').fill('Hola, busco una SUV para mi familia.')
  await page.getByRole('button', { name: 'Enviar turno local' }).click()
  await expect(page.getByText('Con gusto le ayudo. ¿Qué presupuesto tiene previsto para el enganche?')).toBeVisible()
  await expect(page.getByText('Tipo de vehículo')).toBeVisible()
  await page.getByLabel('Mensaje del contacto simulado').fill('Tengo 1500 para el enganche.')
  await page.getByRole('button', { name: 'Enviar turno local' }).click()
  await expect(page.getByText('Entendido. ¿En cuánto tiempo espera comprar el vehículo?')).toBeVisible()
  await expect(page.getByText('$1.500')).toBeVisible()
  expect(calls).toEqual(['Hola, busco una SUV para mi familia.', 'Tengo 1500 para el enganche.'])
  await page.screenshot({ path: testInfo.outputPath('local-sofia-simulator.png'), fullPage: true })
})
