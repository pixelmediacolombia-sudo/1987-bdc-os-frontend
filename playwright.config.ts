import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.BDC_FRONTEND_URL ?? 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    channel: process.env.BDC_PLAYWRIGHT_CHANNEL || undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
