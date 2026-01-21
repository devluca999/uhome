/**
 * Admin Users Visual Tests
 *
 * Visual regression tests for admin users page including tables, modals, and actions.
 */

import { test, expect } from '@playwright/test'
import {
  setupAdminVisualTest,
  waitForAdminPageReady,
  captureAdminPageScreenshot,
  verifyTabActive,
  verifyModalVisible,
  navigateToAdminPage,
} from '../../helpers/admin-visual-helpers'
import { seedAdminTestScenario } from '../../helpers/admin-test-helpers'

test.describe('Admin Users Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminVisualTest(page)
  })

  test('users page renders correctly', async ({ page }) => {
    await seedAdminTestScenario()

    await navigateToAdminPage(page, '/admin/users')

    await captureAdminPageScreenshot(page, 'admin-users', 'landlords-tab')
  })

  test('tenants tab renders correctly', async ({ page }) => {
    await seedAdminTestScenario()

    await navigateToAdminPage(page, '/admin/users')

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-users', 'tenants-tab')
  })

  test('suspended tab renders correctly', async ({ page }) => {
    await seedAdminTestScenario()

    await navigateToAdminPage(page, '/admin/users')

    // Click Suspended tab
    await page.click('button:has-text("Suspended")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-users', 'suspended-tab')
  })

  test('ban user modal renders correctly', async ({ page }) => {
    await seedAdminTestScenario()

    await navigateToAdminPage(page, '/admin/users')

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Find first user and click ban button
    const banButton = page.locator('button[title*="Ban"]').first()
    if (await banButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await banButton.click()
      await page.waitForTimeout(500)

      // Verify modal is visible
      const isVisible = await verifyModalVisible(page, 'Ban User')
      expect(isVisible).toBe(true)

      await captureAdminPageScreenshot(page, 'admin-users', 'ban-modal')
    }
  })

  test('table layout is correct', async ({ page }) => {
    await seedAdminTestScenario()

    await navigateToAdminPage(page, '/admin/users')

    // Verify table structure
    const table = page.locator('table').first()
    await expect(table).toBeVisible()

    await captureAdminPageScreenshot(page, 'admin-users', 'table-layout')
  })

  test('status badges display correctly', async ({ page }) => {
    await seedAdminTestScenario()

    await navigateToAdminPage(page, '/admin/users')

    await captureAdminPageScreenshot(page, 'admin-users', 'status-badges')
  })
})
