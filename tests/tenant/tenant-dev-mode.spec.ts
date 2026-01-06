import { test, expect } from '@playwright/test'
import {
  setupTenantDevMode,
  teardownTenantDevMode,
  verifyDevModeActive,
  verifyMockDataLoaded,
  waitForMockDataLoad,
  getMockWorkOrders,
  getMockNotifications,
  getWorkOrderCard,
  verifyWorkOrderStatus,
  clickConfirmResolution,
  clickFlagIssue,
  verifyStatePersistsAfterRefresh,
  resetTenantDevModeState,
  getMockState,
  countWorkOrderCards,
} from '../helpers/tenant-dev-mode-helpers'

test.describe('Tenant Dev Mode', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:5173'

  test.beforeEach(async ({ page }) => {
    await setupTenantDevMode(page, baseUrl)
  })

  test.afterEach(async ({ page }) => {
    await teardownTenantDevMode(page)
  })

  test('should activate dev mode with URL parameter', async ({ page }) => {
    // Verify dev mode is active
    await verifyDevModeActive(page)
    
    // Verify URL parameter is present
    const url = new URL(page.url())
    expect(url.searchParams.get('dev')).toBe('tenant')
  })

  test('should load mock tenant data', async ({ page }) => {
    // Navigate to tenant maintenance page
    await page.goto(`${baseUrl}/tenant/maintenance?dev=tenant`)
    await page.waitForLoadState('networkidle')
    
    // Verify mock data is loaded
    await verifyMockDataLoaded(page)
    
    // Verify work orders appear on page
    await waitForMockDataLoad(page)
    
    const workOrderCount = await countWorkOrderCards(page)
    expect(workOrderCount).toBeGreaterThan(0)
  })

  test('should display 3 work orders with different statuses', async ({ page }) => {
    // Navigate to maintenance page
    await page.goto(`${baseUrl}/tenant/maintenance?dev=tenant`)
    await page.waitForLoadState('networkidle')
    
    // Wait for work orders to load
    await waitForMockDataLoad(page)
    
    // Verify 3 work orders are displayed
    const workOrderCount = await countWorkOrderCards(page)
    expect(workOrderCount).toBe(3)
    
    // Get mock work orders from localStorage
    const mockWorkOrders = await getMockWorkOrders(page)
    expect(mockWorkOrders.length).toBe(3)
    
    // Verify different statuses
    const statuses = mockWorkOrders.map(wo => wo.status)
    expect(statuses).toContain('submitted')
    expect(statuses).toContain('scheduled')
    expect(statuses).toContain('resolved')
  })

  test('should confirm work order resolution', async ({ page }) => {
    // Navigate to maintenance page
    await page.goto(`${baseUrl}/tenant/maintenance?dev=tenant`)
    await page.waitForLoadState('networkidle')
    
    // Wait for work orders to load
    await waitForMockDataLoad(page)
    
    // Get mock work orders
    const mockWorkOrders = await getMockWorkOrders(page)
    const resolvedWorkOrder = mockWorkOrders.find(wo => wo.status === 'resolved')
    
    if (!resolvedWorkOrder) {
      throw new Error('No resolved work order found in mock data')
    }
    
    // Verify initial status
    await verifyWorkOrderStatus(page, resolvedWorkOrder.id, 'Awaiting your confirmation')
    
    // Click confirm resolution button
    await clickConfirmResolution(page, resolvedWorkOrder.id)
    
    // Wait for status update
    await page.waitForTimeout(500)
    
    // Verify status changed to closed
    await verifyWorkOrderStatus(page, resolvedWorkOrder.id, 'Closed')
    
    // Verify state persisted to localStorage
    const updatedMockWorkOrders = await getMockWorkOrders(page)
    const updatedWorkOrder = updatedMockWorkOrders.find(wo => wo.id === resolvedWorkOrder.id)
    expect(updatedWorkOrder?.status).toBe('closed')
  })

  test('should flag work order as still an issue', async ({ page }) => {
    // Navigate to maintenance page
    await page.goto(`${baseUrl}/tenant/maintenance?dev=tenant`)
    await page.waitForLoadState('networkidle')
    
    // Wait for work orders to load
    await waitForMockDataLoad(page)
    
    // Get mock work orders
    const mockWorkOrders = await getMockWorkOrders(page)
    const resolvedWorkOrder = mockWorkOrders.find(wo => wo.status === 'resolved')
    
    if (!resolvedWorkOrder) {
      throw new Error('No resolved work order found in mock data')
    }
    
    // Click flag issue button
    await clickFlagIssue(page, resolvedWorkOrder.id)
    
    // Wait for alert
    await page.waitForTimeout(500)
    
    // Accept alert (browser dialog)
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Issue flagged')
      await dialog.accept()
    })
  })

  test('should persist state across page refresh', async ({ page }) => {
    // Navigate to maintenance page
    await page.goto(`${baseUrl}/tenant/maintenance?dev=tenant`)
    await page.waitForLoadState('networkidle')
    
    // Wait for work orders to load
    await waitForMockDataLoad(page)
    
    // Get mock work orders
    const mockWorkOrdersBefore = await getMockWorkOrders(page)
    const resolvedWorkOrder = mockWorkOrdersBefore.find(wo => wo.status === 'resolved')
    
    if (!resolvedWorkOrder) {
      throw new Error('No resolved work order found in mock data')
    }
    
    // Confirm resolution
    await clickConfirmResolution(page, resolvedWorkOrder.id)
    await page.waitForTimeout(500)
    
    // Verify state persists after refresh
    await verifyStatePersistsAfterRefresh(page)
    
    // Navigate to maintenance page again
    await page.goto(`${baseUrl}/tenant/maintenance?dev=tenant`)
    await page.waitForLoadState('networkidle')
    
    // Verify work order is still closed
    await verifyWorkOrderStatus(page, resolvedWorkOrder.id, 'Closed')
  })

  test('should reset state when localStorage is cleared', async ({ page }) => {
    // Navigate to maintenance page
    await page.goto(`${baseUrl}/tenant/maintenance?dev=tenant`)
    await page.waitForLoadState('networkidle')
    
    // Wait for work orders to load
    await waitForMockDataLoad(page)
    
    // Get mock work orders
    const mockWorkOrdersBefore = await getMockWorkOrders(page)
    const resolvedWorkOrder = mockWorkOrdersBefore.find(wo => wo.status === 'resolved')
    
    if (!resolvedWorkOrder) {
      throw new Error('No resolved work order found in mock data')
    }
    
    // Confirm resolution
    await clickConfirmResolution(page, resolvedWorkOrder.id)
    await page.waitForTimeout(500)
    
    // Verify status changed
    const updatedWorkOrders1 = await getMockWorkOrders(page)
    const updatedWorkOrder1 = updatedWorkOrders1.find(wo => wo.id === resolvedWorkOrder.id)
    expect(updatedWorkOrder1?.status).toBe('closed')
    
    // Reset state
    await resetTenantDevModeState(page)
    
    // Refresh page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Verify state reset to seed
    const resetWorkOrders = await getMockWorkOrders(page)
    const resetWorkOrder = resetWorkOrders.find(wo => wo.id === resolvedWorkOrder.id)
    expect(resetWorkOrder?.status).toBe('resolved')  // Back to seed state
  })

  test('should display notifications from mock data', async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`${baseUrl}/tenant/dashboard?dev=tenant`)
    await page.waitForLoadState('networkidle')
    
    // Get mock notifications
    const mockNotifications = await getMockNotifications(page)
    
    // Verify notifications exist
    expect(mockNotifications.length).toBeGreaterThan(0)
    
    // Count unread notifications
    const unreadCount = mockNotifications.filter(n => !n.read).length
    expect(unreadCount).toBeGreaterThan(0)
  })

  test('should show correct work order counts on dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`${baseUrl}/tenant/dashboard?dev=tenant`)
    await page.waitForLoadState('networkidle')
    
    // Get pending work orders count
    const pendingCountElement = page.locator('[data-testid="pending-work-orders-count"]')
    await expect(pendingCountElement).toBeVisible()
    
    const pendingCountText = await pendingCountElement.textContent()
    const pendingCount = parseInt(pendingCountText || '0', 10)
    
    // Get mock work orders
    const mockWorkOrders = await getMockWorkOrders(page)
    const pendingMockWorkOrders = mockWorkOrders.filter(wo => 
      wo.status === 'submitted' || 
      wo.status === 'seen' || 
      wo.status === 'scheduled' || 
      wo.status === 'in_progress' || 
      wo.status === 'resolved'
    )
    
    // Verify count matches
    expect(pendingCount).toBe(pendingMockWorkOrders.length)
  })

  test('should not activate dev mode without URL parameter', async ({ page }) => {
    // Navigate without ?dev=tenant parameter
    await page.goto(`${baseUrl}/tenant/dashboard`)
    await page.waitForLoadState('networkidle')
    
    // Verify URL parameter is not present
    const url = new URL(page.url())
    expect(url.searchParams.get('dev')).toBeNull()
    
    // Mock state should not be in localStorage
    const mockState = await getMockState(page)
    expect(mockState).toBeNull()
  })
})

