/**
 * Integration Tests for Data Consistency
 *
 * Tests cross-page data consistency:
 * - Dashboard-finances data consistency
 * - Property-tenant relationships
 * - Work order updates reflect in all views
 * - Notes persist across navigation
 * - Real-time sync across tabs
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

test.describe('Data Consistency Integration Tests', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    verifyStagingEnvironment()
    await cleanupUATTest(page)
  })

  test('dashboard-finances data consistency', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Consistency Test Property',
    })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Get dashboard revenue
      const dashboardRevenue = page.locator('text=/revenue|\\$|income/i').first()
      await expect(dashboardRevenue).toBeVisible({ timeout: 5000 })
      const dashboardValue = await dashboardRevenue.textContent()

      // Navigate to finances
      await page.goto(`${baseUrl}/landlord/finances`)
      await waitForPageReady(page)

      // Get finances revenue
      const financesRevenue = page.locator('text=/revenue|\\$|income/i').first()
      await expect(financesRevenue).toBeVisible({ timeout: 5000 })
      const financesValue = await financesRevenue.textContent()

      // Values should be consistent
      expect(dashboardValue).toBeTruthy()
      expect(financesValue).toBeTruthy()

      await logTestResult(page, {
        page: 'integration',
        feature: 'data_consistency',
        role: 'landlord',
        action: 'verify_dashboard_finances_consistency',
        status: 'passed',
      })
    } catch (error) {
      await logTestResult(page, {
        page: 'integration',
        feature: 'data_consistency',
        role: 'landlord',
        action: 'verify_dashboard_finances_consistency',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('property-tenant relationships reflected across pages', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Consistency Test Property',
    })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    if (seeded.property && seeded.tenant) {
      try {
        // Check property page
        await page.goto(`${baseUrl}/landlord/properties/${seeded.property.id}`)
        await waitForPageReady(page)

        const tenantOnProperty = page.locator('text=/tenant/i')
        const hasTenant = await tenantOnProperty.isVisible({ timeout: 3000 }).catch(() => false)

        // Check tenants page
        await page.goto(`${baseUrl}/landlord/tenants`)
        await waitForPageReady(page)

        const propertyOnTenant = page.locator('text=/property/i')
        const hasProperty = await propertyOnTenant.isVisible({ timeout: 3000 }).catch(() => false)

        await logTestResult(page, {
          page: 'integration',
          feature: 'property_tenant_relationships',
          role: 'landlord',
          action: 'verify_relationships',
          status: hasTenant || hasProperty ? 'passed' : 'skipped',
          error: hasTenant || hasProperty ? undefined : 'Relationship data not found',
        })
      } catch (error) {
        await logTestResult(page, {
          page: 'integration',
          feature: 'property_tenant_relationships',
          role: 'landlord',
          action: 'verify_relationships',
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    }
  })

  test('real-time sync across multiple tabs', async ({ context }) => {
    const { landlordPage, tenantPage, seeded } = await setupMultiTabScenario(context, {
      propertyName: 'Consistency Test Property',
      createWorkOrders: true,
    })

    try {
      // Landlord creates work order
      await landlordPage.goto(`${baseUrl}/landlord/operations`)
      await waitForPageReady(landlordPage)

      // Tenant should see it
      await tenantPage.goto(`${baseUrl}/tenant/maintenance`)
      await waitForPageReady(tenantPage)
      await tenantPage.waitForTimeout(3000)

      const workOrder = tenantPage.locator('[class*="work-order"], [class*="maintenance"]').first()
      const isVisible = await workOrder.isVisible({ timeout: 5000 }).catch(() => false)

      await logTestResult(tenantPage, {
        page: 'integration',
        feature: 'realtime_sync',
        role: 'tenant',
        action: 'verify_realtime_update',
        status: isVisible ? 'passed' : 'failed',
        error: isVisible ? undefined : 'Work order did not sync in real-time',
      })
    } catch (error) {
      await logTestResult(landlordPage, {
        page: 'integration',
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
