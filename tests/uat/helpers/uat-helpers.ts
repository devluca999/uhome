/**
 * UAT Test Helpers
 *
 * Common utilities for comprehensive UAT tests including:
 * - Environment verification
 * - Test data setup
 * - Multi-tab coordination
 * - Result tracking
 */

import { Page, BrowserContext, expect } from '@playwright/test'
import { enforceStagingOnly } from '../../helpers/env-guard'
import { seedTestScenario, type SeededData } from '../../helpers/seed'
import { resetAll } from '../../helpers/reset'
import {
  createTestLandlord,
  loginAsLandlord,
  loginAsTenant,
  generateTestEmail,
} from '../../helpers/auth-helpers'

/**
 * Verify staging environment before test execution
 */
export function verifyStagingEnvironment(): void {
  enforceStagingOnly()
}

/**
 * Setup test scenario with landlord and tenant
 */
export async function setupUATScenario(
  options: {
    propertyName?: string
    createWorkOrders?: boolean
    createMessages?: boolean
    createTasks?: boolean
  } = {}
): Promise<SeededData> {
  verifyStagingEnvironment()
  return seedTestScenario({
    propertyName: options.propertyName || 'UAT Test Property',
    createWorkOrders: options.createWorkOrders ?? true,
    createMessages: options.createMessages ?? true,
    createTasks: options.createTasks ?? true,
  })
}

/**
 * Setup landlord and tenant in separate pages for multi-tab testing
 */
export async function setupMultiTabScenario(
  context: BrowserContext,
  options: {
    propertyName?: string
    createWorkOrders?: boolean
    createMessages?: boolean
    createTasks?: boolean
  } = {}
): Promise<{
  landlordPage: Page
  tenantPage: Page
  seeded: SeededData
}> {
  verifyStagingEnvironment()

  const seeded = await setupUATScenario(options)

  if (!seeded.tenant) {
    throw new Error('Failed to seed tenant for multi-tab scenario')
  }

  const landlordPage = await context.newPage()
  const tenantPage = await context.newPage()

  // Login landlord
  await landlordPage.goto('/login')
  await landlordPage.fill('input[type="email"]', seeded.landlord.email)
  await landlordPage.fill('input[type="password"]', 'TestPassword123!')
  await landlordPage.click('button[type="submit"]')
  await landlordPage.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

  // Login tenant
  await tenantPage.goto('/login')
  await tenantPage.fill('input[type="email"]', seeded.tenant.email)
  await tenantPage.fill('input[type="password"]', 'TestPassword123!')
  await tenantPage.click('button[type="submit"]')
  await tenantPage.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

  return { landlordPage, tenantPage, seeded }
}

/**
 * Login as landlord using seeded credentials
 * Wrapper around loginAsLandlord with consistent password
 */
export async function loginAsSeededLandlord(page: Page, email: string): Promise<void> {
  await loginAsLandlord(page, email, 'TestPassword123!')
}

/**
 * Login as tenant using seeded credentials
 * Wrapper around loginAsTenant with consistent password
 */
export async function loginAsSeededTenant(page: Page, email: string): Promise<void> {
  await loginAsTenant(page, email, 'TestPassword123!')
}

/**
 * Wait for page to be fully loaded and ready
 */
export async function waitForPageReady(page: Page, timeout: number = 10000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
  await page.waitForTimeout(500) // Additional wait for React hydration
}

/**
 * Verify data persistence by refreshing and checking
 */
export async function verifyDataPersistence(
  page: Page,
  verifyFn: (page: Page) => Promise<boolean>,
  description: string
): Promise<void> {
  // Verify before refresh
  const beforeRefresh = await verifyFn(page)
  expect(beforeRefresh).toBeTruthy()

  // Refresh page
  await page.reload()
  await waitForPageReady(page)

  // Verify after refresh
  const afterRefresh = await verifyFn(page)
  expect(afterRefresh).toBeTruthy()
}

/**
 * Navigate to page and wait for ready
 */
export async function navigateToPage(
  page: Page,
  path: string,
  options: { waitForSelector?: string } = {}
): Promise<void> {
  await page.goto(path)
  await waitForPageReady(page)

  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { timeout: 10000 })
  }
}

/**
 * Verify modal opens and content is not clipped
 */
export async function verifyModalOpens(
  page: Page,
  triggerSelector: string,
  modalSelector: string = '[role="dialog"], [class*="modal"]'
): Promise<void> {
  // Click trigger
  await page.click(triggerSelector)
  await page.waitForTimeout(500)

  // Verify modal is visible
  const modal = page.locator(modalSelector)
  await expect(modal).toBeVisible({ timeout: 5000 })

  // Verify content is not clipped
  const modalContent = modal.locator('[class*="content"], [class*="body"]')
  if (await modalContent.isVisible()) {
    const box = await modalContent.boundingBox()
    const viewport = page.viewportSize()

    if (box && viewport) {
      // Content should fit within viewport
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
    }
  }
}

/**
 * Verify chart is interactive and renders correctly
 */
export async function verifyChartInteractive(
  page: Page,
  chartSelector: string = 'svg, [class*="chart"]'
): Promise<void> {
  const chart = page.locator(chartSelector).first()
  await expect(chart).toBeVisible({ timeout: 5000 })

  // Verify chart has content
  const hasContent = (await chart.locator('path, rect, circle').count()) > 0
  expect(hasContent).toBeTruthy()
}

/**
 * Verify toggle state is visually obvious
 */
export async function verifyToggleState(
  page: Page,
  toggleSelector: string,
  expectedState: boolean
): Promise<void> {
  const toggle = page.locator(toggleSelector)
  await expect(toggle).toBeVisible()

  // Check aria-checked or data-state
  const state =
    (await toggle.getAttribute('aria-checked')) ||
    (await toggle.getAttribute('data-state')) ||
    ((await toggle.isChecked()) ? 'true' : 'false')

  expect(state === 'true' || state === 'checked').toBe(expectedState)

  // Verify visual state (opacity, color, etc.)
  const opacity = await toggle.evaluate(el => {
    const style = window.getComputedStyle(el)
    return parseFloat(style.opacity)
  })
  expect(opacity).toBeGreaterThan(0.5) // Should be visible
}

/**
 * Cleanup helper for UAT tests
 */
export async function cleanupUATTest(page?: Page): Promise<void> {
  if (page) {
    await resetAll(page)
  } else {
    // Reset without page (for cleanup after context closed)
    const { resetStagingFixtures } = await import('../../helpers/reset')
    await resetStagingFixtures()
  }
}
