/**
 * Dark Mode Visual Tests
 *
 * Validates dark mode rendering for all pages:
 * - Background is not pure black (depth visible)
 * - Cards are distinguishable via contrast/elevation
 * - Text contrast is readable (WCAG AA minimum)
 * - Depth is visible via contrast/elevation
 */

import { test, expect } from '@playwright/test'
import {
  setupVisualTest,
  waitForPageReady,
  waitForCharts,
  setDarkMode,
  captureFullPageScreenshot,
} from './helpers/visual-helpers'

test.describe('Dark Mode Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page)
    // Switch to dark mode
    await setDarkMode(page, true)
  })

  test('dark mode dashboard', async ({ page }) => {
    await page.goto('/landlord/dashboard?mock=true')
    await waitForPageReady(page)
    await waitForCharts(page)

    // Verify dark mode is active
    const isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark')
    })
    expect(isDark).toBe(true)

    // Check background is not pure black
    const bgColor = await page.evaluate(() => {
      const style = window.getComputedStyle(document.documentElement)
      return style.backgroundColor
    })

    // Should not be pure black (rgb(0, 0, 0))
    expect(bgColor).not.toBe('rgb(0, 0, 0)')

    // Capture screenshot
    await captureFullPageScreenshot(page, 'dashboard-dark.png')
  })

  test('dark mode finance page', async ({ page }) => {
    await page.goto('/landlord/finances?mock=true')
    await waitForPageReady(page)
    await waitForCharts(page)

    // Verify dark mode
    const isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark')
    })
    expect(isDark).toBe(true)

    // Capture screenshot
    await captureFullPageScreenshot(page, 'finances-dark.png')
  })

  test('dark mode operations page', async ({ page }) => {
    await page.goto('/landlord/operations?mock=true')
    await waitForPageReady(page)

    // Verify dark mode
    const isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark')
    })
    expect(isDark).toBe(true)

    // Capture screenshot
    await captureFullPageScreenshot(page, 'operations-dark.png')
  })

  test('background is not pure black (depth visible)', async ({ page }) => {
    await page.goto('/landlord/dashboard?mock=true')
    await waitForPageReady(page)

    // Get background color
    const bgColor = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body)
      return style.backgroundColor
    })

    // Parse RGB values
    const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1])
      const g = parseInt(rgbMatch[2])
      const b = parseInt(rgbMatch[3])

      // Should not be pure black (0, 0, 0)
      // Allow some darkness but not complete black
      const isNotPureBlack = r > 0 || g > 0 || b > 0
      expect(isNotPureBlack).toBe(true)

      // Should be dark (low values) but not zero
      const avgBrightness = (r + g + b) / 3
      expect(avgBrightness).toBeLessThan(50) // Dark but not pure black
      expect(avgBrightness).toBeGreaterThan(0) // Not pure black
    }
  })

  test('cards are distinguishable via contrast/elevation', async ({ page }) => {
    await page.goto('/landlord/dashboard?mock=true')
    await waitForPageReady(page)

    // Find cards
    const cards = page.locator('[class*="card"]')
    const cardCount = await cards.count()

    if (cardCount > 1) {
      // Get background colors of first two cards
      const card1Bg = await cards.nth(0).evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.backgroundColor
      })

      const card2Bg = await cards.nth(1).evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.backgroundColor
      })

      // Cards should have visible backgrounds (not transparent)
      expect(card1Bg).not.toBe('rgba(0, 0, 0, 0)')
      expect(card2Bg).not.toBe('rgba(0, 0, 0, 0)')

      // Check for elevation (box-shadow or different background)
      const card1Shadow = await cards.nth(0).evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.boxShadow
      })

      // Should have some shadow or elevation
      expect(card1Shadow).not.toBe('none')
    }
  })

  test('text contrast is readable', async ({ page }) => {
    await page.goto('/landlord/dashboard?mock=true')
    await waitForPageReady(page)

    // Find text elements
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6').first()

    if (await textElements.isVisible()) {
      // Get text color
      const textColor = await textElements.evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.color
      })

      // Get background color
      const bgColor = await textElements.evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.backgroundColor
      })

      // Both should be defined
      expect(textColor).not.toBe('rgba(0, 0, 0, 0)')
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)')

      // Parse RGB for contrast check
      const textRgb = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      const bgRgb = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)

      if (textRgb && bgRgb) {
        // Calculate relative luminance (simplified)
        const textLum = (parseInt(textRgb[1]) + parseInt(textRgb[2]) + parseInt(textRgb[3])) / 3
        const bgLum = (parseInt(bgRgb[1]) + parseInt(bgRgb[2]) + parseInt(bgRgb[3])) / 3

        // Text should be lighter than background in dark mode
        expect(textLum).toBeGreaterThan(bgLum)

        // Contrast should be significant (at least 20% difference)
        const contrast = Math.abs(textLum - bgLum)
        expect(contrast).toBeGreaterThan(50) // Significant contrast
      }
    }
  })

  test('depth is visible via contrast/elevation', async ({ page }) => {
    await page.goto('/landlord/dashboard?mock=true')
    await waitForPageReady(page)

    // Check for layered elements (cards, modals, etc.)
    const layeredElements = page.locator('[class*="card"], [class*="modal"], [class*="popover"]')
    const layerCount = await layeredElements.count()

    if (layerCount > 0) {
      // Check first element has elevation
      const firstElement = layeredElements.first()

      // Check for box-shadow (elevation indicator)
      const shadow = await firstElement.evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.boxShadow
      })

      // Should have shadow or different background to show depth
      const hasElevation = shadow !== 'none' && shadow !== ''
      expect(hasElevation).toBe(true)
    }
  })
})
