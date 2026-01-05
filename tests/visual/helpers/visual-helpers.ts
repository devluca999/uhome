/**
 * Visual Test Helper Utilities
 *
 * Common utilities for visual UAT tests including:
 * - Navigation with mock mode
 * - Animation waiting
 * - Dark mode toggling
 * - Screenshot capture
 */

import { Page, expect } from '@playwright/test'
import { setupMockSupabase } from './mock-supabase'

/**
 * Get base URL from environment variable or default to localhost
 */
export function getBaseURL(): string {
  return process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'
}

/**
 * Enable mock mode on a page by adding ?mock=true to URL
 */
export async function enableMockMode(page: Page): Promise<void> {
  const url = new URL(page.url())
  url.searchParams.set('mock', 'true')
  await page.goto(url.toString())
}

/**
 * Set up mock Supabase and authenticate as mock landlord
 */
export async function authenticateAsMockLandlord(page: Page): Promise<void> {
  // Set up mock Supabase interception
  await setupMockSupabase(page)

  // Navigate to login page
  await page.goto(`${getBaseURL()}/login`)

  // Fill in login form with mock credentials
  await page.fill('input[type="email"]', 'landlord@example.com')
  await page.fill('input[type="password"]', 'password123')

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for navigation to dashboard
  await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle')
}

/**
 * Wait for Framer Motion animations to settle
 */
export async function waitForAnimations(page: Page): Promise<void> {
  // Wait for any CSS transitions/animations to complete
  await page.waitForTimeout(500)

  // Wait for network to be idle (no pending requests)
  await page.waitForLoadState('networkidle')

  // Wait a bit more for any JavaScript-driven animations
  await page.waitForTimeout(300)
}

/**
 * Wait for charts (recharts) to render
 */
export async function waitForCharts(page: Page): Promise<void> {
  // Wait for SVG elements (recharts renders as SVG)
  await page.waitForSelector('svg', { timeout: 10000 })

  // Wait for chart containers to be visible
  await page.waitForSelector('[class*="recharts"], [class*="chart"]', { timeout: 10000 })

  // Wait for animations to settle
  await waitForAnimations(page)
}

/**
 * Set dark mode on the page
 */
export async function setDarkMode(page: Page, enabled: boolean): Promise<void> {
  // Find theme toggle button
  const themeToggle = page.locator(
    'button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"]'
  )

  // Get current theme by checking if dark class exists
  const isDark = await page.evaluate(() => {
    return document.documentElement.classList.contains('dark')
  })

  // Toggle if needed
  if (isDark !== enabled) {
    await themeToggle.click()
    await waitForAnimations(page)
  }
}

/**
 * Navigate to a page with optional mock mode
 */
export async function navigateToPage(
  page: Page,
  path: string,
  mockMode: boolean = true
): Promise<void> {
  const baseURL = getBaseURL()
  let url = `${baseURL}${path}`

  if (mockMode) {
    url += (path.includes('?') ? '&' : '?') + 'mock=true'
  }

  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await waitForAnimations(page)
}

/**
 * Capture full page screenshot with proper viewport
 */
export async function captureFullPageScreenshot(page: Page, name: string): Promise<void> {
  // Ensure viewport is correct (1440x900)
  await page.setViewportSize({ width: 1440, height: 900 })

  // Wait for everything to settle
  await waitForAnimations(page)
  await waitForCharts(page)

  // Capture screenshot
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
  })
}

/**
 * Wait for page to be fully ready for screenshot
 */
export async function waitForPageReady(page: Page): Promise<void> {
  // Wait for network idle
  await page.waitForLoadState('networkidle')

  // Wait for animations
  await waitForAnimations(page)

  // Wait for charts if they exist
  const hasCharts = (await page.locator('svg').count()) > 0
  if (hasCharts) {
    await waitForCharts(page)
  }

  // Final wait for any remaining animations
  await page.waitForTimeout(200)
}

/**
 * Setup page for visual test (mock mode + authentication)
 */
export async function setupVisualTest(page: Page): Promise<void> {
  // Set viewport to 1440x900
  await page.setViewportSize({ width: 1440, height: 900 })

  // Authenticate as mock landlord (this sets up mock Supabase)
  await authenticateAsMockLandlord(page)

  // Ensure we're in light mode by default (can be toggled later)
  await setDarkMode(page, false)

  // Wait for page to be ready
  await waitForPageReady(page)
}

/**
 * Extract property name from ledger row
 */
