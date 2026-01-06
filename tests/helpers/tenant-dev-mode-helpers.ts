/**
 * Tenant Dev Mode E2E Test Helpers
 * 
 * Utilities for testing Tenant Dev Mode functionality with Playwright
 */

import { Page, expect } from '@playwright/test'
import { TENANT_DEV_MODE_STORAGE_KEY } from '../../src/lib/tenant-dev-mode'

/**
 * Enable Tenant Dev Mode by adding ?dev=tenant URL parameter
 */
export async function enableTenantDevMode(page: Page, baseUrl: string = 'http://localhost:5173'): Promise<void> {
  const url = new URL(baseUrl)
  url.searchParams.set('dev', 'tenant')
  await page.goto(url.toString())
  await page.waitForLoadState('networkidle')
}

/**
 * Navigate to tenant dev mode with URL parameter
 */
export async function navigateToTenantDevMode(page: Page, path: string = '/', baseUrl: string = 'http://localhost:5173'): Promise<void> {
  const url = new URL(path, baseUrl)
  url.searchParams.set('dev', 'tenant')
  await page.goto(url.toString())
  await page.waitForLoadState('networkidle')
}

/**
 * Reset Tenant Dev Mode state (clear localStorage)
 */
export async function resetTenantDevModeState(page: Page): Promise<void> {
  await page.evaluate((storageKey) => {
    localStorage.removeItem(storageKey)
  }, TENANT_DEV_MODE_STORAGE_KEY)
}

/**
 * Get mock work orders from localStorage
 */
export async function getMockWorkOrders(page: Page): Promise<any[]> {
  const state = await page.evaluate((storageKey) => {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return null
    return JSON.parse(stored)
  }, TENANT_DEV_MODE_STORAGE_KEY)
  
  return state?.workOrders || []
}

/**
 * Get mock notifications from localStorage
 */
export async function getMockNotifications(page: Page): Promise<any[]> {
  const state = await page.evaluate((storageKey) => {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return null
    return JSON.parse(stored)
  }, TENANT_DEV_MODE_STORAGE_KEY)
  
  return state?.notifications || []
}

/**
 * Get full mock state from localStorage
 */
export async function getMockState(page: Page): Promise<any> {
  return await page.evaluate((storageKey) => {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return null
    return JSON.parse(stored)
  }, TENANT_DEV_MODE_STORAGE_KEY)
}

/**
 * Wait for mock data to load (checks for work orders on page)
 */
export async function waitForMockDataLoad(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForSelector('[data-testid^="work-order-card-"]', { timeout })
}

/**
 * Verify Tenant Dev Mode is active (check for dev mode indicator or URL param)
 */
export async function verifyDevModeActive(page: Page): Promise<void> {
  const url = new URL(page.url())
  expect(url.searchParams.get('dev')).toBe('tenant')
}

/**
 * Count work orders on page
 */
export async function countWorkOrderCards(page: Page): Promise<number> {
  const cards = await page.locator('[data-testid^="work-order-card-"]').all()
  return cards.length
}

/**
 * Get work order card by ID
 */
export function getWorkOrderCard(page: Page, id: string) {
  return page.locator(`[data-testid="work-order-card-${id}"]`)
}

/**
 * Get work order status badge by ID
 */
export function getWorkOrderStatusBadge(page: Page, id: string) {
  return page.locator(`[data-testid="work-order-status-badge-${id}"]`)
}

/**
 * Click confirm resolution button for a work order
 */
export async function clickConfirmResolution(page: Page, id: string): Promise<void> {
  await page.locator(`[data-testid="confirm-resolution-btn-${id}"]`).click()
}

/**
 * Click flag issue button for a work order
 */
export async function clickFlagIssue(page: Page, id: string): Promise<void> {
  await page.locator(`[data-testid="flag-issue-btn-${id}"]`).click()
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(page: Page): Promise<number> {
  const countElement = page.locator('[data-testid="notification-unread-count"]')
  const count = await countElement.textContent()
  return count ? parseInt(count, 10) : 0
}

/**
 * Verify work order status
 */
export async function verifyWorkOrderStatus(page: Page, id: string, expectedStatus: string): Promise<void> {
  const badge = getWorkOrderStatusBadge(page, id)
  await expect(badge).toContainText(expectedStatus, { ignoreCase: true })
}

/**
 * Verify state persists after page refresh
 */
export async function verifyStatePersistsAfterRefresh(page: Page): Promise<void> {
  // Get state before refresh
  const stateBefore = await getMockState(page)
  
  // Refresh page
  await page.reload()
  await page.waitForLoadState('networkidle')
  
  // Get state after refresh
  const stateAfter = await getMockState(page)
  
  // Verify state is the same
  expect(stateAfter).toEqual(stateBefore)
}

/**
 * Wait for notification to appear
 */
export async function waitForNotification(page: Page, bodyText: string, timeout: number = 5000): Promise<void> {
  await page.waitForSelector(`text=${bodyText}`, { timeout })
}

/**
 * Setup: Reset dev mode state before test
 */
export async function setupTenantDevMode(page: Page, baseUrl: string = 'http://localhost:5173'): Promise<void> {
  // Reset state
  await page.goto(baseUrl)
  await resetTenantDevModeState(page)
  
  // Enable dev mode
  await enableTenantDevMode(page, baseUrl)
}

/**
 * Teardown: Clean up dev mode state after test
 */
export async function teardownTenantDevMode(page: Page): Promise<void> {
  await resetTenantDevModeState(page)
}

/**
 * Verify mock data loaded correctly
 */
export async function verifyMockDataLoaded(page: Page): Promise<void> {
  const state = await getMockState(page)
  
  expect(state).toBeTruthy()
  expect(state.workOrders).toBeTruthy()
  expect(state.workOrders.length).toBeGreaterThan(0)
  expect(state.notifications).toBeTruthy()
  expect(state.tenantData).toBeTruthy()
  expect(state.tenantData.property).toBeTruthy()
}

