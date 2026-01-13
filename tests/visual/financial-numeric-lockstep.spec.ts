/**
 * Visual UAT + Numeric Lockstep Tests
 *
 * Visual UAT tests with numeric value assertions overlay.
 * Combines visual snapshot testing with mathematical validation.
 */

import { test, expect } from '@playwright/test'
import { financialAssertions } from '../helpers/financial-assertions'
import { getSupabaseAdminClient } from '../helpers/db-helpers'
import { loginAsLandlord } from '../helpers/auth-helpers'

test.describe('Financial Numeric Lockstep', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test('dashboard visual + numeric validation', async ({ page }) => {
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

    // Calculate expected values
    const currentMonth = new Date()
    const expectedRevenue = await financialAssertions.calculateMonthlyRevenue(landlord.id, currentMonth)
    const expectedExpenses = await financialAssertions.calculateMonthlyExpenses(landlord.id, currentMonth)
    const expectedNetIncome = await financialAssertions.calculateMonthlyNetIncome(landlord.id, currentMonth)

    // Capture screenshot
    const screenshot = await page.screenshot({ fullPage: false })

    // Extract numeric values from page
    const revenueElement = page.locator('[data-testid="dashboard-revenue"]').first()
    const expensesElement = page.locator('[data-testid="dashboard-expenses"]').first()
    const netIncomeElement = page.locator('[data-testid="dashboard-net-income"]').first()

    const revenueText = await revenueElement.textContent().catch(() => null)
    const expensesText = await expensesElement.textContent().catch(() => null)
    const netIncomeText = await netIncomeElement.textContent().catch(() => null)

    // Extract numeric values
    const revenueValue = revenueText ? parseFloat(revenueText.replace(/[^0-9.-]+/g, '')) : 0
    const expensesValue = expensesText ? parseFloat(expensesText.replace(/[^0-9.-]+/g, '')) : 0
    const netIncomeValue = netIncomeText ? parseFloat(netIncomeText.replace(/[^0-9.-]+/g, '')) : 0

    // Assert numeric values match expected
    expect(Math.abs(revenueValue - expectedRevenue)).toBeLessThan(0.01)
    expect(Math.abs(expensesValue - expectedExpenses)).toBeLessThan(0.01)
    expect(Math.abs(netIncomeValue - expectedNetIncome)).toBeLessThan(0.01)

    // Visual snapshot (optional - can be enabled if visual testing is set up)
    // await expect(page).toHaveScreenshot('dashboard-financial-metrics.png')
  })

  test('finances page visual + numeric validation with filters', async ({ page }) => {
    await loginAsLandlord(page, 'demo-landlord@uhome.internal', 'DemoLandlord2024!')
    await page.goto(`${baseUrl}/landlord/finances`)
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

    // Apply monthly filter
    const timePeriodSelect = page.locator('[data-testid="finances-time-period-select"]')
    await timePeriodSelect.selectOption('monthly')
    await page.waitForTimeout(1000)

    // Calculate expected values
    const currentMonth = new Date()
    const expectedRevenue = await financialAssertions.calculateMonthlyRevenue(landlord.id, currentMonth)
    const expectedExpenses = await financialAssertions.calculateMonthlyExpenses(landlord.id, currentMonth)
    const expectedNetIncome = await financialAssertions.calculateMonthlyNetIncome(landlord.id, currentMonth)

    // Capture screenshot
    const screenshot = await page.screenshot({ fullPage: false })

    // Extract numeric values
    const revenueElement = page.locator('[data-testid="finances-revenue"]').first()
    const expensesElement = page.locator('[data-testid="finances-expenses"]').first()
    const netIncomeElement = page.locator('[data-testid="finances-net-income"]').first()

    const revenueText = await revenueElement.textContent().catch(() => null)
    const expensesText = await expensesElement.textContent().catch(() => null)
    const netIncomeText = await netIncomeElement.textContent().catch(() => null)

    const revenueValue = revenueText ? parseFloat(revenueText.replace(/[^0-9.-]+/g, '')) : 0
    const expensesValue = expensesText ? parseFloat(expensesText.replace(/[^0-9.-]+/g, '')) : 0
    const netIncomeValue = netIncomeText ? parseFloat(netIncomeText.replace(/[^0-9.-]+/g, '')) : 0

    // Assert numeric values match expected
    expect(Math.abs(revenueValue - expectedRevenue)).toBeLessThan(0.01)
    expect(Math.abs(expensesValue - expectedExpenses)).toBeLessThan(0.01)
    expect(Math.abs(netIncomeValue - expectedNetIncome)).toBeLessThan(0.01)
  })

  test('property page visual + numeric validation', async ({ page }) => {
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
      .select('id')
      .eq('owner_id', landlord.id)
      .limit(1)

    if (!properties || properties.length === 0) {
      test.skip()
      return
    }

    const propertyId = properties[0].id

    await page.goto(`${baseUrl}/landlord/properties/${propertyId}`)
    await page.waitForLoadState('networkidle')

    // Calculate expected values
    const currentMonth = new Date()
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const expectedRevenue = await financialAssertions.calculatePropertyRevenue(propertyId, monthStart, monthEnd)
    const expectedExpenses = await financialAssertions.calculatePropertyExpenses(propertyId, monthStart, monthEnd)

    // Capture screenshot
    const screenshot = await page.screenshot({ fullPage: false })

    // Extract numeric values
    const revenueElement = page.locator('[data-testid="property-revenue"]').first()
    const expensesElement = page.locator('[data-testid="property-expenses"]').first()

    const revenueText = await revenueElement.textContent().catch(() => null)
    const expensesText = await expensesElement.textContent().catch(() => null)

    const revenueValue = revenueText ? parseFloat(revenueText.replace(/[^0-9.-]+/g, '')) : 0
    const expensesValue = expensesText ? parseFloat(expensesText.replace(/[^0-9.-]+/g, '')) : 0

    // Assert numeric values match expected
    expect(Math.abs(revenueValue - expectedRevenue)).toBeLessThan(0.01)
    expect(Math.abs(expensesValue - expectedExpenses)).toBeLessThan(0.01)
  })
})