export async function getLedgerPropertyName(
  page: Page,
  rowIndex: number = 0
): Promise<string | null> {
  // First, try to find property names directly on the page (most reliable)
  const propertyNames = page.locator('text=/123 Oak Street|456 Pine Avenue|789 Elm Drive/')
  const count = await propertyNames.count()

  if (count > rowIndex) {
    const name = await propertyNames.nth(rowIndex).textContent()
    if (name) {
      // Clean up the text (remove extra whitespace)
      return name.trim()
    }
  }

  // Fallback: Look for ledger rows and extract property name from them
  const ledgerRows = page.locator(
    '[class*="divide-y"] > div, button:has-text("123 Oak Street"), button:has-text("456 Pine Avenue"), button:has-text("789 Elm Drive")'
  )
  const rowCount = await ledgerRows.count()

  if (rowCount > rowIndex) {
    const row = ledgerRows.nth(rowIndex)
    const rowText = await row.textContent()
    if (rowText) {
      // Extract property name from row text
      const match = rowText.match(/(123 Oak Street|456 Pine Avenue|789 Elm Drive)/)
      if (match && match[1]) {
        return match[1]
      }
    }
  }

  return null
}

/**
 * Extract tenant email from ledger row
 */
export async function getLedgerTenantEmail(
  page: Page,
  rowIndex: number = 0
): Promise<string | null> {
  // First, try to find tenant emails directly on the page
  const emails = page.locator('text=/tenant[0-9]@example.com/')
  const count = await emails.count()

  if (count > rowIndex) {
    const email = await emails.nth(rowIndex).textContent()
    if (email) {
      return email.trim()
    }
  }

  // Fallback: Look for any email pattern in ledger rows
  const ledgerRows = page.locator('[class*="divide-y"] > div, button:has-text("@")')
  const rowCount = await ledgerRows.count()

  if (rowCount > rowIndex) {
    const row = ledgerRows.nth(rowIndex)
    const rowText = await row.textContent()
    if (rowText) {
      // Extract email from row text
      const match = rowText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
      if (match && match[1]) {
        return match[1]
      }
    }
  }

  return null
}

/**
 * Extract amount from ledger row
 */
export async function getLedgerAmount(page: Page, rowIndex: number = 0): Promise<number> {
  // Ledger uses RentLedgerRow components - look for amounts in the rows
  const ledgerRows = page.locator('[class*="divide-y"] > div')
  const row = ledgerRows.nth(rowIndex)

  if ((await row.count()) === 0) {
    return 0
  }

  // Look for dollar amount in the row - get all text and find dollar amounts
  const rowText = await row.textContent()
  if (rowText) {
    const matches = rowText.match(/\$([0-9,]+)/)
    if (matches && matches[1]) {
      return parseInt(matches[1].replace(/,/g, '')) || 0
    }
  }

  return 0
}

/**
 * Get total from KPI strip
 */
export async function getKPITotal(
  page: Page,
  kpiType: 'collected' | 'expenses' | 'net'
): Promise<number> {
  let kpiText: string | null = null

  if (kpiType === 'collected') {
    const kpi = page.locator('text=/Total Collected|Rent Collected|Collected/i').first()
    if ((await kpi.count()) > 0) {
      // Get parent container and find dollar amount
      const container = kpi
        .locator('xpath=ancestor::*[contains(@class, "card") or contains(@class, "kpi")]')
        .first()
      const amount = container.locator('text=/$[0-9,]+/').first()
      if ((await amount.count()) > 0) {
        kpiText = await amount.textContent()
      }
    }
  } else if (kpiType === 'expenses') {
    const kpi = page.locator('text=/Total Expenses|Expenses/i').first()
    if ((await kpi.count()) > 0) {
      const container = kpi
        .locator('xpath=ancestor::*[contains(@class, "card") or contains(@class, "kpi")]')
        .first()
      const amount = container.locator('text=/$[0-9,]+/').first()
      if ((await amount.count()) > 0) {
        kpiText = await amount.textContent()
      }
    }
  } else if (kpiType === 'net') {
    const kpi = page.locator('text=/Net Profit|Net/i').first()
    if ((await kpi.count()) > 0) {
      const container = kpi
        .locator('xpath=ancestor::*[contains(@class, "card") or contains(@class, "kpi")]')
        .first()
      const amount = container.locator('text=/$[0-9,]+/').first()
      if ((await amount.count()) > 0) {
        kpiText = await amount.textContent()
      }
    }
  }

  if (kpiText) {
    return parseInt(kpiText.replace(/[$,]/g, '')) || 0
  }

  return 0
}

/**
 * Switch graph type in FinancialGraphSwitcher
 */
export async function switchGraphType(
  page: Page,
  type: 'line' | 'bar' | 'donut' | 'pie'
): Promise<void> {
  const typeMap = {
    line: 'Line',
    bar: 'Bar',
    donut: 'Donut',
    pie: 'Pie',
  }

  const button = page
    .locator(`button:has-text("${typeMap[type]}"), button[aria-label*="${type}"]`)
    .first()

  if (await button.isVisible()) {
    await button.click()
    await waitForCharts(page)
    await waitForAnimations(page)
  }
}

