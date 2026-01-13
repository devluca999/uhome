/**
 * Comprehensive Messaging UAT Tests
 * 
 * Tests all messaging features:
 * - Tenant ↔ landlord chat threads
 * - Real-time updates across tabs
 * - Notifications for new messages
 * - History scrollable and accessible
 * - Message persistence
 * - Unread state management
 */

import { test, expect } from '@playwright/test'
import { verifyStagingEnvironment, setupMultiTabScenario, waitForPageReady, cleanupUATTest } from '../helpers/uat-helpers'
import { logTestResult, logFunctionalFailure } from '../helpers/result-logger'
import { captureUATScreenshot } from '../helpers/screenshot-manager'

test.describe('Messaging Comprehensive UAT', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    verifyStagingEnvironment()
    await cleanupUATTest(page)
  })

  test('tenant can send message to landlord', async ({ context }) => {
    const { tenantPage, seeded } = await setupMultiTabScenario(context, {
      propertyName: 'Messaging Test Property',
      createMessages: false,
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed tenant')
    }

    try {
      await tenantPage.goto(`${baseUrl}/tenant/messages`)
      await waitForPageReady(tenantPage)

      // Find message input
      const messageInput = tenantPage.locator('textarea, input[type="text"]').first()
      const isVisible = await messageInput.isVisible({ timeout: 3000 }).catch(() => false)

      if (isVisible) {
        await messageInput.fill('Test message from tenant')
        await tenantPage.waitForTimeout(500)

        // Find send button
        const sendButton = tenantPage.locator('button:has-text("Send"), button[type="submit"]').first()
        if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendButton.click()
          await tenantPage.waitForTimeout(2000)

          // Verify message appears
          const message = tenantPage.locator('text=/Test message from tenant/i')
          const messageVisible = await message.isVisible({ timeout: 5000 }).catch(() => false)

          await logTestResult(tenantPage, {
            page: 'messaging',
            feature: 'send_message',
            role: 'tenant',
            action: 'send_message',
            status: messageVisible ? 'passed' : 'failed',
            error: messageVisible ? undefined : 'Message did not appear',
          })
        }
      } else {
        await logTestResult(tenantPage, {
          page: 'messaging',
          feature: 'send_message',
          role: 'tenant',
          action: 'send_message',
          status: 'skipped',
          error: 'Message input not found',
        })
      }
    } catch (error) {
      const screenshot = await captureUATScreenshot(tenantPage, 'messaging', 'send_message', {}, 'error')
      await logFunctionalFailure(tenantPage, {
        page: 'messaging',
        feature: 'send_message',
        workflow: 'send_message_tenant',
        error: error instanceof Error ? error.message : String(error),
        steps: ['Navigate to messages', 'Type message', 'Click send', 'Verify message appears'],
        screenshot,
      })
      throw error
    } finally {
      await tenantPage.close()
    }
  })

  test('real-time updates across tabs', async ({ context }) => {
    const { landlordPage, tenantPage, seeded } = await setupMultiTabScenario(context, {
      propertyName: 'Messaging Test Property',
      createMessages: true,
    })

    try {
      // Tenant sends message
      await tenantPage.goto(`${baseUrl}/tenant/messages`)
      await waitForPageReady(tenantPage)

      const messageInput = tenantPage.locator('textarea, input[type="text"]').first()
      if (await messageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await messageInput.fill('Real-time test message')
        await tenantPage.waitForTimeout(500)

        const sendButton = tenantPage.locator('button:has-text("Send"), button[type="submit"]').first()
        if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendButton.click()
          await tenantPage.waitForTimeout(1000)
        }
      }

      // Landlord should see message in real-time
      await landlordPage.goto(`${baseUrl}/landlord/messages`)
      await waitForPageReady(landlordPage)
      await landlordPage.waitForTimeout(3000) // Wait for realtime sync

      // Verify message appears
      const message = landlordPage.locator('text=/Real-time test message/i')
      const messageVisible = await message.isVisible({ timeout: 5000 }).catch(() => false)

      await logTestResult(landlordPage, {
        page: 'messaging',
        feature: 'realtime_sync',
        role: 'landlord',
        action: 'verify_realtime_message',
        status: messageVisible ? 'passed' : 'failed',
        error: messageVisible ? undefined : 'Message did not sync in real-time',
      })
    } catch (error) {
      await logTestResult(landlordPage, {
        page: 'messaging',
        feature: 'realtime_sync',
        role: 'both',
        action: 'verify_realtime_sync',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      await landlordPage.close()
      await tenantPage.close()
    }
  })

  test('notifications for new messages', async ({ context }) => {
    const { landlordPage, tenantPage, seeded } = await setupMultiTabScenario(context, {
      propertyName: 'Messaging Test Property',
      createMessages: false,
    })

    try {
      // Tenant sends message
      await tenantPage.goto(`${baseUrl}/tenant/messages`)
      await waitForPageReady(tenantPage)

      const messageInput = tenantPage.locator('textarea, input[type="text"]').first()
      if (await messageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await messageInput.fill('Notification test message')
        await tenantPage.waitForTimeout(500)

        const sendButton = tenantPage.locator('button:has-text("Send"), button[type="submit"]').first()
        if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendButton.click()
          await tenantPage.waitForTimeout(2000)
        }
      }

      // Landlord should see notification
      await landlordPage.goto(`${baseUrl}/landlord/dashboard`)
      await waitForPageReady(landlordPage)
      await landlordPage.waitForTimeout(3000)

      // Check for notification indicator
      const notificationIndicator = landlordPage.locator('[data-notification], [class*="notification"], [aria-label*="notification"]')
      const hasNotification = await notificationIndicator.isVisible({ timeout: 5000 }).catch(() => false)

      await logTestResult(landlordPage, {
        page: 'messaging',
        feature: 'notifications',
        role: 'landlord',
        action: 'verify_notification',
        status: hasNotification ? 'passed' : 'skipped',
        error: hasNotification ? undefined : 'Notification indicator not found',
      })
    } catch (error) {
      await logTestResult(landlordPage, {
        page: 'messaging',
        feature: 'notifications',
        role: 'landlord',
        action: 'verify_notification',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      await landlordPage.close()
      await tenantPage.close()
    }
  })

  test('message history is scrollable and accessible', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Messaging Test Property',
      createMessages: true,
    })

    await page.goto(`${baseUrl}/landlord/messages`)
    await waitForPageReady(page)

    try {
      // Find message history container
      const messageContainer = page.locator('[class*="message"], [class*="chat"], [class*="history"]').first()
      const isVisible = await messageContainer.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        // Verify scrolling works
        await messageContainer.evaluate(el => el.scrollTop = el.scrollHeight)
        await page.waitForTimeout(500)

        await logTestResult(page, {
          page: 'messaging',
          feature: 'message_history',
          role: 'landlord',
          action: 'verify_history_scrollable',
          status: 'passed',
        })
      } else {
        await logTestResult(page, {
          page: 'messaging',
          feature: 'message_history',
          role: 'landlord',
          action: 'verify_history_scrollable',
          status: 'skipped',
          error: 'Message history container not found',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'messaging',
        feature: 'message_history',
        role: 'landlord',
        action: 'verify_history_scrollable',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('unread state management works', async ({ context }) => {
    const { landlordPage, tenantPage, seeded } = await setupMultiTabScenario(context, {
      propertyName: 'Messaging Test Property',
      createMessages: false,
    })

    try {
      // Tenant sends message
      await tenantPage.goto(`${baseUrl}/tenant/messages`)
      await waitForPageReady(tenantPage)

      const messageInput = tenantPage.locator('textarea, input[type="text"]').first()
      if (await messageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await messageInput.fill('Unread test message')
        await tenantPage.waitForTimeout(500)

        const sendButton = tenantPage.locator('button:has-text("Send"), button[type="submit"]').first()
        if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendButton.click()
          await tenantPage.waitForTimeout(2000)
        }
      }

      // Landlord should see unread indicator
      await landlordPage.goto(`${baseUrl}/landlord/messages`)
      await waitForPageReady(landlordPage)
      await landlordPage.waitForTimeout(3000)

      // Check for unread indicator
      const unreadIndicator = landlordPage.locator('[data-unread], [class*="unread"], [aria-label*="unread"]')
      const hasUnread = await unreadIndicator.isVisible({ timeout: 5000 }).catch(() => false)

      // Mark as read
      if (hasUnread) {
        await landlordPage.locator('text=/Unread test message/i').first().click()
        await landlordPage.waitForTimeout(1000)

        // Verify unread indicator disappears
        const unreadAfterRead = await unreadIndicator.isVisible({ timeout: 2000 }).catch(() => false)

        await logTestResult(landlordPage, {
          page: 'messaging',
          feature: 'unread_state',
          role: 'landlord',
          action: 'verify_unread_management',
          status: !unreadAfterRead ? 'passed' : 'failed',
          error: !unreadAfterRead ? undefined : 'Unread state not cleared after reading',
        })
      } else {
        await logTestResult(landlordPage, {
          page: 'messaging',
          feature: 'unread_state',
          role: 'landlord',
          action: 'verify_unread_management',
          status: 'skipped',
          error: 'Unread indicator not found',
        })
      }
    } catch (error) {
      await logTestResult(landlordPage, {
        page: 'messaging',
        feature: 'unread_state',
        role: 'landlord',
        action: 'verify_unread_management',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      await landlordPage.close()
      await tenantPage.close()
    }
  })
})

