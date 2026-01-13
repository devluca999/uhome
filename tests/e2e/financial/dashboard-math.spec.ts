/**
 * Dashboard Math Assertions
 *
 * E2E tests that validate dashboard calculations match expected values from database.
 * These tests ensure the dashboard shows mathematically correct financial data.
 */

import { test, expect } from '@playwright/test'
import { financialAssertions } from '../../helpers/financial-assertions'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'
import { loginAsLandlord } from '../../helpers/auth-helpers'

test.describe('Dashboard Math Assertions', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:3000'

  test('dashboard shows correct monthly revenue for current calendar month', async ({ page }) => {
    // Login as demo landlord
    await loginAsLandlord(page, 'demo-landlord@uhome.internal', 'DemoLandlord2024!')
    await page.goto(`${baseUrl}/landlord/dashboard`)
    await page.waitForLoadState('networkidle')

    // Get landlord ID
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

    // Calculate expected monthly revenue (current calendar month)
    const currentMonth = new Date()
    const expectedRevenue = await financialAssertions.calculateMonthlyRevenue(landlord.id, currentMonth)

    // Extract revenue from dashboard (find the revenue card/value)
    // This selector will need to be adjusted based on actual dashboard structure
    const revenueElement = page.locator('[data-testid="dashboard-revenue"], [data-testid="monthly-revenue"]').first()
    const revenueText = await revenueElement.textContent()

    if (!revenueText) {
      throw new Error('Could not find revenue value on dashboard')
    }

    // Extract numeric value from text (remove $, commas, etc.)
    const revenueValue = parseFloat(revenueText.replace(/[^0-9.-]+/g, ''))

    // Assert exact match (within 0.01 for floating point precision)
    expect(Math.abs(revenueValue - expectedRevenue)).toBeLessThan(0.01)
  })

  test('dashboard shows correct monthly expenses for current calendar month', async ({ page }) => {
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
    const expectedExpenses = await financialAssertions.calculateMonthlyExpenses(landlord.id, currentMonth)

    const expensesElement = page.locator('[data-testid="dashboard-expenses"], [data-testid="monthly-expenses"]').first()
    const expensesText = await expensesElement.textContent()

    if (!expensesText) {
      throw new Error('Could not find expenses value on dashboard')
    }

    const expensesValue = parseFloat(expensesText.replace(/[^0-9.-]+/g, ''))

    expect(Math.abs(expensesValue - expectedExpenses)).toBeLessThan(0.01)
  })

  test('dashboard shows correct net income for current calendar month', async ({ page }) => {
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
    const expectedNetIncome = await financialAssertions.calculateMonthlyNetIncome(landlord.id, currentMonth)

    // Find the Net Income card specifically (not property profitability)
    const netIncomeCard = page.locator('[data-testid="dashboard-net-income"]')
    await netIncomeCard.waitFor({ state: 'visible', timeout: 5000 })
    
    // Wait for NumberCounter animation to complete
    await page.waitForTimeout(1000)
    
    // FIX: Select the value element specifically, not the entire card
    // MetricCard structure: Card > CardContent > div.text-2xl (the value)
    const netIncomeText = await netIncomeCard.locator('.text-2xl').textContent()

    if (!netIncomeText) {
      throw new Error('Could not find net income value on dashboard')
    }
    
    // Extract the numeric value (should be in format like "$22,548")
    const netIncomeValue = parseFloat(netIncomeText.replace(/[$,]/g, ''))
    
    console.log(`Dashboard Net Income: $${netIncomeValue}, Expected: $${expectedNetIncome}, Difference: $${Math.abs(netIncomeValue - expectedNetIncome)}`)

    expect(Math.abs(netIncomeValue - expectedNetIncome)).toBeLessThan(0.01)
  })

  test('dashboard shows current calendar month only (not month-to-date)', async ({ page }) => {
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

    // Calculate full month (current calendar month)
    const currentMonth = new Date()
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    // Calculate month-to-date (start of month to today)
    const today = new Date()
    const monthToDateRevenue = await financialAssertions.calculateRevenueForRange(landlord.id, monthStart, today)
    const fullMonthRevenue = await financialAssertions.calculateMonthlyRevenue(landlord.id, currentMonth)

    // If we're not on the last day of the month, these should be different
    if (today.getDate() < monthEnd.getDate()) {
      // Dashboard should show full month, not month-to-date
      const revenueElement = page.locator('[data-testid="dashboard-revenue"]').first()
      const revenueText = await revenueElement.textContent()
      const revenueValue = parseFloat(revenueText?.replace(/[^0-9.-]+/g, '') || '0')

      // Revenue should match full month, not month-to-date
      expect(Math.abs(revenueValue - fullMonthRevenue)).toBeLessThan(0.01)
      // And should NOT match month-to-date (unless by coincidence)
      // This is a sanity check - if they're the same, it might be a bug
      if (Math.abs(monthToDateRevenue - fullMonthRevenue) > 0.01) {
        expect(Math.abs(revenueValue - monthToDateRevenue)).toBeGreaterThan(0.01)
      }
    }
  })

  test('dashboard occupancy count matches actual occupied properties', async ({ page }) => {
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

    // Get actual occupancy count from database
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', landlord.id)

    if (!properties) {
      test.skip()
      return
    }

    const propertyIds = properties.map(p => p.id)
    const { data: tenants } = await supabase
      .from('tenants')
      .select('property_id')
      .in('property_id', propertyIds)

    if (!tenants) {
      test.skip()
      return
    }

    const occupiedPropertyIds = new Set(tenants.map(t => t.property_id))
    const expectedOccupancyCount = occupiedPropertyIds.size

    // Extract occupancy count from dashboard (use value-specific test-id to avoid description)
    const occupancyElement = page.locator('[data-testid="dashboard-occupancy-value"]').first()
    if (!(await occupancyElement.count())) {
      // Fallback to card level if value-specific id not found
      const cardElement = page.locator('[data-testid="dashboard-occupancy"]').first()
      const cardText = await cardElement.textContent()
      if (!cardText) {
        throw new Error('Could not find occupancy value on dashboard')
      }
      // Extract just the number (first number in the text, before any percentage)
      const match = cardText.match(/^(\d+)/)
      if (!match) {
        throw new Error('Could not parse occupancy count from dashboard')
      }
      const occupancyValue = parseInt(match[1])
      expect(occupancyValue).toBe(expectedOccupancyCount)
      return
    }
    
    const occupancyText = await occupancyElement.textContent()

    if (!occupancyText) {
      throw new Error('Could not find occupancy value on dashboard')
    }

    const occupancyValue = parseInt(occupancyText.replace(/[^0-9]+/g, '') || '0')

    expect(occupancyValue).toBe(expectedOccupancyCount)
    
    // Additional assertion: At least one property should have tenants
    expect(expectedOccupancyCount).toBeGreaterThan(0)
  })

  test('dashboard open work orders count matches actual open work orders', async ({ page }) => {
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

    // Get properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', landlord.id)

    if (!properties) {
      test.skip()
      return
    }

    const propertyIds = properties.map(p => p.id)

    // Count open work orders (not closed or resolved)
    const { data: workOrders } = await supabase
      .from('maintenance_requests')
      .select('status')
      .in('property_id', propertyIds)
      .not('status', 'eq', 'closed')
      .not('status', 'eq', 'resolved')

    const expectedOpenCount = workOrders?.length || 0

    // Extract open work orders count from dashboard
    const workOrdersElement = page.locator('[data-testid="dashboard-work-orders"], [data-testid="open-work-orders"]').first()
    const workOrdersText = await workOrdersElement.textContent()

    if (!workOrdersText) {
      throw new Error('Could not find work orders count on dashboard')
    }

    const workOrdersValue = parseInt(workOrdersText.replace(/[^0-9]+/g, ''))

    expect(workOrdersValue).toBe(expectedOpenCount)
  })
})

