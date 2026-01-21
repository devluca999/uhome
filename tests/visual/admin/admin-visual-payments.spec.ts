/**
 * Admin Payments Visual Tests
 *
 * Visual regression tests for payments page.
 */

import { test, expect } from '@playwright/test'
import {
  setupAdminVisualTest,
  waitForAdminPageReady,
  captureAdminPageScreenshot,
  verifyTabActive,
  navigateToAdminPage,
} from '../../helpers/admin-visual-helpers'

test.describe('Admin Payments Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminVisualTest(page)
  })

  test('payments page renders correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/payments')
    await captureAdminPageScreenshot(page, 'admin-payments', 'revenue-tab')
  })

  test('failed transactions tab renders correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/payments')

    // Click Failed Transactions tab
    await page.click('button:has-text("Failed Transactions")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-payments', 'failed-transactions-tab')
  })

  test('subscription analytics tab renders correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/payments')

    // Click Subscription Analytics tab
    await page.click('button:has-text("Subscription Analytics")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-payments', 'subscription-analytics-tab')
  })

  test('revenue charts render correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/payments')

    // Wait for charts
    await page.waitForSelector('svg', { timeout: 10000 }).catch(() => {})

    await captureAdminPageScreenshot(page, 'admin-payments', 'revenue-charts')
  })
})
