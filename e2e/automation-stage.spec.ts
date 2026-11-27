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
  const minimapViewport = page.getByRole('img', { name: /^Minimapa del workflow/ }).locator('span')
  const minimap = page.getByRole('img', { name: /^Minimapa del workflow/ })
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
  const backBounds = await page.getByRole('button', { name: 'Volver a automatizaciones' }).boundingBox()
  const nameBounds = await page.getByRole('textbox', { name: 'Nombre del borrador' }).boundingBox()
  if (!backBounds || !nameBounds) throw new Error('Editor header controls are not visible')
  expect(Math.abs(backBounds.y + backBounds.height / 2 - (nameBounds.y + nameBounds.height / 2))).toBeLessThanOrEqual(2)
  mkdirSync('output/evidence', { recursive: true })
  await page.screenshot({ path: 'output/evidence/crm-05-f-cambiar-etapa.png', fullPage: true })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Volver a automatizaciones' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Nombre del borrador' })).toHaveValue('Oportunidad calificada → Ganada')
})

test('dealer reviews a failed automation run and confirms a replay', async ({ page }) => {
  const runId = '40000000-0000-4000-8000-000000000001'
  let replayCount = 0
  const runs = [{
    id: runId, status: 'failed', generation: 1, eventType: 'opportunity.stage_changed', workflowRevision: 3,
    currentNodeId: null, attempts: 4, availableAt: '2026-11-27T15:00:00.000Z', lastError: 'La actualización de la etapa falló.',
    createdAt: '2026-11-27T14:00:00.000Z', startedAt: '2026-11-27T14:01:00.000Z', finishedAt: '2026-11-27T14:02:00.000Z',
    steps: [{ nodeId: 'node-stage', nodeType: 'opportunity.update_stage', status: 'failed', attempts: 4, output: { stage: 'working' }, error: 'No se pudo actualizar la oportunidad.', startedAt: '2026-11-27T14:01:00.000Z', finishedAt: '2026-11-27T14:02:00.000Z' }],
  }]
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.route('**/backend/auth/session', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: { id: 'history-e2e', email: 'qa@dealer.local', displayName: 'QA Dealer', accountType: 'user' } }) }))
  await page.route('**/backend/auth/contacts/dealers', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dealers: [{ id: dealerId, name: 'Dealer E2E' }] }) }))
  await page.route('**/backend/auth/automation/workflows**', async (route) => {
    const request = route.request(); const url = new URL(request.url())
    if (request.method() === 'GET' && url.pathname.endsWith('/workflows')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workflows: [] }) })
    if (request.method() === 'POST') return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ workflow: { id: workflowId, name: 'Workflow con ejecuciones', draft: { revision: 1, definition: { schemaVersion: 1, name: 'Workflow con ejecuciones', nodes: [], edges: [] }, updatedAt: '2026-11-27T12:00:00.000Z' }, published: null }, validationIssues: [] }) })
    return route.fallback()
  })
  await page.route(`**/backend/auth/automation/workflows/${workflowId}/runs**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ runs }) }))
  await page.route('**/backend/auth/automation/runs/*/replay', async (route) => {
    replayCount++
    expect(route.request().postDataJSON()).toMatchObject({ dealerId })
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ run: { id: '40000000-0000-4000-8000-000000000002', status: 'queued', generation: 2 } }) })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Automatizaciones', exact: true }).click()
  await page.getByRole('button', { name: 'Nueva automatización' }).click()
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Workflow con ejecuciones')
  await page.getByRole('button', { name: 'Crear borrador' }).click()
  await page.getByRole('button', { name: 'Ejecuciones' }).click()
  await expect(page.getByRole('heading', { name: 'opportunity.stage_changed' })).toBeVisible()
  await expect(page.getByText('La actualización de la etapa falló.')).toBeVisible()
  await expect(page.getByText('No se pudo actualizar la oportunidad.')).toBeVisible()
  mkdirSync('output/evidence', { recursive: true })
  await page.screenshot({ path: 'output/evidence/crm-05-i-historial-ejecuciones.png', fullPage: true })
  await page.getByRole('button', { name: 'Reproducir desde el inicio' }).click()
  await expect(page.getByRole('dialog', { name: '¿Reproducir esta ejecución?' })).toBeVisible()
  await expect(page.getByText('puede volver a ejecutar acciones CRM.')).toBeVisible()
  expect(replayCount).toBe(0)
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect.poll(() => replayCount).toBe(1)
})

test('dealer builds and publishes the supported opportunity workflow', async ({ page }) => {
  const draft = { schemaVersion: 1, name: 'Oportunidad nueva → en proceso', nodes: [], edges: [] }
  let savedDefinition: unknown = draft
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.route('**/backend/auth/session', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: { id: 'workflow-e2e', email: 'qa@dealer.local', displayName: 'QA Dealer', accountType: 'user' } }) }))
  await page.route('**/backend/auth/contacts/dealers', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dealers: [{ id: dealerId, name: 'Dealer E2E' }] }) }))
  await page.route('**/backend/auth/automation/workflows**', async (route) => {
    const request = route.request(); const url = new URL(request.url())
    if (request.method() === 'GET' && url.pathname.endsWith('/workflows')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workflows: [] }) })
    if (request.method() === 'POST' && url.pathname.endsWith('/publish')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workflow: { id: workflowId, name: 'Oportunidad nueva → en proceso', draft: { revision: 2, definition: savedDefinition, updatedAt: '2026-11-27T12:00:00.000Z' }, published: { revision: 2, definition: savedDefinition, publishedAt: '2026-11-27T12:01:00.000Z' } }, validationIssues: [] }) })
    if (request.method() === 'POST') return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ workflow: { id: workflowId, name: draft.name, draft: { revision: 1, definition: draft, updatedAt: '2026-11-27T12:00:00.000Z' }, published: null }, validationIssues: [] }) })
    if (request.method() === 'PUT') { const body = request.postDataJSON() as { name: string; definition: unknown }; savedDefinition = body.definition; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workflow: { id: workflowId, name: body.name, draft: { revision: 2, definition: body.definition, updatedAt: '2026-11-27T12:00:00.000Z' }, published: null }, validationIssues: [] }) }) }
    return route.fallback()
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Automatizaciones', exact: true }).click()
  await page.getByRole('button', { name: 'Nueva automatización' }).click()
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Oportunidad nueva → en proceso')
  await page.getByRole('button', { name: 'Crear borrador' }).click()
  await page.getByRole('button', { name: 'Añadir trigger' }).click()
  await page.getByRole('button', { name: 'Seleccionar Evento de CRM' }).click()
  await page.getByRole('combobox', { name: /^Evento que inicia el workflow/ }).selectOption('opportunity.created')
  await page.getByRole('button', { name: /Cambiar etapa.*Actualizar oportunidad/ }).click()
  await page.getByRole('combobox', { name: 'Nueva etapa de la oportunidad' }).selectOption('working')
  await page.getByRole('button', { name: /Fin.*Cierra una ruta/ }).click()
  await page.getByRole('button', { name: 'Salida siguiente de Evento de CRM' }).click()
  await page.getByRole('button', { name: 'Entrada de Cambiar etapa de oportunidad' }).click()
  await page.getByRole('button', { name: 'Salida siguiente de Cambiar etapa de oportunidad' }).click()
  await page.getByRole('button', { name: 'Entrada de Fin de ruta' }).click()
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByRole('button', { name: 'Publicar' })).toBeEnabled()
  await page.getByRole('button', { name: 'Publicar' }).click()
  await expect(page.getByText('Workflow publicado · v2')).toBeVisible()
  await expect(page.locator('.automation-canvas-toolbar')).toContainText('Publicado · v2')
  mkdirSync('output/evidence', { recursive: true })
  await page.screenshot({ path: 'output/evidence/crm-05f-workflow-oportunidad-publicado.png', fullPage: true })
})