/**
 * Switch time range in FinancialGraphSwitcher
 */
export async function switchTimeRange(
  page: Page,
  range: 'month' | 'quarter' | 'year'
): Promise<void> {
  const rangeMap = {
    month: 'Month',
    quarter: 'Quarter',
    year: 'Year',
  }

  const button = page.locator(`button:has-text("${rangeMap[range]}")`).first()

  if (await button.isVisible()) {
    await button.click()
    await waitForCharts(page)
    await waitForAnimations(page)
  }
}

/**
 * Select property filter
 */
export async function selectPropertyFilter(page: Page, propertyId: string | 'all'): Promise<void> {
  const select = page.locator('select').first()

  if (await select.isVisible()) {
    if (propertyId === 'all') {
      await select.selectOption({ index: 0 }) // First option is usually "All"
    } else {
      // Try to select by value or label
      try {
        await select.selectOption(propertyId)
      } catch {
        // If that fails, try selecting by visible text
        const propertyName = page
          .locator(`text=/123 Oak Street|456 Pine Avenue|789 Elm Drive/`)
          .first()
        const name = await propertyName.textContent()
        if (name) {
          await select.selectOption({ label: name })
        }
      }
    }
    await waitForPageReady(page)
    await waitForCharts(page)
  }
}

/**
 * Get chart data point count
 */
export async function getChartDataPointCount(page: Page): Promise<number> {
  // Count SVG elements that represent data points
  const dataPoints = page.locator('svg path, svg rect, svg circle, svg line')
  const count = await dataPoints.count()
  return count
}

/**
 * Set ledger date filter to "All Time" to show all mock data
 * The ledger page defaults to "thisMonth" which filters out mock data from 2023-2024
 */
export async function setLedgerDateFilterToAll(page: Page): Promise<void> {
  // Wait for page to be ready
  await page.waitForLoadState('networkidle')
  await waitForAnimations(page)

  // Wait for the filters card to be visible (indicates page loaded successfully)
  await page.waitForSelector('text=Filters', { timeout: 5000 }).catch(() => {})

  // The ledger page uses a select dropdown with "All Time" option (value="all")
  // Select is inside a div with label "Date Range"
  // Try multiple selector strategies to find the date select
  let dateSelect = page
    .locator('select')
    .filter({ has: page.locator('option[value="all"]') })
    .first()

  if ((await dateSelect.count()) === 0) {
    // Fallback: Find select near "Date Range" label
    // The structure is: label "Date Range" followed by select
    dateSelect = page
      .locator('label:has-text("Date Range")')
      .locator('..')
      .locator('select')
      .first()
  }

  if ((await dateSelect.count()) === 0) {
    // Last resort: Find any select and check if it has "All Time" option
    const allSelects = page.locator('select')
    const selectCount = await allSelects.count()
    for (let i = 0; i < selectCount; i++) {
      const select = allSelects.nth(i)
      const hasAllTime = (await select.locator('option[value="all"]').count()) > 0
      if (hasAllTime) {
        dateSelect = select
        break
      }
    }
  }

  // Select "All Time" option (value="all")
  if ((await dateSelect.count()) > 0 && (await dateSelect.isVisible())) {
    // Get the select element's index to use in page.evaluate
    const selectIndex = await dateSelect.evaluate((el: HTMLSelectElement) => {
      const selects = Array.from(document.querySelectorAll('select'))
      return selects.indexOf(el)
    })

    // Use page.evaluate to directly set the value and trigger change event
    // This is more reliable than selectOption in some cases
    await page.evaluate((index: number) => {
      const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[]
      const select = selects[index]
      if (select) {
        select.value = 'all'
        // Trigger change event so React picks it up
        select.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }, selectIndex)

    // Wait for React to process the change
    await page.waitForTimeout(500)
    await waitForAnimations(page)
    await page.waitForLoadState('networkidle')

    // Wait for ledger data to appear
    try {
      await page.waitForSelector('text=/123 Oak Street|456 Pine Avenue|789 Elm Drive/', {
        timeout: 8000,
      })
    } catch {
      // Fallback: Try using selectOption as well (sometimes both are needed)
      try {
        await dateSelect.selectOption({ value: 'all' })
        await page.waitForTimeout(500)
        await waitForAnimations(page)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000)
      } catch {
        // Continue even if both methods fail - data might still load
      }
    }
  } else {
    // Select not found or not visible - try finding it again with a simpler approach
    const simpleSelect = page.locator('select').first()
    if (await simpleSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await simpleSelect.selectOption({ value: 'all' })
      await page.waitForTimeout(500)
      await waitForAnimations(page)
      await page.waitForLoadState('networkidle')
    }
  }
}
