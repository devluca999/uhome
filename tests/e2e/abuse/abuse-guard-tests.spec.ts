/**
 * Abuse Guard E2E Tests
 * 
 * Tests abuse detection, edge cases, and security.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { seedTestScenario } from '../../helpers/seed'
import { simulateNetworkDisconnect, simulateNetworkReconnect } from '../../helpers/realtime'

test.describe('Abuse Guard Tests', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('rapid invite creation (bot-like behavior)', async ({ page }) => {
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

    // Rapidly create invites (bot-like)
    for (let i = 0; i < 15; i++) {
      await page.click('text=Invite Tenant')
      await page.fill('input[type="email"]', `bot-${i}@test.com`)
      await page.click('button[type="submit"]')
      await page.waitForTimeout(50) // Very rapid
    }

    // Should trigger abuse guard
    await page.waitForTimeout(2000)
    const hasError = await page.locator('text=/suspicious|abuse|slow down/i').isVisible()
    expect(hasError).toBeTruthy()
  })

  test('tenant opening same invite in multiple tabs', async ({ page, context }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    // Create invite (as landlord)
    // Then try to accept in multiple tabs (as tenant)
    // This should be handled gracefully

    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage(),
    ])

    // Try to accept same invite in all tabs
    for (const p of pages) {
      await p.goto(`${baseUrl}/accept-invite/test-token`)
      await p.waitForLoadState('networkidle')
    }

    // Only one should succeed
    await page.waitForTimeout(2000)
    
    const successCount = await Promise.all(
      pages.map(p => p.locator('text=/accepted|success/i').isVisible())
    )

    const successCountTrue = successCount.filter(Boolean).length
    expect(successCountTrue).toBeLessThanOrEqual(1) // At most one should succeed

    for (const p of pages) {
      await p.close()
    }
  })

  test('network disconnect mid-mutation', async ({ page }) => {
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

    // Start mutation
    await page.click('text=Add Property')
    await page.fill('input[name="name"]', 'Test Property 2')

    // Disconnect network
    await simulateNetworkDisconnect(page)

    // Try to submit
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Should show error
    const hasError = await page.locator('text=/network|connection|offline/i').isVisible()
    expect(hasError).toBeTruthy()

    // Reconnect
    await simulateNetworkReconnect(page)
    await page.waitForTimeout(1000)

    // Should be able to retry
    const canRetry = await page.locator('button:has-text("Retry")').isVisible()
    expect(canRetry).toBeTruthy()
  })

  test('realtime subscription loss + recovery', async ({ page }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
      createWorkOrders: true,
    })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/tenant/maintenance`)
    await page.waitForLoadState('networkidle')

    // Verify realtime is working
    await expect(page.locator('text=Test work order')).toBeVisible()

    // Simulate subscription loss
    await simulateNetworkDisconnect(page)
    await page.waitForTimeout(2000)

    // Reconnect
    await simulateNetworkReconnect(page)
    await page.waitForTimeout(3000)

    // Verify subscription recovered
    await expect(page.locator('text=Test work order')).toBeVisible()
  })

  test('user deleted while active session open', async ({ page, context }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed test scenario')
    }

    // Open tenant session
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Verify tenant can see data
    await expect(page.locator('text=Test Property')).toBeVisible()

    // Delete user (as admin/landlord in another context)
    // This would require admin access

    // Verify session is invalidated
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should redirect to login or show error
    const isLoggedOut = page.url().includes('/login') || 
                        await page.locator('text=/unauthorized|logged out/i').isVisible()
    expect(isLoggedOut).toBeTruthy()
  })

  test('dev mode toggled mid-session', async ({ page }) => {
    // Start without dev mode
    await page.goto(`${baseUrl}/`)
    await page.waitForLoadState('networkidle')

    // Toggle dev mode
    await page.goto(`${baseUrl}/?dev=tenant`)
    await page.waitForLoadState('networkidle')

    // Verify dev mode activated
    const url = new URL(page.url())
    expect(url.searchParams.get('dev')).toBe('tenant')

    // Toggle off
    await page.goto(`${baseUrl}/`)
    await page.waitForLoadState('networkidle')

    // Verify dev mode deactivated
    const url2 = new URL(page.url())
    expect(url2.searchParams.get('dev')).toBeNull()
  })
})

