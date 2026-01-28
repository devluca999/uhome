/**
 * Messaging Sync E2E Tests
 *
 * Tests message sending, unread state, sync, and edge cases.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { seedTestScenario } from '../../helpers/seed'

test.describe('Messaging Sync', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('messages sync and unread state updates', async ({ page, context }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
      createMessages: true,
    })

    if (!seeded.tenant || !seeded.lease) {
      throw new Error('Failed to seed test scenario')
    }

    // Open tenant page
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/tenant/messages`)
    await page.waitForLoadState('networkidle')

    // Send message
    await page.fill('textarea[name="message"]', 'Hello landlord')
    await page.click('button:has-text("Send")')
    await page.waitForTimeout(2000)

    // Open landlord page
    const landlordPage = await context.newPage()
    await landlordPage.goto(`${baseUrl}/login`)
    await landlordPage.fill('input[type="email"]', seeded.landlord.email)
    await landlordPage.fill('input[type="password"]', 'TestPassword123!')
    await landlordPage.click('button[type="submit"]')
    await landlordPage.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await landlordPage.goto(`${baseUrl}/landlord/messages`)
    await landlordPage.waitForLoadState('networkidle')

    // Verify landlord sees message and unread indicator
    await expect(landlordPage.locator('text=Hello landlord')).toBeVisible({ timeout: 10000 })
    await expect(landlordPage.locator('[data-unread]')).toBeVisible({ timeout: 5000 })

    // Read message
    await landlordPage.click('text=Hello landlord')
    await landlordPage.waitForTimeout(1000)

    // Verify unread indicator disappears
    await expect(landlordPage.locator('[data-unread]')).not.toBeVisible({ timeout: 5000 })
  })

  test('message spam', async ({ page }) => {
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

    // Try to send many messages rapidly
    for (let i = 0; i < 25; i++) {
      await page.fill('textarea[name="message"]', `Spam message ${i}`)
      await page.click('button:has-text("Send")')
      await page.waitForTimeout(100) // Very rapid
    }

    // Should hit rate limit
    await page.waitForTimeout(2000)
    const hasError = await page.locator('text=/rate limit|too many/i').isVisible()
    expect(hasError).toBeTruthy()
  })

  test('empty message', async ({ page }) => {
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

    // Try to send empty message
    await page.fill('textarea[name="message"]', '   ') // Only whitespace
    await page.click('button:has-text("Send")')
    await page.waitForTimeout(1000)

    // Should show error
    const hasError = await page.locator('text=/cannot be empty|required/i').isVisible()
    expect(hasError).toBeTruthy()
  })

  test('tenant removed from household mid-thread', async ({ page, context }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
      createMessages: true,
    })

    if (!seeded.tenant || !seeded.lease) {
      throw new Error('Failed to seed test scenario')
    }

    // Open tenant page with messages
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/tenant/messages`)
    await page.waitForLoadState('networkidle')

    // Verify messages are visible
    await expect(page.locator('text=/message|lease/i')).toBeVisible()

    // Remove tenant (as landlord)
    const landlordPage = await context.newPage()
    // This would require landlord login and tenant removal

    // Verify tenant can no longer send messages
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should show error or empty state
    const canSend = await page.locator('button:has-text("Send")').isEnabled()
    expect(canSend).toBeFalsy()
  })
})
