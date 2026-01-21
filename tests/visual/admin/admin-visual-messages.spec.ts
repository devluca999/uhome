/**
 * Admin Messages & Support Visual Tests
 *
 * Visual regression tests for messages and support page.
 */

import { test, expect } from '@playwright/test'
import {
  setupAdminVisualTest,
  waitForAdminPageReady,
  captureAdminPageScreenshot,
  verifyTabActive,
  navigateToAdminPage,
} from '../../helpers/admin-visual-helpers'
import { seedSupportTickets, seedConversations } from '../../helpers/admin-test-helpers'

test.describe('Admin Messages & Support Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminVisualTest(page)
  })

  test('messages-support page renders correctly', async ({ page }) => {
    await seedSupportTickets(5)

    await navigateToAdminPage(page, '/admin/messages-support')

    await captureAdminPageScreenshot(page, 'admin-messages-support', 'tickets-tab')
  })

  test('conversations tab renders correctly', async ({ page }) => {
    await seedConversations(3)

    await navigateToAdminPage(page, '/admin/messages-support')

    // Click Conversations tab
    await page.click('button:has-text("Conversations")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-messages-support', 'conversations-tab')
  })

  test('announcements tab renders correctly', async ({ page }) => {
    await navigateToAdminPage(page, '/admin/messages-support')

    // Click Announcements tab
    await page.click('button:has-text("Announcements")')
    await page.waitForTimeout(500)
    await waitForAdminPageReady(page)

    await captureAdminPageScreenshot(page, 'admin-messages-support', 'announcements-tab')
  })

  test('support tickets list renders correctly', async ({ page }) => {
    await seedSupportTickets(10)

    await navigateToAdminPage(page, '/admin/messages-support')

    await captureAdminPageScreenshot(page, 'admin-messages-support', 'tickets-list')
  })
})
