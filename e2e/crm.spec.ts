import { expect, test } from '@playwright/test'

const email = process.env.BDC_E2E_ADMIN_EMAIL ?? 'admin@bdc-os.local'
const password = process.env.BDC_E2E_ADMIN_PASSWORD

if (!password) throw new Error('Define BDC_E2E_ADMIN_PASSWORD con la contraseña local de pruebas antes de ejecutar Playwright.')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('heading', { name: 'Inicia sesión' }).waitFor()
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Tu operación, en un solo lugar' })).toBeVisible()
})

test('CRM dashboard loads and filters the sample work queue', async ({ page }) => {
  await expect(page.locator('.demo-tag')).toBeVisible()
  await page.getByRole('button', { name: 'Prioridad', exact: true }).click()
  await expect(page.getByText('Laura Méndez', { exact: true })).toBeVisible()
  await expect(page.getByText('Andrés Rojas', { exact: true })).toHaveCount(0)
})

test('creates an opportunity in the local demo session', async ({ page }) => {
  await page.getByRole('button', { name: 'Nueva oportunidad' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nueva oportunidad' })
  await dialog.getByLabel('Nombre del contacto').fill('Andrea Gómez')
  await dialog.getByRole('button', { name: 'Crear en demo' }).click()
  await expect(page.getByText('Andrea Gómez')).toBeVisible()
  await expect(page.getByText(/El registro solo vive en esta sesión/)).toHaveCount(0)
})

test('opens a sample contact, navigates, and logs out', async ({ page }) => {
  await page.getByRole('button', { name: /Laura Méndez/ }).click()
  await expect(page.getByRole('dialog', { name: 'Laura Méndez' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar detalle' }).click()
  await page.getByRole('button', { name: 'Automatizaciones' }).click()
  await expect(page.getByRole('heading', { name: 'Automatizaciones' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible()
})
