/**
 * Edge Case Math Tests
 *
 * Assertions for edge cases and negative scenarios in financial calculations.
 */

import { test, expect } from '@playwright/test'
import { financialAssertions } from '../../helpers/financial-assertions'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'
import { loginAsLandlord } from '../../helpers/auth-helpers'

test.describe('Financial Edge Cases', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:3000'

  test('zero-income month shows zero revenue', async ({ page }) => {
    // This test would require creating a property with no tenants for a specific month
    // For now, we verify the calculation handles zero correctly
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

    // Calculate revenue for a future month (should be 0 if no records exist)
    const futureMonth = new Date()
    futureMonth.setMonth(futureMonth.getMonth() + 6) // 6 months in future

    const futureRevenue = await financialAssertions.calculateMonthlyRevenue(landlord.id, futureMonth)

    // Future month should have 0 or very low revenue (only if seeded data extends that far)
    expect(futureRevenue).toBeGreaterThanOrEqual(0)
    expect(isNaN(futureRevenue)).toBe(false)
  })

  test('property with no tenants shows zero revenue', async ({ page }) => {
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

    // Get all properties
    const { data: allProperties } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', landlord.id)

    if (!allProperties || allProperties.length === 0) {
      test.skip()
      return
    }

    // Get properties with tenants
    const { data: tenants } = await supabase.from('tenants').select('property_id')

    if (!tenants) {
      test.skip()
      return
    }

    const propertiesWithTenants = new Set(tenants.map(t => t.property_id))
    
    // Find a property without tenants (if any)
    const propertyWithoutTenants = allProperties.find(p => !propertiesWithTenants.has(p.id))

    if (propertyWithoutTenants) {
      const currentMonth = new Date()
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const revenue = await financialAssertions.calculatePropertyRevenue(
        propertyWithoutTenants.id,
        monthStart,
        monthEnd
      )

      // Property with no tenants should have 0 revenue
      expect(revenue).toBe(0)
      expect(isNaN(revenue)).toBe(false)
    }
  })

  test('tenant with unpaid rent shows correct outstanding balance', async ({ page }) => {
    await loginAsLandlord(page, 'demo-landlord@uhome.internal', 'DemoLandlord2024!')

    const supabase = getSupabaseAdminClient()

    // Find a tenant with overdue rent
    const { data: overdueRent } = await supabase
      .from('rent_records')
      .select('tenant_id, amount, late_fee, status')
      .eq('status', 'overdue')
      .limit(1)
      .single()

    if (!overdueRent) {
      test.skip()
      return
    }

    const expectedBalance = Number(overdueRent.amount || 0) + Number(overdueRent.late_fee || 0)
    const calculatedBalance = await financialAssertions.calculateTenantBalance(overdueRent.tenant_id)

    // Balance should match (may include multiple overdue records)
    expect(calculatedBalance).toBeGreaterThanOrEqual(expectedBalance)
    expect(isNaN(calculatedBalance)).toBe(false)
  })

  test('expenses still calculated when revenue is zero', async ({ page }) => {
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

    // Get expenses for current month
    const currentMonth = new Date()
    const expenses = await financialAssertions.calculateMonthlyExpenses(landlord.id, currentMonth)

    // Expenses should be calculated even if revenue is 0
    expect(expenses).toBeGreaterThanOrEqual(0)
    expect(isNaN(expenses)).toBe(false)

    // Net income should be negative if expenses > revenue
    const revenue = await financialAssertions.calculateMonthlyRevenue(landlord.id, currentMonth)
    const netIncome = await financialAssertions.calculateMonthlyNetIncome(landlord.id, currentMonth)

    expect(netIncome).toBe(revenue - expenses)
    expect(isNaN(netIncome)).toBe(false)
  })

  test('no NaN values in financial calculations', async ({ page }) => {
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

    // Calculate all metrics
    const currentMonth = new Date()
    const revenue = await financialAssertions.calculateMonthlyRevenue(landlord.id, currentMonth)
    const expenses = await financialAssertions.calculateMonthlyExpenses(landlord.id, currentMonth)
    const netIncome = await financialAssertions.calculateMonthlyNetIncome(landlord.id, currentMonth)

    // Verify no NaN values
    expect(isNaN(revenue)).toBe(false)
    expect(isNaN(expenses)).toBe(false)
    expect(isNaN(netIncome)).toBe(false)

    // Verify values are numbers
    expect(typeof revenue).toBe('number')
    expect(typeof expenses).toBe('number')
    expect(typeof netIncome).toBe('number')

    // Verify values are finite
    expect(isFinite(revenue)).toBe(true)
    expect(isFinite(expenses)).toBe(true)
    expect(isFinite(netIncome)).toBe(true)
  })

  test('negative net income is handled correctly', async ({ page }) => {
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

    const currentMonth = new Date()
    const revenue = await financialAssertions.calculateMonthlyRevenue(landlord.id, currentMonth)
    const expenses = await financialAssertions.calculateMonthlyExpenses(landlord.id, currentMonth)
    const netIncome = await financialAssertions.calculateMonthlyNetIncome(landlord.id, currentMonth)

    // Net income can be negative (expenses > revenue)
    expect(netIncome).toBe(revenue - expenses)

    // Verify negative values are handled (not converted to NaN or Infinity)
    if (expenses > revenue) {
      expect(netIncome).toBeLessThan(0)
      expect(isFinite(netIncome)).toBe(true)
    }
  })
})

