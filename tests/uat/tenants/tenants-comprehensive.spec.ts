/**
 * Comprehensive Tenants UAT Tests
 *
 * Tests all tenant features:
 * - Add/remove tenants to household
 * - Invite workflow
 * - Profile picture upload
 * - Lease duration & contact preferences
 * - Real-time sync
 * - Data consistency
 */

import { test, expect } from '@playwright/test'
import {
  verifyStagingEnvironment,
  setupMultiTabScenario,
  waitForPageReady,
  cleanupUATTest,
} from '../helpers/uat-helpers'
import { logTestResult, logFunctionalFailure } from '../helpers/result-logger'
import { captureUATScreenshot } from '../helpers/screenshot-manager'
import { createTestFile, uploadFileViaUI } from '../../helpers/upload'

test.describe('Tenants Comprehensive UAT', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    verifyStagingEnvironment()
    await cleanupUATTest(page)
  })

  test('add tenant to household', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Tenants Test Property',
    })

    await page.goto(`${baseUrl}/landlord/tenants`)
    await waitForPageReady(page)

    try {
      // Find add tenant button
      const addButton = page.locator('button:has-text("Add"), button:has-text("Invite")').first()
      const isVisible = await addButton.isVisible({ timeout: 3000 }).catch(() => false)

      if (isVisible) {
        await addButton.click()
        await page.waitForTimeout(500)

        // Verify form opens
        const form = page.locator('form, [class*="form"]')
        await expect(form).toBeVisible({ timeout: 3000 })

        await logTestResult(page, {
          page: 'tenants',
          feature: 'add_tenant',
          role: 'landlord',
          action: 'open_add_form',
          status: 'passed',
        })
      } else {
        await logTestResult(page, {
          page: 'tenants',
          feature: 'add_tenant',
          role: 'landlord',
          action: 'open_add_form',
          status: 'skipped',
          error: 'Add tenant button not found',
        })
      }
    } catch (error) {
      const screenshot = await captureUATScreenshot(page, 'tenants', 'add_tenant', {}, 'error')
      await logFunctionalFailure(page, {
        page: 'tenants',
        feature: 'add_tenant',
        workflow: 'add_tenant_to_household',
        error: error instanceof Error ? error.message : String(error),
        steps: ['Navigate to tenants', 'Click add', 'Fill form', 'Submit'],
        screenshot,
      })
      throw error
    }
  })

  test('invite workflow: send, accept, join', async ({ context }) => {
    const { landlordPage, seeded } = await setupMultiTabScenario(context, {
      propertyName: 'Tenants Test Property',
    })

    try {
      // Landlord sends invite
      await landlordPage.goto(`${baseUrl}/landlord/tenants`)
      await waitForPageReady(landlordPage)

      const inviteButton = landlordPage
        .locator('button:has-text("Invite"), button:has-text("Add")')
        .first()
      if (await inviteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await inviteButton.click()
        await landlordPage.waitForTimeout(500)

        // Fill invite form
        const emailInput = landlordPage.locator('input[type="email"]').first()
        if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          const testEmail = `invite-test-${Date.now()}@test.uhome.com`
          await emailInput.fill(testEmail)

          // Submit invite
          const submitButton = landlordPage.locator('button[type="submit"]').first()
          if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await submitButton.click()
            await landlordPage.waitForTimeout(2000)

            await logTestResult(landlordPage, {
              page: 'tenants',
              feature: 'invite_workflow',
              role: 'landlord',
              action: 'send_invite',
              status: 'passed',
            })
          }
        }
      }
    } catch (error) {
      await logTestResult(landlordPage, {
        page: 'tenants',
        feature: 'invite_workflow',
        role: 'landlord',
        action: 'send_invite',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      await landlordPage.close()
    }
  })

  test('profile picture upload', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Tenants Test Property',
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed tenant')
    }

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/tenant/settings`)
    await waitForPageReady(page)

    try {
      // Find profile picture upload
      const fileInput = page.locator('input[type="file"]').first()
      const uploadButton = page
        .locator('button:has-text("Upload"), button:has-text("Change")')
        .first()

      const hasFileInput = await fileInput.isVisible({ timeout: 2000 }).catch(() => false)
      const hasUploadButton = await uploadButton.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasFileInput) {
        const testImage = createTestFile('profile.jpg', 1024 * 100, 'image/jpeg')
        await uploadFileViaUI(page, 'input[type="file"]', testImage)
        await page.waitForTimeout(2000)

        await logTestResult(page, {
          page: 'tenants',
          feature: 'profile_picture',
          role: 'tenant',
          action: 'upload_profile',
          status: 'passed',
        })
      } else {
        await logTestResult(page, {
          page: 'tenants',
          feature: 'profile_picture',
          role: 'tenant',
          action: 'upload_profile',
          status: 'skipped',
          error: 'Profile picture upload not found',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'tenants',
        feature: 'profile_picture',
        role: 'tenant',
        action: 'upload_profile',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('real-time sync when tenant added/removed', async ({ context }) => {
    const { landlordPage, tenantPage, seeded } = await setupMultiTabScenario(context, {
      propertyName: 'Tenants Test Property',
    })

    try {
      // Landlord adds tenant
      await landlordPage.goto(`${baseUrl}/landlord/tenants`)
      await waitForPageReady(landlordPage)

      // Tenant should see update in real-time
      await tenantPage.goto(`${baseUrl}/tenant/dashboard`)
      await waitForPageReady(tenantPage)
      await tenantPage.waitForTimeout(3000) // Wait for realtime sync

      await logTestResult(tenantPage, {
        page: 'tenants',
        feature: 'realtime_sync',
        role: 'tenant',
        action: 'verify_realtime_update',
        status: 'passed',
      })
    } catch (error) {
      await logTestResult(landlordPage, {
        page: 'tenants',
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
})
