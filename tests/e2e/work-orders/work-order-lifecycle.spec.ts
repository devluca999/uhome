/**
 * Work Order Lifecycle E2E Tests
 * 
 * Tests work order creation, status updates, sync, and edge cases.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { seedTestScenario } from '../../helpers/seed'
import { createTestLandlord, loginAsLandlord } from '../../helpers/auth-helpers'
import { testMultiTabSync } from '../../helpers/realtime'

test.describe('Work Order Lifecycle', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('work order lifecycle syncs across roles', async ({ page, context }) => {
    // Create full scenario
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
      createWorkOrders: true,
    })

    if (!seeded.tenant || !seeded.property) {
      throw new Error('Failed to seed test scenario')
    }

    // Open landlord page
    await loginAsLandlord(page, seeded.landlord.email, 'TestPassword123!')
    await page.goto(`${baseUrl}/landlord/operations`)
    await page.waitForLoadState('networkidle')

    // Create work order
    await page.click('text=Create Work Order')
    await page.fill('textarea[name="description"]', 'Test work order')
    await page.selectOption('select[name="property"]', seeded.property.id)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Open tenant page
    const tenantPage = await context.newPage()
    await tenantPage.goto(`${baseUrl}/tenant/maintenance`)
    await tenantPage.waitForLoadState('networkidle')

    // Verify tenant sees work order
    await expect(tenantPage.locator('text=Test work order')).toBeVisible({ timeout: 10000 })

    // Update status as landlord
    await page.click('text=Test work order')
    await page.click('text=In Progress')
    await page.waitForTimeout(1000)

    // Verify tenant sees status update
    await tenantPage.reload()
    await expect(tenantPage.locator('text=In Progress')).toBeVisible({ timeout: 10000 })
  })

  test('tenant tries to update landlord-only status', async ({ page }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
      createWorkOrders: true,
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as tenant
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/tenant/maintenance`)
    await page.waitForLoadState('networkidle')

    // Try to update status to landlord-only status (e.g., 'scheduled')
    // Tenant should not be able to do this
    const statusButton = page.locator('button:has-text("Scheduled")')
    const isVisible = await statusButton.isVisible()
    
    if (isVisible) {
      // If button is visible, clicking should fail or be disabled
      await expect(statusButton).toBeDisabled()
    }
  })

  test('work order deleted mid-view', async ({ page, context }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
      createWorkOrders: true,
    })

    if (!seeded.workOrders || seeded.workOrders.length === 0) {
      throw new Error('Failed to seed work orders')
    }

    // Open tenant page viewing work order
    await page.goto(`${baseUrl}/tenant/maintenance`)
    await page.waitForLoadState('networkidle')

    // Verify work order is visible
    await expect(page.locator('text=Test work order')).toBeVisible()

    // Delete work order as landlord (in another page)
    const landlordPage = await context.newPage()
    await loginAsLandlord(landlordPage, seeded.landlord.email, 'TestPassword123!')
    await landlordPage.goto(`${baseUrl}/landlord/operations`)
    await landlordPage.waitForLoadState('networkidle')

    // Delete work order
    await landlordPage.click(`text=${seeded.workOrders[0].id}`)
    await landlordPage.click('text=Delete')
    await landlordPage.waitForTimeout(1000)

    // Verify tenant no longer sees work order
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Test work order')).not.toBeVisible({ timeout: 10000 })
  })

  test('status regression (completed → open)', async ({ page }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
      createWorkOrders: true,
    })

    if (!seeded.property) {
      throw new Error('Failed to seed test scenario')
    }

    await loginAsLandlord(page, seeded.landlord.email, 'TestPassword123!')
    await page.goto(`${baseUrl}/landlord/operations`)
    await page.waitForLoadState('networkidle')

    // Update work order to completed
    await page.click('text=Test work order')
    await page.click('text=Completed')
    await page.waitForTimeout(1000)

    // Try to regress to open (should be prevented by UI or backend)
    // This is typically prevented by state machine logic
    const openButton = page.locator('button:has-text("Open")')
    const isVisible = await openButton.isVisible()
    
    // Status regression should not be allowed
    if (isVisible) {
      await expect(openButton).toBeDisabled()
    }
  })
})

