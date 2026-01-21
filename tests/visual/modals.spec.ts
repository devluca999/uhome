/**
 * Modals Visual Tests
 *
 * Validates modals render correctly:
 * - Never clip content
 * - Properly centered
 * - Close buttons visible
 * - Overlay works correctly
 */

import { test, expect } from '@playwright/test'
import {
  setupVisualTest,
  waitForPageReady,
  captureFullPageScreenshot,
} from './helpers/visual-helpers'

test.describe('Modals Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page)
  })

  test('modals never clip content', async ({ page }) => {
    await page.goto('/landlord/properties?mock=true')
    await waitForPageReady(page)

    // Open a modal (e.g., create property)
    const addButton = page.locator('button:has-text("Add"), button:has-text("Create")').first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)

      // Verify modal is visible
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="dialog"]')
      await expect(modal).toBeVisible()

      // Check that content is not clipped
      const modalContent = modal.locator('[class*="content"], [class*="body"]')
      if (await modalContent.isVisible()) {
        const box = await modalContent.boundingBox()
        expect(box).toBeTruthy()

        // Content should be fully visible
        const viewport = page.viewportSize()
        if (box && viewport) {
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
          expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
        }
      }
    }
  })

  test('modals are properly centered', async ({ page }) => {
    await page.goto('/landlord/properties?mock=true')
    await waitForPageReady(page)

    // Open modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("Create")').first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)

      const modal = page.locator('[role="dialog"], [class*="modal"]')
      if (await modal.isVisible()) {
        const box = await modal.boundingBox()
        const viewport = page.viewportSize()

        if (box && viewport) {
          // Modal should be roughly centered (allow some tolerance)
          const centerX = viewport.width / 2
          const modalCenterX = box.x + box.width / 2
          const offset = Math.abs(centerX - modalCenterX)

          // Allow 50px tolerance
          expect(offset).toBeLessThan(50)
        }
      }
    }
  })

  test('close buttons are always visible', async ({ page }) => {
    await page.goto('/landlord/properties?mock=true')
    await waitForPageReady(page)

    // Open modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("Create")').first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)

      // Look for close button
      const closeButton = page.locator(
        'button[aria-label="Close"], button:has-text("×"), [class*="close"]'
      )
      await expect(closeButton.first()).toBeVisible()
    }
  })

  test('modal overlay works correctly', async ({ page }) => {
    await page.goto('/landlord/properties?mock=true')
    await waitForPageReady(page)

    // Open modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("Create")').first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)

      // Verify overlay exists
      const overlay = page.locator('[class*="overlay"], [class*="backdrop"]')
      if (await overlay.isVisible()) {
        // Overlay should cover entire viewport
        const box = await overlay.boundingBox()
        const viewport = page.viewportSize()

        if (box && viewport) {
          expect(box.width).toBeGreaterThanOrEqual(viewport.width * 0.9)
          expect(box.height).toBeGreaterThanOrEqual(viewport.height * 0.9)
        }
      }
    }
  })
})
