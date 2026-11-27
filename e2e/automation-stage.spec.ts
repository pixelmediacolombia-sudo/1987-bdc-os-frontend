import { mkdirSync } from 'node:fs'
import { expect, test } from './fixtures'

const dealerId = '30000000-0000-4000-8000-000000000001'
const workflowId = '20000000-0000-4000-8000-000000000001'

test('dealer configures an opportunity stage action and saves the draft', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.route('**/backend/auth/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true, user: { id: 'stage-e2e', email: 'qa@dealer.local', displayName: 'QA Dealer', accountType: 'user' } }),
  }))
  await page.route('**/backend/auth/contacts/dealers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ dealers: [{ id: dealerId, name: 'Dealer E2E' }] }),
  }))
  await page.route('**/backend/auth/automation/workflows**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'GET' && url.pathname.endsWith('/workflows')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workflows: [] }) })
    }
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as { name: string }
      const definition = { schemaVersion: 1, name: body.name, nodes: [], edges: [] }
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
        workflow: { id: workflowId, name: body.name, draft: { revision: 1, definition, updatedAt: '2026-11-27T12:00:00.000Z' }, published: null },
        validationIssues: [{ code: 'missing_trigger' }],
      }) })
    }
    if (request.method() === 'PUT') {
      const body = request.postDataJSON() as { name: string; definition: unknown }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        workflow: { id: workflowId, name: body.name, draft: { revision: 2, definition: body.definition, updatedAt: '2026-11-27T12:05:00.000Z' }, published: null },
        validationIssues: [],
      }) })
    }
    return route.fallback()
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Automatizaciones', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Automatizaciones' })).toBeVisible()
  await page.getByRole('button', { name: 'Nueva automatización' }).click()
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Oportunidad calificada → Ganada')
  await page.getByRole('button', { name: 'Crear borrador' }).click()

  await page.getByRole('button', { name: 'Añadir trigger' }).click()
  await page.getByRole('button', { name: 'Seleccionar Evento de CRM' }).click()
  await page.getByRole('combobox', { name: /Evento que inicia el workflow/ }).selectOption('opportunity.stage_changed')
  await page.getByRole('button', { name: /Cambiar etapa Actualizar oportunidad del evento/ }).click()
  await page.getByRole('button', { name: /Fin Cierra una ruta/ }).click()
  await page.getByRole('button', { name: 'Seleccionar Cambiar etapa de oportunidad' }).click()
  await page.getByRole('combobox', { name: 'Nueva etapa de la oportunidad' }).selectOption('won')
  await page.getByRole('button', { name: 'Salida siguiente de Evento de CRM' }).first().click()
  await page.getByRole('button', { name: 'Entrada de Cambiar etapa de oportunidad' }).click()
  await page.getByRole('button', { name: 'Salida siguiente de Cambiar etapa de oportunidad' }).click()
  await page.getByRole('button', { name: 'Entrada de Fin de ruta' }).click()

  await expect(page.getByRole('article').filter({ hasText: 'Cambiar etapa' }).getByText('Ganada', { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Configuración del nodo' }).getByText('Conexión creada.')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByText('Borrador guardado')).toBeVisible()
  const minimapViewport = page.getByLabel('Minimapa del workflow').locator('span')
  const canvasShell = page.locator('.automation-canvas-shell')
  await canvasShell.hover()
  await page.mouse.wheel(0, 320)
  await expect.poll(() => minimapViewport.evaluate((element) => (element as HTMLElement).style.top)).not.toBe('12px')
  await page.mouse.wheel(320, 0)
  await expect.poll(() => minimapViewport.evaluate((element) => (element as HTMLElement).style.left)).not.toBe('12px')
  mkdirSync('output/evidence', { recursive: true })
  await page.screenshot({ path: 'output/evidence/crm-05-f-cambiar-etapa.png', fullPage: true })
})
