/**
 * Admin Performance Visual Tests
 *
 * Visual regression tests for performance monitoring page.
 */

import { test, expect } from '@playwright/test'
import {
  setupAdminVisualTest,
  waitForAdminPageReady,
  captureAdminPageScreenshot,
  verifyTabActive,
  navigateToAdminPage,
} from '../../helpers/admin-visual-helpers'
import { seedPerformanceMetrics, seedSecurityLogs } from '../../helpers/admin-test-helpers'

test.describe('Admin Performance Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminVisualTest(page)
  })

  test('performance page renders correctly', async ({ page }) => {
    await seedPerformanceMetrics(20)

    await navigateToAdminPage(page, '/admin/performance')

    await captureAdminPageScreenshot(page, 'admin-performance', 'metrics-tab')
  })

  test('quotas and limits tab renders correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/performance')

    // Click Quotas & Limits tab
    await page.click('button:has-text("Quotas & Limits")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-performance', 'quotas-tab')
  })

  test('error logs tab renders correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/performance')

    // Click Error Logs tab
    await page.click('button:has-text("Error Logs")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-performance', 'error-logs-tab')
  })

  test('performance charts render correctly', async ({ page }) => {
    await seedPerformanceMetrics(30)

    await navigateToAdminPage(page, '/admin/performance')

    // Wait for charts
    await page.waitForSelector('svg', { timeout: 10000 })

    await captureAdminPageScreenshot(page, 'admin-performance', 'charts')
  })
})
