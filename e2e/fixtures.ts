import { test as base, expect, type Page } from '@playwright/test'

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.continue()
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1') {
        return route.continue()
      }
      return route.abort('blockedbyclient')
    })
    await use(page)
  },
})

export { expect }
export type { Page }
