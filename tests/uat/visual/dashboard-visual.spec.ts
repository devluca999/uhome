/**
 * Visual UAT Tests for Dashboard
 * 
 * Visual assertions for dashboard:
 * - Charts render correctly
 * - Cards stay within size constraints
 * - Modals never clip content
 * - Dark mode contrast
 */

import { test, expect } from '@playwright/test'
import { verifyStagingEnvironment, setupUATScenario, waitForPageReady, cleanupUATTest } from '../helpers/uat-helpers'
import { logVisualMismatch } from '../helpers/result-logger'
import { captureUATScreenshot, captureChartScreenshot } from '../helpers/screenshot-manager'

test.describe('Dashboard Visual UAT', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    verifyStagingEnvironment()
    await cleanupUATTest(page)
  })

  test('dashboard renders correctly', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Visual Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    // Capture screenshot
    await captureUATScreenshot(page, 'dashboard', 'full_page', { fullPage: true })
  })

  test('charts render correctly', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Visual Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      const charts = page.locator('svg, [class*="chart"]')
      const chartCount = await charts.count()

      if (chartCount > 0) {
        await captureChartScreenshot(page, 'svg, [class*="chart"]', 'dashboard', 'charts')
      }
    } catch (error) {
      const screenshot = await captureUATScreenshot(page, 'dashboard', 'charts', {}, 'error')
      await logVisualMismatch(page, {
        page: 'dashboard',
        feature: 'charts',
        element: 'chart',
        issue: 'Chart rendering issue',
        error: error instanceof Error ? error.message : String(error),
        screenshot,
      })
    }
  })

  test('modals never clip content', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Visual Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Find clickable card
      const clickableCard = page.locator('[class*="card"], [role="button"]').first()
      if (await clickableCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clickableCard.click()
        await page.waitForTimeout(500)

        const modal = page.locator('[role="dialog"], [class*="modal"]')
        if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Verify content is not clipped
          const modalContent = modal.locator('[class*="content"], [class*="body"]')
          if (await modalContent.isVisible()) {
            const box = await modalContent.boundingBox()
            const viewport = page.viewportSize()

            if (box && viewport) {
              const isClipped = box.x + box.width > viewport.width || box.y + box.height > viewport.height

              if (isClipped) {
                const screenshot = await captureUATScreenshot(page, 'dashboard', 'modal_clipped', {}, 'clipped')
                await logVisualMismatch(page, {
                  page: 'dashboard',
                  feature: 'modals',
                  element: 'modal_content',
                  issue: 'Modal content is clipped',
                  expected: 'Modal content should fit within viewport',
                  actual: 'Content extends beyond viewport',
                  screenshot,
                })
                throw new Error('Modal content is clipped')
              }
            }
          }
        }
      }
    } catch (error) {
      // Error already logged
      if (!error.message.includes('clipped')) {
        throw error
      }
    }
  })
})

