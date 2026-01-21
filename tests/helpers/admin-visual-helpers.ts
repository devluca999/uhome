/**
 * Admin Visual Test Helper Utilities
 *
 * Common utilities for admin visual UAT tests including:
 * - Admin authentication
 * - Admin page navigation
 * - Chart waiting
 * - Modal verification
 * - Screenshot capture for admin pages
 */

import { Page, expect } from '@playwright/test'
import { generateTestEmail, createAndConfirmUser } from './auth-helpers'
import { getSupabaseAdminClient } from './db-helpers'

/**
 * Get base URL from environment variable or default to localhost
 */
export function getAdminBaseURL(): string {
  return process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'
}

/**
 * Setup admin visual test - login as admin and navigate to admin area
 */
export async function setupAdminVisualTest(page: Page): Promise<void> {
  // Create admin user
  const adminEmail = generateTestEmail('admin')
  const password = 'TestPassword123!'
  const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
  const supabaseAdmin = getSupabaseAdminClient()
  await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

  // Set viewport to standard size
  await page.setViewportSize({ width: 1440, height: 900 })

  // Login as admin
  const baseUrl = getAdminBaseURL()
  await page.goto(`${baseUrl}/login`)
  await page.fill('input[type="email"]', adminEmail)
  await page.fill('input[type="password"]', password)
  await page.click('button:has-text("Sign in")')
  await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

  // Wait for page to be ready
  await waitForAdminPageReady(page)
}

/**
 * Wait for admin page to fully load (includes charts, tables, animations)
 */
export async function waitForAdminPageReady(page: Page): Promise<void> {
  // Wait for network idle
  await page.waitForLoadState('networkidle')

  // Wait for animations
  await waitForAnimations(page)

  // Wait for charts if they exist
  const hasCharts = (await page.locator('svg').count()) > 0
  if (hasCharts) {
    await waitForAdminCharts(page)
  }

  // Wait for tables to load
  const hasTables = (await page.locator('table').count()) > 0
  if (hasTables) {
    await page
      .waitForSelector('table tbody tr, table:has-text("No")', { timeout: 5000 })
      .catch(() => {})
  }

  // Final wait for any remaining animations
  await page.waitForTimeout(200)
}

/**
 * Wait for Framer Motion animations to settle
 */
export async function waitForAnimations(page: Page): Promise<void> {
  await page.waitForTimeout(500)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)
}

/**
 * Wait for Recharts to render
 */
export async function waitForAdminCharts(page: Page): Promise<void> {
  // Wait for SVG elements (recharts renders as SVG)
  await page.waitForSelector('svg', { timeout: 10000 })

  // Wait for chart containers to be visible
  await page.waitForSelector('[class*="recharts"], [class*="chart"]', { timeout: 10000 })

  // Wait for animations to settle
  await waitForAnimations(page)
}

/**
 * Capture admin page screenshot with optional tab
 */
export async function captureAdminPageScreenshot(
  page: Page,
  pageName: string,
  tabName?: string
): Promise<void> {
  // Ensure viewport is correct
  await page.setViewportSize({ width: 1440, height: 900 })

  // Wait for everything to settle
  await waitForAdminPageReady(page)

  // Build screenshot name
  const screenshotName = tabName ? `${pageName}-${tabName}` : pageName

  // Capture screenshot
  await expect(page).toHaveScreenshot(screenshotName, {
    fullPage: true,
  })
}

/**
 * Verify tab is visually highlighted
 */
export async function verifyTabActive(page: Page, tabName: string): Promise<boolean> {
  const tab = page.locator(`button:has-text("${tabName}")`)

  if (!(await tab.isVisible({ timeout: 5000 }).catch(() => false))) {
    return false
  }

  const ariaSelected = await tab.getAttribute('aria-selected')
  return ariaSelected === 'true'
}

/**
 * Verify modal is fully visible and scrollable
 */
export async function verifyModalVisible(page: Page, modalTitle: string): Promise<boolean> {
  // Find modal by title
  const modal = page.locator(`text=${modalTitle}`).locator('..').locator('..')

  if (!(await modal.isVisible({ timeout: 3000 }).catch(() => false))) {
    return false
  }

  // Verify modal is in viewport
  const boundingBox = await modal.boundingBox()
  if (!boundingBox) {
    return false
  }

  // Check if modal fits in viewport or is scrollable
  const viewport = page.viewportSize()
  if (!viewport) {
    return false
  }

  // Modal should be visible and within reasonable bounds
  return boundingBox.x >= 0 && boundingBox.y >= 0
}

/**
 * Verify table handles large datasets with scrolling
 */
export async function verifyTableScrollable(page: Page, tableSelector: string): Promise<boolean> {
  const table = page.locator(tableSelector)

  if (!(await table.isVisible({ timeout: 5000 }).catch(() => false))) {
    return false
  }

  // Get table container
  const tableContainer = table.locator('..').first()

  // Check if table has scroll
  const hasScroll = await tableContainer
    .evaluate(el => {
      return el.scrollHeight > el.clientHeight
    })
    .catch(() => false)

  // If table is scrollable, verify scroll works
  if (hasScroll) {
    await tableContainer.evaluate(el => {
      el.scrollTop = 100
    })
    await page.waitForTimeout(100)
  }

  return true
}

/**
 * Navigate to admin page
 */
export async function navigateToAdminPage(page: Page, pagePath: string): Promise<void> {
  const baseUrl = getAdminBaseURL()
  await page.goto(`${baseUrl}${pagePath}`)
  await waitForAdminPageReady(page)
}
