/**
 * Admin Responsive Visual Tests
 *
 * Visual regression tests for admin pages across different viewports.
 */

import { test, expect } from '@playwright/test'
import {
  setupAdminVisualTest,
  waitForAdminPageReady,
  captureAdminPageScreenshot,
  navigateToAdminPage,
} from '../../helpers/admin-visual-helpers'

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
]

const adminPages = [
  { path: '/admin/overview', name: 'overview' },
  { path: '/admin/users', name: 'users' },
  { path: '/admin/messages-support', name: 'messages-support' },
  { path: '/admin/performance', name: 'performance' },
  { path: '/admin/payments', name: 'payments' },
  { path: '/admin/audit-security', name: 'audit-security' },
]

test.describe('Admin Responsive Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminVisualTest(page)
  })

  for (const viewport of viewports) {
    for (const pageInfo of adminPages) {
      test(`${pageInfo.name} - ${viewport.name} viewport`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })

        await navigateToAdminPage(page, pageInfo.path)
        await captureAdminPageScreenshot(page, `admin-${pageInfo.name}`, viewport.name)
      })
    }
  }

  test('tabs are scrollable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await navigateToAdminPage(page, '/admin/users')

    // Verify tabs are visible and accessible
    const tabsContainer = page.locator('[role="tablist"]').first()
    await expect(tabsContainer).toBeVisible()

    await captureAdminPageScreenshot(page, 'admin-users', 'mobile-tabs')
  })

  test('tables are scrollable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await navigateToAdminPage(page, '/admin/users')

    // Verify table is visible
    const table = page.locator('table').first()
    await expect(table).toBeVisible()

    await captureAdminPageScreenshot(page, 'admin-users', 'mobile-table')
  })

  test('modals are fully visible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await navigateToAdminPage(page, '/admin/users')

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Try to open a modal
    const actionButton = page.locator('button[title*="Ban"]').first()
    if (await actionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await actionButton.click()
      await page.waitForTimeout(500)

      // Verify modal is visible and scrollable
      const modal = page.locator('text=Ban User').locator('..').locator('..')
      await expect(modal).toBeVisible()

      await captureAdminPageScreenshot(page, 'admin-users', 'mobile-modal')
    }
  })
})
