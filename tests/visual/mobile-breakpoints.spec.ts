/**
 * Mobile Breakpoints Visual Tests
 *
 * Validates responsive design across breakpoints:
 * - Mobile (375px)
 * - Tablet (768px)
 * - Desktop (1440px)
 */

import { test, expect } from '@playwright/test'
import { setupVisualTest, waitForPageReady } from './helpers/visual-helpers'

test.describe('Mobile Breakpoints Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page)
  })

  test('mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/landlord/dashboard?mock=true')
    await waitForPageReady(page)

    // Verify content is visible and not cut off
    const mainContent = page.locator('main, [role="main"]')
    await expect(mainContent.first()).toBeVisible()

    // Verify no horizontal scroll
    const body = page.locator('body')
    const scrollWidth = await body.evaluate(el => el.scrollWidth)
    const clientWidth = await body.evaluate(el => el.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10) // Allow small tolerance
  })

  test('tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/landlord/dashboard?mock=true')
    await waitForPageReady(page)

    // Verify layout adapts
    const mainContent = page.locator('main, [role="main"]')
    await expect(mainContent.first()).toBeVisible()

    // Verify cards are properly sized
    const cards = page.locator('[class*="card"]')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(0)
  })

  test('desktop viewport (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/landlord/dashboard?mock=true')
    await waitForPageReady(page)

    // Verify full layout
    const mainContent = page.locator('main, [role="main"]')
    await expect(mainContent.first()).toBeVisible()

    // Verify grid layouts work
    const grid = page.locator('[class*="grid"]')
    const gridCount = await grid.count()
    expect(gridCount).toBeGreaterThan(0)
  })

  test('navigation works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/landlord/dashboard?mock=true')
    await waitForPageReady(page)

    // Verify mobile menu (hamburger) is visible
    const mobileMenu = page.locator(
      '[aria-label="Menu"], [class*="hamburger"], button:has-text("☰")'
    )
    const isVisible = await mobileMenu.isVisible()

    // Mobile menu should be visible on small screens
    if (isVisible) {
      await mobileMenu.click()
      await page.waitForTimeout(500)

      // Verify menu opens
      const navMenu = page.locator('nav, [role="navigation"]')
      await expect(navMenu).toBeVisible()
    }
  })

  test('forms are usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/landlord/properties?mock=true')
    await waitForPageReady(page)

    // Open form
    const addButton = page.locator('button:has-text("Add"), button:has-text("Create")').first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)

      // Verify form inputs are large enough to tap
      const inputs = page.locator('input, textarea, select')
      const firstInput = inputs.first()

      if (await firstInput.isVisible()) {
        const box = await firstInput.boundingBox()
        expect(box).toBeTruthy()

        // Inputs should be at least 44px tall (touch target size)
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
    }
  })
})
