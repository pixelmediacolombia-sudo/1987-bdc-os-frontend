import { mkdirSync } from 'node:fs'
import { expect, test } from './fixtures'

const dealerId = '30000000-0000-4000-8000-000000000001'
const workflowId = '20000000-0000-4000-8000-000000000001'

test('dealer configures an opportunity stage action and saves the draft', async ({ page }) => {
  let savedWorkflow: { name: string; definition: unknown } | null = null
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
    if (request.method() === 'GET' && url.pathname.endsWith(`/workflows/${workflowId}`) && savedWorkflow) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        workflow: { id: workflowId, name: savedWorkflow.name, draft: { revision: 2, definition: savedWorkflow.definition, updatedAt: '2026-11-27T12:05:00.000Z' }, published: null },
        validationIssues: [],
      }) })
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
      savedWorkflow = { name: body.name, definition: body.definition }
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
  const minimap = page.getByLabel('Minimapa del workflow')
  const canvasShell = page.locator('.automation-canvas-shell')
  const canvasBounds = await canvasShell.boundingBox()
  const minimapBounds = await minimap.boundingBox()
  if (!canvasBounds) throw new Error('Canvas shell is not visible')
  if (!minimapBounds) throw new Error('Canvas minimap is not visible')
  const panStart = { x: canvasBounds.x + 80, y: canvasBounds.y + 220 }
  await page.mouse.move(panStart.x, panStart.y)
  await page.mouse.down()
  await page.mouse.move(panStart.x - 160, panStart.y - 130, { steps: 12 })
  await page.mouse.up()
  await expect.poll(() => canvasShell.evaluate((shell: HTMLElement) => shell.scrollLeft)).toBeGreaterThan(0)
  await expect.poll(() => canvasShell.evaluate((shell: HTMLElement) => shell.scrollTop)).toBeGreaterThan(0)
  await expect.poll(() => minimapViewport.evaluate((element) => Number.parseFloat((element as HTMLElement).style.top))).toBeGreaterThan(12)
  await expect.poll(() => minimapViewport.evaluate((element) => Number.parseFloat((element as HTMLElement).style.left))).toBeGreaterThan(12)
  await expect.poll(async () => {
    const bounds = await minimap.boundingBox()
    return bounds ? { x: bounds.x, y: bounds.y } : null
  }).toEqual({ x: minimapBounds.x, y: minimapBounds.y })
  mkdirSync('output/evidence', { recursive: true })
  await page.screenshot({ path: 'output/evidence/crm-05-f-cambiar-etapa.png', fullPage: true })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Volver a automatizaciones' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Nombre del borrador' })).toHaveValue('Oportunidad calificada → Ganada')
})
