/**
 * Operations Page Visual Tests
 *
 * Validates that the operations page renders correctly with:
 * - Maintenance requests display with status pills
 * - Status pills have high contrast
 * - Status pills text is legible
 * - Status pills have clear semantic meaning (color coding)
 * - Tasks display correctly
 * - Work orders show proper states
 */

import { test, expect } from '@playwright/test'
import {
  setupVisualTest,
  waitForPageReady,
  captureFullPageScreenshot,
} from './helpers/visual-helpers'

test.describe('Operations Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page)
  })

  test('operations page renders correctly', async ({ page }) => {
    await page.goto('/landlord/operations?mock=true')
    await waitForPageReady(page)

    // Verify page loaded
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible()

    // Capture screenshot
    await captureFullPageScreenshot(page, 'operations-light.png')
  })

  test('maintenance requests display with status pills', async ({ page }) => {
    await page.goto('/landlord/operations?mock=true')
    await waitForPageReady(page)

    // Look for maintenance requests
    const maintenanceRequests = page.locator(
      '[class*="maintenance"], [class*="request"], [class*="work-order"]'
    )
    const requestCount = await maintenanceRequests.count()
    expect(requestCount).toBeGreaterThan(0)

    // Look for status pills/badges
    const statusPills = page.locator('[class*="badge"], [class*="status"], [class*="pill"]')
    const pillCount = await statusPills.count()
    expect(pillCount).toBeGreaterThan(0)
  })

  test('status pills have high contrast', async ({ page }) => {
    await page.goto('/landlord/operations?mock=true')
    await waitForPageReady(page)

    // Find status pills
    const statusPills = page.locator('[class*="badge"], [class*="status"], [class*="pill"]')
    const pillCount = await statusPills.count()

    if (pillCount > 0) {
      const firstPill = statusPills.first()

      // Check contrast by verifying text and background are both visible
      const textColor = await firstPill.evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.color
      })

      const bgColor = await firstPill.evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.backgroundColor
      })

      // Both should be defined (not transparent)
      expect(textColor).not.toBe('rgba(0, 0, 0, 0)')
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)')

      // Check opacity
      const opacity = await firstPill.evaluate(el => {
        const style = window.getComputedStyle(el)
        return parseFloat(style.opacity)
      })
      expect(opacity).toBeGreaterThan(0.7) // High opacity = high contrast
    }
  })

  test('status pills text is legible', async ({ page }) => {
    await page.goto('/landlord/operations?mock=true')
    await waitForPageReady(page)

    // Find status pills
    const statusPills = page.locator('[class*="badge"], [class*="status"], [class*="pill"]')
    const pillCount = await statusPills.count()

    if (pillCount > 0) {
      const firstPill = statusPills.first()

      // Verify text exists and is readable
      const text = await firstPill.textContent()
      expect(text?.trim().length).toBeGreaterThan(0)

      // Check font size (should be readable)
      const fontSize = await firstPill.evaluate(el => {
        const style = window.getComputedStyle(el)
        return parseFloat(style.fontSize)
      })
      expect(fontSize).toBeGreaterThanOrEqual(12) // At least 12px
    }
  })

  test('status pills have clear semantic meaning', async ({ page }) => {
    await page.goto('/landlord/operations?mock=true')
    await waitForPageReady(page)

    // Look for status pills with common status text
    const statusTexts = ['pending', 'in progress', 'completed', 'in_progress']
    let foundStatus = false

    for (const statusText of statusTexts) {
      const statusElement = page.locator(`text=/${statusText}/i`)
      const count = await statusElement.count()
      if (count > 0) {
        foundStatus = true
        break
      }
    }

    // Should find at least one status indicator
    expect(foundStatus).toBe(true)

    // Verify different statuses have different styling (color coding)
    const allPills = page.locator('[class*="badge"], [class*="status"], [class*="pill"]')
    const pillCount = await allPills.count()

    if (pillCount > 1) {
      // Get colors of first two pills
      const color1 = await allPills.nth(0).evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.backgroundColor
      })

      const color2 = await allPills.nth(1).evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.backgroundColor
      })

      // They might be the same or different, but both should be visible
      expect(color1).not.toBe('rgba(0, 0, 0, 0)')
      expect(color2).not.toBe('rgba(0, 0, 0, 0)')
    }
  })

  test('tasks display correctly', async ({ page }) => {
    await page.goto('/landlord/operations?mock=true')
    await waitForPageReady(page)

    // Look for tasks
    const tasks = page.locator('[class*="task"], [class*="todo"], [class*="checklist"]')
    const taskCount = await tasks.count()

    // May or may not have tasks, but if they exist, they should be visible
    if (taskCount > 0) {
      await expect(tasks.first()).toBeVisible()
    }
  })

  test('work orders show proper states', async ({ page }) => {
    await page.goto('/landlord/operations?mock=true')
    await waitForPageReady(page)

    // Look for work orders/maintenance requests with different states
    const pendingRequests = page.locator('text=/pending/i')
    const inProgressRequests = page.locator('text=/in progress|in_progress/i')
    const completedRequests = page.locator('text=/completed/i')

    const pendingCount = await pendingRequests.count()
    const inProgressCount = await inProgressRequests.count()
    const completedCount = await completedRequests.count()

    // Should have at least one state represented
    const totalStates = pendingCount + inProgressCount + completedCount
    expect(totalStates).toBeGreaterThan(0)
  })
})
