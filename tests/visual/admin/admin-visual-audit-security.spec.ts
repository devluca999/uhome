/**
 * Admin Audit & Security Visual Tests
 *
 * Visual regression tests for audit and security page.
 */

import { test, expect } from '@playwright/test'
import {
  setupAdminVisualTest,
  waitForAdminPageReady,
  captureAdminPageScreenshot,
  verifyTabActive,
  navigateToAdminPage,
} from '../../helpers/admin-visual-helpers'
import { seedAuditLogs, seedSecurityLogs } from '../../helpers/admin-test-helpers'

test.describe('Admin Audit & Security Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminVisualTest(page)
  })

  test('audit-security page renders correctly', async ({ page }) => {
    await seedAuditLogs(20)

    await navigateToAdminPage(page, '/admin/audit-security')

    await captureAdminPageScreenshot(page, 'admin-audit-security', 'audit-logs-tab')
  })

  test('security alerts tab renders correctly', async ({ page }) => {
    await seedSecurityLogs(15)

    await navigateToAdminPage(page, '/admin/audit-security')

    // Click Security Alerts tab
    await page.click('button:has-text("Security Alerts")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-audit-security', 'security-alerts-tab')
  })

  test('system behavior tab renders correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/audit-security')

    // Click System Behavior tab
    await page.click('button:has-text("System Behavior")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-audit-security', 'system-behavior-tab')
  })

  test('audit log table renders correctly', async ({ page }) => {
    await seedAuditLogs(30)

    await navigateToAdminPage(page, '/admin/audit-security')

    await captureAdminPageScreenshot(page, 'admin-audit-security', 'audit-log-table')
  })

  test('security alert badges render correctly', async ({ page }) => {
    await seedSecurityLogs(10)

    await navigateToAdminPage(page, '/admin/audit-security')

    // Click Security Alerts tab
    await page.click('button:has-text("Security Alerts")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-audit-security', 'security-badges')
  })
})
