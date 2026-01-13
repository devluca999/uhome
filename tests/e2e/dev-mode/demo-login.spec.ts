/**
 * Demo Login E2E Tests
 * 
 * Tests that demo login buttons correctly navigate to the appropriate dashboards
 * and verifies demo data integrity (leases, tenant assignments, etc.)
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { getSupabaseAdminClient } from '../../helpers/supabase-admin'

test.describe('Demo Login', () => {
  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('demo landlord button navigates to landlord dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Wait for demo buttons to be visible
    const demoLandlordButton = page.locator('button:has-text("Demo Landlord")')
    await demoLandlordButton.waitFor({ state: 'visible', timeout: 5000 })

    // Click demo landlord button
    await demoLandlordButton.click()

    // Wait for navigation to landlord dashboard with dev mode parameter
    await page.waitForURL(/\/landlord\/dashboard.*dev=landlord/, { timeout: 10000 })

    // Verify we're on the landlord dashboard
    const url = page.url()
    expect(url).toContain('/landlord/dashboard')
    expect(url).toContain('dev=landlord')
    expect(url).not.toContain('/tenant/dashboard')

    // Verify dashboard content is visible (not empty state)
    await page.waitForLoadState('networkidle')
    const dashboardContent = page.locator('main, [data-testid="dashboard"]')
    await expect(dashboardContent.first()).toBeVisible({ timeout: 5000 })

    // Verify Join Household UI is NOT visible (tenant-only feature)
    const joinHouseholdText = page.locator('text=Join Household')
    await expect(joinHouseholdText).not.toBeVisible({ timeout: 1000 }).catch(() => {
      // If it's visible, that's a failure
      throw new Error('Join Household UI should not be visible to landlords')
    })
  })

  test('demo tenant button navigates to tenant dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Wait for demo buttons to be visible
    const demoTenantButton = page.locator('button:has-text("Demo Tenant")')
    await demoTenantButton.waitFor({ state: 'visible', timeout: 5000 })

    // Click demo tenant button
    await demoTenantButton.click()

    // Wait for navigation to tenant dashboard with dev mode parameter
    await page.waitForURL(/\/tenant\/dashboard.*dev=tenant/, { timeout: 10000 })

    // Verify we're on the tenant dashboard
    const url = page.url()
    expect(url).toContain('/tenant/dashboard')
    expect(url).toContain('dev=tenant')
    expect(url).not.toContain('/landlord/dashboard')

    // Verify dashboard content is visible
    await page.waitForLoadState('networkidle')
    const dashboardContent = page.locator('main, [data-testid="dashboard"]')
    await expect(dashboardContent.first()).toBeVisible({ timeout: 5000 })
  })

  test('landlord accessing tenant dashboard redirects to landlord dashboard', async ({ page }) => {
    // First, login as landlord via demo button
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const demoLandlordButton = page.locator('button:has-text("Demo Landlord")')
    await demoLandlordButton.waitFor({ state: 'visible', timeout: 5000 })
    await demoLandlordButton.click()

    // Wait for landlord dashboard
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    // Now try to access tenant dashboard directly
    await page.goto('/tenant/dashboard')
    await page.waitForLoadState('networkidle')

    // Should redirect to landlord dashboard
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 5000 })
    const url = page.url()
    expect(url).toContain('/landlord/dashboard')
    expect(url).not.toContain('/tenant/dashboard')
  })

  test('demo tenant has active lease after seed', async () => {
    const supabase = getSupabaseAdminClient()
    
    // Get demo tenant user
    const { data: demoTenantUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'demo-tenant@uhome.internal')
      .single()
    
    if (!demoTenantUser) {
      test.skip()
      return
    }

    // Get tenant record
    const { data: tenantRecord } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', demoTenantUser.id)
      .single()
    
    if (!tenantRecord) {
      throw new Error('Demo tenant record not found - tenant should be created during seed')
    }

    // Get lease for demo tenant
    const { data: lease } = await supabase
      .from('leases')
      .select('id, status, lease_start_date, lease_end_date')
      .eq('tenant_id', tenantRecord.id)
      .single()
    
    if (!lease) {
      throw new Error('Demo tenant does not have a lease - lease should be created during seed')
    }

    // Assert lease is active
    expect(lease.status).toBe('active')
    
    // Assert lease has start and end dates
    expect(lease.lease_start_date).toBeTruthy()
    expect(lease.lease_end_date).toBeTruthy()
  })
})

