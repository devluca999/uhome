/**
 * Bidirectional Messaging E2E Tests
 *
 * Tests that messaging works correctly between landlords and tenants:
 * - Tenant messages screen loads with active lease
 * - Landlord can send message, tenant sees it
 * - Tenant can reply, landlord sees reply
 */

import { test, expect } from '@playwright/test'
import { seedTestScenario } from '../../helpers/seed'
import { loginAsLandlord, loginAsTenant } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/supabase-admin'

test.describe('Bidirectional Messaging', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test('tenant messages screen loads with active lease', async ({ page }) => {
    // Seed test scenario with landlord, tenant, and active lease
    const scenario = await seedTestScenario({
      propertyName: 'Test Property',
      tenantEmail: 'test-tenant@example.com',
      createLease: true,
      leaseStatus: 'active',
    })

    if (!scenario.tenant || !scenario.lease) {
      throw new Error('Failed to seed test scenario with tenant and lease')
    }

    // Login as tenant
    await loginAsTenant(page, scenario.tenant.email, 'TestPassword123!')

    // Navigate to messages
    await page.goto(`${baseUrl}/tenant/messages`)
    await page.waitForLoadState('networkidle')

    // Assert: Lease card should be visible (not empty state)
    await expect(page.locator('text=No active leases')).not.toBeVisible()

    // Should see the property name
    await expect(page.locator(`text=${scenario.property?.name}`).first()).toBeVisible()
  })

  test('landlord sends message, tenant sees it', async ({ page, context }) => {
    // Seed test scenario
    const scenario = await seedTestScenario({
      propertyName: 'Messaging Test Property',
      tenantEmail: 'messaging-tenant@example.com',
      createLease: true,
      leaseStatus: 'active',
    })

    if (!scenario.landlord || !scenario.tenant || !scenario.lease) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as landlord
    await loginAsLandlord(page, scenario.landlord.email, 'TestPassword123!')

    // Navigate to messages and select the lease
    await page.goto(`${baseUrl}/landlord/messages/${scenario.lease.id}`)
    await page.waitForLoadState('networkidle')

    // Send a message
    const testMessage = `Test message from landlord at ${Date.now()}`
    const messageInput = page
      .locator('textarea[placeholder*="message" i], textarea[placeholder*="Type" i]')
      .first()
    await messageInput.fill(testMessage)

    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first()
    await sendButton.click()

    // Wait for message to appear
    await page.waitForTimeout(1000)
    await expect(page.locator(`text=${testMessage}`)).toBeVisible()

    // Open tenant page in new context
    const tenantPage = await context.newPage()
    await loginAsTenant(tenantPage, scenario.tenant.email, 'TestPassword123!')

    // Navigate to messages
    await tenantPage.goto(`${baseUrl}/tenant/messages/${scenario.lease.id}`)
    await tenantPage.waitForLoadState('networkidle')

    // Wait a bit for message to sync
    await tenantPage.waitForTimeout(2000)

    // Tenant should see the landlord's message
    await expect(tenantPage.locator(`text=${testMessage}`)).toBeVisible({ timeout: 10000 })

    await tenantPage.close()
  })

  test('tenant replies, landlord sees reply', async ({ page, context }) => {
    // Seed test scenario
    const scenario = await seedTestScenario({
      propertyName: 'Reply Test Property',
      tenantEmail: 'reply-tenant@example.com',
      createLease: true,
      leaseStatus: 'active',
    })

    if (!scenario.landlord || !scenario.tenant || !scenario.lease) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as tenant
    await loginAsTenant(page, scenario.tenant.email, 'TestPassword123!')

    // Navigate to messages and select the lease
    await page.goto(`${baseUrl}/tenant/messages/${scenario.lease.id}`)
    await page.waitForLoadState('networkidle')

    // Send a message
    const testReply = `Test reply from tenant at ${Date.now()}`
    const messageInput = page
      .locator('textarea[placeholder*="message" i], textarea[placeholder*="Type" i]')
      .first()
    await messageInput.fill(testReply)

    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first()
    await sendButton.click()

    // Wait for message to appear
    await page.waitForTimeout(1000)
    await expect(page.locator(`text=${testReply}`)).toBeVisible()

    // Open landlord page in new context
    const landlordPage = await context.newPage()
    await loginAsLandlord(landlordPage, scenario.landlord.email, 'TestPassword123!')

    // Navigate to messages
    await landlordPage.goto(`${baseUrl}/landlord/messages/${scenario.lease.id}`)
    await landlordPage.waitForLoadState('networkidle')

    // Wait a bit for message to sync
    await landlordPage.waitForTimeout(2000)

    // Landlord should see the tenant's reply
    await expect(landlordPage.locator(`text=${testReply}`)).toBeVisible({ timeout: 10000 })

    await landlordPage.close()
  })

  test('messages persist across page reloads', async ({ page }) => {
    // Seed test scenario
    const scenario = await seedTestScenario({
      propertyName: 'Persistence Test Property',
      tenantEmail: 'persist-tenant@example.com',
      createLease: true,
      leaseStatus: 'active',
    })

    if (!scenario.tenant || !scenario.lease) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as tenant
    await loginAsTenant(page, scenario.tenant.email, 'TestPassword123!')

    // Navigate to messages
    await page.goto(`${baseUrl}/tenant/messages/${scenario.lease.id}`)
    await page.waitForLoadState('networkidle')

    // Send a message
    const testMessage = `Persistent message at ${Date.now()}`
    const messageInput = page
      .locator('textarea[placeholder*="message" i], textarea[placeholder*="Type" i]')
      .first()
    await messageInput.fill(testMessage)

    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first()
    await sendButton.click()

    // Wait for message to appear
    await page.waitForTimeout(1000)
    await expect(page.locator(`text=${testMessage}`)).toBeVisible()

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Message should still be visible
    await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 10000 })
  })
})
