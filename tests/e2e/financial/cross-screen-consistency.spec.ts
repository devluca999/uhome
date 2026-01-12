/**
 * Cross-Screen Consistency Tests
 *
 * Tests that assert the same number appears everywhere it should.
 * Validates consistency across Dashboard, Finances page, and Property detail pages.
 */

import { test, expect } from '@playwright/test'
import { financialAssertions } from '../../helpers/financial-assertions'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'
import { loginAsLandlord } from '../../helpers/auth-helpers'

test.describe('Cross-Screen Consistency Tests', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:3000'

  test('property monthly revenue matches across all screens', async ({ page }) => {
    await loginAsLandlord(page, 'demo-landlord@uhome.internal', 'DemoLandlord2024!')

    const supabase = getSupabaseAdminClient()
    const { data: landlord } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'demo-landlord@uhome.internal')
      .single()

    if (!landlord) {
      test.skip()
      return
    }

    // Get first property
    const { data: properties } = await supabase
      .from('properties')
      .select('id, name')
      .eq('owner_id', landlord.id)
      .limit(1)

    if (!properties || properties.length === 0) {
      test.skip()
      return
    }

    const propertyId = properties[0].id
    const currentMonth = new Date()
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    // Calculate expected property revenue
    const expectedRevenue = await financialAssertions.calculatePropertyRevenue(propertyId, monthStart, monthEnd)

    // Check Dashboard property breakdown
    await page.goto(`${baseUrl}/landlord/dashboard`)
    await page.waitForLoadState('networkidle')

    // Find property revenue on dashboard (adjust selector based on actual UI)
    const dashboardPropertyRevenueElement = page
      .locator(`[data-testid="property-${propertyId}-revenue"], [data-testid="dashboard-property-revenue"]`)
      .first()
    const dashboardPropertyRevenueText = await dashboardPropertyRevenueElement.textContent().catch(() => null)

    // Check Finances page with property filter
    await page.goto(`${baseUrl}/landlord/finances`)
    await page.waitForLoadState('networkidle')

    // Select property filter
    const propertySelect = page.locator('[data-testid="finances-property-select"]').first()
    const propertyOptions = await propertySelect.locator('option').allTextContents().catch(() => [])
    if (propertyOptions.length > 1) {
      await propertySelect.selectOption({ index: 1 })
      await page.waitForTimeout(1000)

      const financesPropertyRevenueCard = page.locator('[data-testid="finances-revenue"]').first()
      await financesPropertyRevenueCard.waitFor({ state: 'visible', timeout: 5000 })
      await page.waitForTimeout(500) // Wait for NumberCounter animation
      
      // FIX: Select value element specifically, not entire card (KPI cards use different structure)
      const financesPropertyRevenueText = await financesPropertyRevenueCard.locator('.text-3xl, .text-2xl').first().textContent()

      if (financesPropertyRevenueText) {
        const financesRevenueValue = parseFloat(financesPropertyRevenueText.replace(/[$,]/g, ''))
        expect(Math.abs(financesRevenueValue - expectedRevenue)).toBeLessThan(0.01)
      }
    }

    // Check Property detail page
    await page.goto(`${baseUrl}/landlord/properties/${propertyId}`)
    await page.waitForLoadState('networkidle')

    const propertyPageRevenueElement = page
      .locator('[data-testid="property-revenue"], [data-testid="monthly-revenue"]')
      .first()
    const propertyPageRevenueText = await propertyPageRevenueElement.textContent().catch(() => null)

    // Compare all values
    const values: number[] = []
    if (dashboardPropertyRevenueText) {
      values.push(parseFloat(dashboardPropertyRevenueText.replace(/[^0-9.-]+/g, '')))
    }
    if (propertyPageRevenueText) {
      values.push(parseFloat(propertyPageRevenueText.replace(/[^0-9.-]+/g, '')))
    }

    // All values should match expected (within tolerance)
    for (const value of values) {
      expect(Math.abs(value - expectedRevenue)).toBeLessThan(0.01)
    }

    // All values should match each other (within tolerance)
    if (values.length > 1) {
      for (let i = 1; i < values.length; i++) {
        expect(Math.abs(values[i] - values[0])).toBeLessThan(0.01)
      }
    }
  })

  test('tenant balance matches across all screens', async ({ page }) => {
    await loginAsLandlord(page, 'demo-landlord@uhome.internal', 'DemoLandlord2024!')

    const supabase = getSupabaseAdminClient()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single()

    if (!tenant) {
      test.skip()
      return
    }

    // Calculate expected tenant balance
    const expectedBalance = await financialAssertions.calculateTenantBalance(tenant.id)

    // Check tenant card/list view
    await page.goto(`${baseUrl}/landlord/tenants`)
    await page.waitForLoadState('networkidle')

    const tenantCardBalanceElement = page
      .locator(`[data-testid="tenant-${tenant.id}-balance"], [data-testid="tenant-balance"]`)
      .first()
    const tenantCardBalanceText = await tenantCardBalanceElement.textContent().catch(() => null)

    // Check lease detail page (if available)
    // This would require finding the lease for this tenant
    const { data: lease } = await supabase
      .from('leases')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .single()

    if (lease) {
      await page.goto(`${baseUrl}/landlord/leases/${lease.id}`)
      await page.waitForLoadState('networkidle')

      const leaseBalanceElement = page.locator('[data-testid="tenant-balance"], [data-testid="outstanding-balance"]').first()
      const leaseBalanceText = await leaseBalanceElement.textContent().catch(() => null)

      if (leaseBalanceText) {
        const leaseBalanceValue = parseFloat(leaseBalanceText.replace(/[^0-9.-]+/g, ''))
        expect(Math.abs(leaseBalanceValue - expectedBalance)).toBeLessThan(0.01)
      }
    }

    if (tenantCardBalanceText) {
      const tenantCardBalanceValue = parseFloat(tenantCardBalanceText.replace(/[^0-9.-]+/g, ''))
      expect(Math.abs(tenantCardBalanceValue - expectedBalance)).toBeLessThan(0.01)
    }
  })

  test('net income matches between dashboard and finances page (same filters)', async ({ page, context }) => {
    await loginAsLandlord(page, 'demo-landlord@uhome.internal', 'DemoLandlord2024!')

    const supabase = getSupabaseAdminClient()
    const { data: landlord } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'demo-landlord@uhome.internal')
      .single()

    if (!landlord) {
      test.skip()
      return
    }

    // Get dashboard net income (current calendar month)
    await page.goto(`${baseUrl}/landlord/dashboard`)
    await page.waitForLoadState('networkidle')

    const dashboardNetIncomeCard = page.locator('[data-testid="dashboard-net-income"]').first()
    await dashboardNetIncomeCard.waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(500) // Wait for NumberCounter animation
    
    // FIX: Select value element specifically, not entire card
    const dashboardNetIncomeText = await dashboardNetIncomeCard.locator('.text-2xl').textContent()

    if (!dashboardNetIncomeText) {
      test.skip()
      return
    }

    const dashboardNetIncome = parseFloat(dashboardNetIncomeText.replace(/[$,]/g, ''))

    // Calculate expected (current calendar month)
    const currentMonth = new Date()
    const expectedNetIncome = await financialAssertions.calculateMonthlyNetIncome(landlord.id, currentMonth)

    // Check finances page with monthly filter
    const financesPage = await context.newPage()
    await financesPage.goto(`${baseUrl}/landlord/finances`)
    await financesPage.waitForLoadState('networkidle')

    // Select monthly filter
    const timePeriodSelect = financesPage.locator('[data-testid="finances-time-period-select"]')
    await timePeriodSelect.selectOption('monthly')
    await financesPage.waitForTimeout(1000)

    const financesNetIncomeCard = financesPage.locator('[data-testid="finances-net-income"]').first()
    await financesNetIncomeCard.waitFor({ state: 'visible', timeout: 5000 })
    await financesPage.waitForTimeout(500) // Wait for NumberCounter animation
    
    // FIX: Select value element specifically, not entire card
    const financesNetIncomeText = await financesNetIncomeCard.locator('.text-2xl').textContent()

    if (financesNetIncomeText) {
      const financesNetIncome = parseFloat(financesNetIncomeText.replace(/[$,]/g, ''))

      // All should match
      expect(Math.abs(dashboardNetIncome - expectedNetIncome)).toBeLessThan(0.01)
      expect(Math.abs(financesNetIncome - expectedNetIncome)).toBeLessThan(0.01)
      expect(Math.abs(dashboardNetIncome - financesNetIncome)).toBeLessThan(0.01)
    }

    await financesPage.close()
  })

  test('currency formatting is consistent (raw numbers match before formatting)', async ({ page }) => {
    await loginAsLandlord(page, 'demo-landlord@uhome.internal', 'DemoLandlord2024!')
    await page.goto(`${baseUrl}/landlord/dashboard`)
    await page.waitForLoadState('networkidle')

    const supabase = getSupabaseAdminClient()
    const { data: landlord } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'demo-landlord@uhome.internal')
      .single()

    if (!landlord) {
      test.skip()
      return
    }

    const currentMonth = new Date()
    const expectedRevenue = await financialAssertions.calculateMonthlyRevenue(landlord.id, currentMonth)

    // Extract numeric values from formatted text
    const revenueElement = page.locator('[data-testid="dashboard-revenue"]').first()
    const revenueText = await revenueElement.textContent()

    if (!revenueText) {
      test.skip()
      return
    }

    // Extract raw number (remove formatting: $, commas, etc.)
    const revenueValue = parseFloat(revenueText.replace(/[^0-9.-]+/g, ''))

    // Assert raw numbers match (before formatting)
    expect(Math.abs(revenueValue - expectedRevenue)).toBeLessThan(0.01)

    // Verify formatting is present (has $ or currency symbol)
    // This ensures we're extracting from formatted text, not raw numbers
    expect(revenueText).toMatch(/[\$£€¥]|USD|dollars?/i)
  })
})

