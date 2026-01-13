/**
 * Rate Limit E2E Tests
 * 
 * Tests rate limit enforcement, spam detection, and edge cases.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { seedTestScenario } from '../../helpers/seed'
import { createTestFile, uploadFileViaUI } from '../../helpers/upload'

test.describe('Rate Limit Tests', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('staging blocks upload spam', async ({ page }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed test scenario')
    }

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/tenant/maintenance`)
    await page.waitForLoadState('networkidle')

    // Try to upload many files rapidly
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      for (let i = 0; i < 20; i++) {
        const testFile = createTestFile(`spam-${i}.jpg`, 1024 * 100, 'image/jpeg')
        await uploadFileViaUI(page, 'input[type="file"]', testFile)
        await page.waitForTimeout(100) // Very rapid
      }

      // Should hit rate limit
      await page.waitForTimeout(2000)
      const hasError = await page.locator('text=/rate limit|too many/i').isVisible()
      expect(hasError).toBeTruthy()
    }
  })

  test('message flood protection', async ({ page }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
      createMessages: true,
    })

    if (!seeded.tenant || !seeded.lease) {
      throw new Error('Failed to seed test scenario')
    }

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/tenant/messages`)
    await page.waitForLoadState('networkidle')

    // Send many messages rapidly
    for (let i = 0; i < 25; i++) {
      await page.fill('textarea[name="message"]', `Flood message ${i}`)
      await page.click('button:has-text("Send")')
      await page.waitForTimeout(50) // Very rapid
    }

    // Should hit rate limit
    await page.waitForTimeout(2000)
    const hasError = await page.locator('text=/rate limit|too many/i').isVisible()
    expect(hasError).toBeTruthy()
  })

  test('invite spam', async ({ page }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/landlord/properties`)
    await page.waitForLoadState('networkidle')

    // Try to create many invites rapidly
    for (let i = 0; i < 10; i++) {
      await page.click('text=Invite Tenant')
      await page.fill('input[type="email"]', `spam-${i}@test.com`)
      await page.click('button[type="submit"]')
      await page.waitForTimeout(100) // Rapid
    }

    // Should hit rate limit or max active invites
    await page.waitForTimeout(2000)
    const hasError = await page.locator('text=/rate limit|maximum|limit/i').isVisible()
    expect(hasError).toBeTruthy()
  })

  test('rate limit UI feedback', async ({ page }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed test scenario')
    }

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Trigger rate limit (upload spam)
    await page.goto(`${baseUrl}/tenant/maintenance`)
    await page.waitForLoadState('networkidle')

    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      for (let i = 0; i < 20; i++) {
        const testFile = createTestFile(`test-${i}.jpg`, 1024 * 100, 'image/jpeg')
        await uploadFileViaUI(page, 'input[type="file"]', testFile)
        await page.waitForTimeout(100)
      }

      await page.waitForTimeout(2000)

      // Verify error message is user-friendly
      const errorMessage = await page.locator('text=/rate limit|too many/i').textContent()
      expect(errorMessage).toBeTruthy()
      expect(errorMessage?.toLowerCase()).toContain('rate limit')
    }
  })
})

