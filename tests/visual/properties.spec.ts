/**
 * Properties Visual Tests
 * 
 * Validates property pages render correctly with:
 * - Property lists with data
 * - Property detail pages
 * - No empty states
 * - Proper layout
 */

import { test, expect } from '@playwright/test'
import {
  setupVisualTest,
  waitForPageReady,
  captureFullPageScreenshot,
} from './helpers/visual-helpers'

test.describe('Properties Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page)
  })

  test('properties list renders with data', async ({ page }) => {
    await page.goto('/landlord/properties?mock=true')
    await waitForPageReady(page)

    // Verify properties are visible
    const propertyNames = page.locator('text=/123 Oak Street|456 Pine Avenue|789 Elm Drive/')
    await expect(propertyNames.first()).toBeVisible()

    // Verify no empty state
    await expect(page.locator('text=/No properties|Empty/i')).not.toBeVisible()

    // Verify layout is correct
    const propertyCards = page.locator('[class*="card"], [class*="property"]')
    const cardCount = await propertyCards.count()
    expect(cardCount).toBeGreaterThan(0)
  })

  test('property detail page renders correctly', async ({ page }) => {
    // Navigate to property detail (using mock data)
    await page.goto('/landlord/properties?mock=true')
    await waitForPageReady(page)

    // Click first property
    const firstProperty = page.locator('[class*="property"], [class*="card"]').first()
    if (await firstProperty.isVisible()) {
      await firstProperty.click()
      await waitForPageReady(page)

      // Verify property details are visible
      await expect(page.locator('text=/Address|Rent|Tenants/i')).toBeVisible()

      // Verify tabs are visible
      const tabs = page.locator('[role="tab"]')
      const tabCount = await tabs.count()
      expect(tabCount).toBeGreaterThan(0)
    }
  })

  test('property cards stay within size constraints', async ({ page }) => {
    await page.goto('/landlord/properties?mock=true')
    await waitForPageReady(page)

    // Check card dimensions
    const cards = page.locator('[class*="card"], [class*="property"]')
    const firstCard = cards.first()
    
    if (await firstCard.isVisible()) {
      const box = await firstCard.boundingBox()
      expect(box).toBeTruthy()
      
      // Cards should not exceed viewport
      const viewport = page.viewportSize()
      if (box && viewport) {
        expect(box.width).toBeLessThanOrEqual(viewport.width)
      }
    }
  })
})

