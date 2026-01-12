/**
 * Finances Page Filter Assertions
 *
 * E2E tests for each filter option on the finances page.
 * Validates that filters correctly affect revenue, expenses, and net income calculations.
 */

import { test, expect } from '@playwright/test'
import { financialAssertions } from '../../helpers/financial-assertions'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'
import { loginAsLandlord } from '../../helpers/auth-helpers'

test.describe('Finances Page Filter Assertions', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:3000'

  test('month filter shows correct monthly totals', async ({ page }) => {
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

    // Select monthly filter
    const timePeriodSelect = page.locator('[data-testid="finances-time-period-select"]')
    await timePeriodSelect.selectOption('monthly')
    await page.waitForTimeout(1000) // Wait for filter to apply

    // Calculate expected values for current month
    const currentMonth = new Date()
    const expectedRevenue = await financialAssertions.calculateMonthlyRevenue(landlord.id, currentMonth)
    const expectedExpenses = await financialAssertions.calculateMonthlyExpenses(landlord.id, currentMonth)
    const expectedNetIncome = await financialAssertions.calculateMonthlyNetIncome(landlord.id, currentMonth)

    // Extract values from page (adjust selectors based on actual UI)
    // Wait for elements to be visible and stable (NumberCounter animation completes)
    const revenueElement = page.locator('[data-testid="finances-revenue"]').first()
    const expensesElement = page.locator('[data-testid="finances-expenses"]').first()
    const netIncomeElement = page.locator('[data-testid="finances-net-income"]').first()
    
    await revenueElement.waitFor({ state: 'visible', timeout: 5000 })
    await expensesElement.waitFor({ state: 'visible', timeout: 5000 })
    await netIncomeElement.waitFor({ state: 'visible', timeout: 5000 })
    
    // Wait a bit more for NumberCounter animation to stabilize
    await page.waitForTimeout(500)

    const revenueText = await revenueElement.textContent()
    const expensesText = await expensesElement.textContent()
    const netIncomeText = await netIncomeElement.textContent()

    if (revenueText) {
      const revenueValue = parseFloat(revenueText.replace(/[^0-9.-]+/g, ''))
      expect(Math.abs(revenueValue - expectedRevenue)).toBeLessThan(0.01)
    }

    if (expensesText) {
      const expensesValue = parseFloat(expensesText.replace(/[^0-9.-]+/g, ''))
      expect(Math.abs(expensesValue - expectedExpenses)).toBeLessThan(0.01)
    }

    if (netIncomeText) {
      const netIncomeValue = parseFloat(netIncomeText.replace(/[^0-9.-]+/g, ''))
      expect(Math.abs(netIncomeValue - expectedNetIncome)).toBeLessThan(0.01)
    }
  })

  test('quarter filter shows correct quarterly totals', async ({ page }) => {
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

    // Select quarterly filter
    const timePeriodSelect = page.locator('[data-testid="finances-time-period-select"]')
    await timePeriodSelect.selectOption('quarterly')
    await page.waitForTimeout(1000)

    // Calculate expected values for current quarter
    const now = new Date()
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1)
    const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0)

    const expectedRevenue = await financialAssertions.calculateRevenueForRange(landlord.id, quarterStart, quarterEnd)
    const expectedExpenses = await financialAssertions.calculateExpensesForRange(landlord.id, quarterStart, quarterEnd)
    const expectedNetIncome = await financialAssertions.calculateNetIncomeForRange(landlord.id, quarterStart, quarterEnd)

    // Extract and validate values
    // Wait for elements to be visible and stable (NumberCounter animation completes)
    const revenueElement = page.locator('[data-testid="finances-revenue"]').first()
    const expensesElement = page.locator('[data-testid="finances-expenses"]').first()
    const netIncomeElement = page.locator('[data-testid="finances-net-income"]').first()
    
    await revenueElement.waitFor({ state: 'visible', timeout: 5000 })
    await expensesElement.waitFor({ state: 'visible', timeout: 5000 })
    await netIncomeElement.waitFor({ state: 'visible', timeout: 5000 })
    
    // Wait a bit more for NumberCounter animation to stabilize
    await page.waitForTimeout(500)

    const revenueText = await revenueElement.textContent()
    const expensesText = await expensesElement.textContent()
    const netIncomeText = await netIncomeElement.textContent()

    if (revenueText) {
      const revenueValue = parseFloat(revenueText.replace(/[^0-9.-]+/g, ''))
      expect(Math.abs(revenueValue - expectedRevenue)).toBeLessThan(0.01)
    }

    if (expensesText) {
      const expensesValue = parseFloat(expensesText.replace(/[^0-9.-]+/g, ''))
      expect(Math.abs(expensesValue - expectedExpenses)).toBeLessThan(0.01)
    }

    if (netIncomeText) {
      const netIncomeValue = parseFloat(netIncomeText.replace(/[^0-9.-]+/g, ''))
      expect(Math.abs(netIncomeValue - expectedNetIncome)).toBeLessThan(0.01)
    }
  })

  test('year filter shows correct yearly totals', async ({ page }) => {
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

    // Select yearly filter
    const timePeriodSelect = page.locator('[data-testid="finances-time-period-select"]')
    await timePeriodSelect.selectOption('yearly')
    await page.waitForTimeout(1000)

    // Calculate expected values for current year
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31)

    const expectedRevenue = await financialAssertions.calculateRevenueForRange(landlord.id, yearStart, yearEnd)
    const expectedExpenses = await financialAssertions.calculateExpensesForRange(landlord.id, yearStart, yearEnd)
    const expectedNetIncome = await financialAssertions.calculateNetIncomeForRange(landlord.id, yearStart, yearEnd)

    // Extract and validate values
    // Wait for elements to be visible and stable (NumberCounter animation completes)
    const revenueElement = page.locator('[data-testid="finances-revenue"]').first()
    const expensesElement = page.locator('[data-testid="finances-expenses"]').first()
    const netIncomeElement = page.locator('[data-testid="finances-net-income"]').first()
    
    await revenueElement.waitFor({ state: 'visible', timeout: 5000 })
    await expensesElement.waitFor({ state: 'visible', timeout: 5000 })
    await netIncomeElement.waitFor({ state: 'visible', timeout: 5000 })
    
    // Wait a bit more for NumberCounter animation to stabilize
    await page.waitForTimeout(500)

    const revenueText = await revenueElement.textContent()
    const expensesText = await expensesElement.textContent()
    const netIncomeText = await netIncomeElement.textContent()

    if (revenueText) {
      const revenueValue = parseFloat(revenueText.replace(/[^0-9.-]+/g, ''))
      expect(Math.abs(revenueValue - expectedRevenue)).toBeLessThan(0.01)
    }

    if (expensesText) {
      const expensesValue = parseFloat(expensesText.replace(/[^0-9.-]+/g, ''))
      expect(Math.abs(expensesValue - expectedExpenses)).toBeLessThan(0.01)
    }

    if (netIncomeText) {
      const netIncomeValue = parseFloat(netIncomeText.replace(/[^0-9.-]+/g, ''))
      expect(Math.abs(netIncomeValue - expectedNetIncome)).toBeLessThan(0.01)
    }
  })

  test('property filter correctly filters data', async ({ page }) => {
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

    // Select property filter
    const propertySelect = page.locator('[data-testid="finances-property-select"]').first()
    const propertyOptions = await propertySelect.locator('option').allTextContents().catch(() => [])
    if (propertyOptions.length > 1) {
      // Select first property (skip "All Properties")
      await propertySelect.selectOption({ index: 1 })
      await page.waitForTimeout(1000)

      // Calculate expected values for this property
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const expectedRevenue = await financialAssertions.calculatePropertyRevenue(propertyId, monthStart, monthEnd)
      const expectedExpenses = await financialAssertions.calculatePropertyExpenses(propertyId, monthStart, monthEnd)

      // Extract and validate values
      // Wait for elements to be visible and stable (NumberCounter animation completes)
      const revenueElement = page.locator('[data-testid="finances-revenue"]').first()
      const expensesElement = page.locator('[data-testid="finances-expenses"]').first()
      
      await revenueElement.waitFor({ state: 'visible', timeout: 5000 })
      await expensesElement.waitFor({ state: 'visible', timeout: 5000 })
      
      // Wait a bit more for NumberCounter animation to stabilize
      await page.waitForTimeout(500)

      const revenueText = await revenueElement.textContent()
      const expensesText = await expensesElement.textContent()

      if (revenueText) {
        const revenueValue = parseFloat(revenueText.replace(/[^0-9.-]+/g, ''))
        expect(Math.abs(revenueValue - expectedRevenue)).toBeLessThan(0.01)
      }

      if (expensesText) {
        const expensesValue = parseFloat(expensesText.replace(/[^0-9.-]+/g, ''))
        expect(Math.abs(expensesValue - expectedExpenses)).toBeLessThan(0.01)
      }
    }
  })

  test('filter changes do not affect dashboard values', async ({ page, context }) => {
    // Open dashboard in one tab
    await loginAsLandlord(page, 'demo-landlord@uhome.internal', 'DemoLandlord2024!')
    await page.goto(`${baseUrl}/landlord/dashboard`)
    await page.waitForLoadState('networkidle')

    // Get dashboard revenue value
    const dashboardRevenueElement = page.locator('[data-testid="dashboard-revenue"]').first()
    await dashboardRevenueElement.waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(500) // Wait for NumberCounter animation
    const dashboardRevenueText = await dashboardRevenueElement.textContent()
    const dashboardRevenue = parseFloat(dashboardRevenueText?.replace(/[^0-9.-]+/g, '') || '0')

    // Open finances page in new tab
    const financesPage = await context.newPage()
    await financesPage.goto(`${baseUrl}/landlord/finances`)
    await financesPage.waitForLoadState('networkidle')

    // Change filter on finances page
    const timePeriodSelect = financesPage.locator('[data-testid="finances-time-period-select"]')
    await timePeriodSelect.selectOption('yearly')
    await financesPage.waitForTimeout(1000)

    // Verify dashboard value hasn't changed
    const dashboardRevenueAfterText = await dashboardRevenueElement.textContent()
    const dashboardRevenueAfter = parseFloat(dashboardRevenueAfterText?.replace(/[^0-9.-]+/g, '') || '0')

    expect(Math.abs(dashboardRevenueAfter - dashboardRevenue)).toBeLessThan(0.01)

    await financesPage.close()
  })
})

