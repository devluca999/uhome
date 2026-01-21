/**
 * Admin Overview Visual Tests
 *
 * Visual regression tests for admin overview page including tabs and charts.
 */

import { test, expect } from '@playwright/test'
import {
  setupAdminVisualTest,
  waitForAdminPageReady,
  captureAdminPageScreenshot,
  verifyTabActive,
} from '../../helpers/admin-visual-helpers'

test.describe('Admin Overview Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminVisualTest(page)
  })

  test('overview page renders correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/overview')
    await captureAdminPageScreenshot(page, 'admin-overview', 'metrics-tab')
  })

  test('transactions tab renders correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/overview')

    // Click Transactions tab
    await page.click('button:has-text("Transactions")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-overview', 'transactions-tab')
  })

  test('system load tab renders correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/overview')

    // Click System Load tab
    await page.click('button:has-text("System Load")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-overview', 'system-load-tab')
  })

  test('charts render correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/overview')

    // Wait for charts
    await page.waitForSelector('svg', { timeout: 10000 })

    // Capture screenshot focusing on charts
    await captureAdminPageScreenshot(page, 'admin-overview', 'charts')
  })

  test('active tab is visually highlighted', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/overview')

    // Verify Metrics tab is active
    const isActive = await verifyTabActive(page, 'Metrics')
    expect(isActive).toBe(true)

    // Switch to Transactions
    await page.click('button:has-text("Transactions")')
    await page.waitForTimeout(500)

    // Verify Transactions tab is now active
    const isTransactionsActive = await verifyTabActive(page, 'Transactions')
    expect(isTransactionsActive).toBe(true)
  })
})
