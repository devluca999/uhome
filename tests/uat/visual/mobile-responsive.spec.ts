/**
 * Mobile Responsive Visual UAT Tests
 *
 * Tests UI responsiveness across breakpoints:
 * - Tablet view
 * - Mobile view
 * - Layout correctness
 */

import { test, expect } from '@playwright/test'
import {
  verifyStagingEnvironment,
  setupUATScenario,
  waitForPageReady,
  cleanupUATTest,
} from '../helpers/uat-helpers'
import { logVisualMismatch } from '../helpers/result-logger'
import { captureUATScreenshot } from '../helpers/screenshot-manager'

const pages = [
  { path: '/landlord/dashboard', name: 'dashboard' },
  { path: '/landlord/finances', name: 'finances' },
  { path: '/landlord/properties', name: 'properties' },
  { path: '/landlord/tenants', name: 'tenants' },
  { path: '/landlord/operations', name: 'operations' },
]

test.describe('Mobile Responsive Visual UAT', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    verifyStagingEnvironment()
    await cleanupUATTest(page)
  })

  for (const pageInfo of pages) {
    test(`${pageInfo.name} - tablet view (768px)`, async ({ page }) => {
      const seeded = await setupUATScenario({ propertyName: 'Mobile Test Property' })

      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto(`${baseUrl}/login`)
      await page.fill('input[type="email"]', seeded.landlord.email)
      await page.fill('input[type="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/landlord/, { timeout: 10000 })

      await page.goto(`${baseUrl}${pageInfo.path}`)
      await waitForPageReady(page)

      await captureUATScreenshot(page, pageInfo.name, 'tablet', { fullPage: true }, '768px')
    })

    test(`${pageInfo.name} - mobile view (375px)`, async ({ page }) => {
      const seeded = await setupUATScenario({ propertyName: 'Mobile Test Property' })

      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(`${baseUrl}/login`)
      await page.fill('input[type="email"]', seeded.landlord.email)
      await page.fill('input[type="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/landlord/, { timeout: 10000 })

      await page.goto(`${baseUrl}${pageInfo.path}`)
      await waitForPageReady(page)

      await captureUATScreenshot(page, pageInfo.name, 'mobile', { fullPage: true }, '375px')
    })
  }
})
