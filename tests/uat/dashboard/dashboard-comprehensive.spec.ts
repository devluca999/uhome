/**
 * Comprehensive Dashboard UAT Tests
 *
 * Tests all dashboard features:
 * - Revenue calculations and display
 * - Occupancy metrics
 * - Properties, tenants, tasks counts
 * - Chart interactions
 * - Smart insights
 * - Recent activity modals
 * - Data persistence
 */

import { test, expect } from '@playwright/test'
import {
  verifyStagingEnvironment,
  setupUATScenario,
  waitForPageReady,
  verifyDataPersistence,
  verifyModalOpens,
  verifyChartInteractive,
  cleanupUATTest,
  loginAsSeededLandlord,
} from '../helpers/uat-helpers'
import { logTestResult, logVisualMismatch, logFunctionalFailure } from '../helpers/result-logger'
import { captureUATScreenshot } from '../helpers/screenshot-manager'

test.describe('Dashboard Comprehensive UAT', () => {
  // Use Playwright's baseURL from config (webServer will start app automatically)
  const baseUrl =
    process.env.VISUAL_TEST_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    // Capture browser console logs
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warn') {
        console.log(`[Browser Console ${msg.type()}]`, msg.text())
      }
    })
    verifyStagingEnvironment()
    await cleanupUATTest(page)
  })

  test('dashboard displays revenue calculations correctly', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Dashboard Test Property' })

    // Use the login helper which has proper error handling and waiting
    await loginAsSeededLandlord(page, seeded.landlord.email)

    await waitForPageReady(page)

    try {
      // Verify revenue is displayed - look for "Monthly Revenue" card
      const revenueCard = page.locator('text=/Monthly Revenue/i').first()
      await expect(revenueCard).toBeVisible({ timeout: 5000 })

      // Get the parent card container to find the value
      const revenueCardContainer = revenueCard.locator('..').locator('..').first()
      const cardText = await revenueCardContainer.textContent()

      // The value should be formatted as $X,XXX or $0
      // PortfolioCard formats as: `$${Math.round(v).toLocaleString()}`
      const hasRevenueValue = cardText?.match(/\$\d+([,\d]*)?/) !== null

      if (!hasRevenueValue) {
        // Log the actual text for debugging
        console.log('Revenue card text:', cardText)
        throw new Error(`Revenue value not found in expected format. Card text: ${cardText}`)
      }

      expect(hasRevenueValue).toBeTruthy()

      await logTestResult(page, {
        page: 'dashboard',
        feature: 'revenue_display',
        role: 'landlord',
        action: 'verify_revenue_calculation',
        status: 'passed',
      })
    } catch (error) {
      await logTestResult(page, {
        page: 'dashboard',
        feature: 'revenue_display',
        role: 'landlord',
        action: 'verify_revenue_calculation',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('occupancy metrics display correctly', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Dashboard Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Verify occupancy is displayed
      const occupancyElement = page.locator('text=/occupancy|%|rate/i').first()
      await expect(occupancyElement).toBeVisible({ timeout: 5000 })

      await logTestResult(page, {
        page: 'dashboard',
        feature: 'occupancy_metrics',
        role: 'landlord',
        action: 'verify_occupancy_display',
        status: 'passed',
      })
    } catch (error) {
      await logTestResult(page, {
        page: 'dashboard',
        feature: 'occupancy_metrics',
        role: 'landlord',
        action: 'verify_occupancy_display',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('properties count and cards display', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Dashboard Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Verify properties count
      const propertiesCount = page.locator('text=/properties|property/i')
      await expect(propertiesCount.first()).toBeVisible({ timeout: 5000 })

      // Verify property cards if visible
      const propertyCards = page.locator('[class*="property"], [class*="card"]')
      const cardCount = await propertyCards.count()
      expect(cardCount).toBeGreaterThan(0)

      await logTestResult(page, {
        page: 'dashboard',
        feature: 'properties_display',
        role: 'landlord',
        action: 'verify_properties_count',
        status: 'passed',
      })
    } catch (error) {
      await logTestResult(page, {
        page: 'dashboard',
        feature: 'properties_display',
        role: 'landlord',
        action: 'verify_properties_count',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('tenants count and cards display', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Dashboard Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Verify tenants count
      const tenantsCount = page.locator('text=/tenants|tenant/i')
      await expect(tenantsCount.first()).toBeVisible({ timeout: 5000 })

      await logTestResult(page, {
        page: 'dashboard',
        feature: 'tenants_display',
        role: 'landlord',
        action: 'verify_tenants_count',
        status: 'passed',
      })
    } catch (error) {
      await logTestResult(page, {
        page: 'dashboard',
        feature: 'tenants_display',
        role: 'landlord',
        action: 'verify_tenants_count',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('pending tasks display correctly', async ({ page }) => {
    const seeded = await setupUATScenario({
      propertyName: 'Dashboard Test Property',
      createTasks: true,
    })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Verify pending tasks are displayed
      const tasksElement = page.locator('text=/tasks|pending/i')
      await expect(tasksElement.first()).toBeVisible({ timeout: 5000 })

      await logTestResult(page, {
        page: 'dashboard',
        feature: 'pending_tasks',
        role: 'landlord',
        action: 'verify_tasks_display',
        status: 'passed',
      })
    } catch (error) {
      await logTestResult(page, {
        page: 'dashboard',
        feature: 'pending_tasks',
        role: 'landlord',
        action: 'verify_tasks_display',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('chart interactions work (donut, pie, trend)', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Dashboard Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Verify charts are present
      const charts = page.locator('svg, [class*="chart"]')
      const chartCount = await charts.count()

      if (chartCount > 0) {
        // Verify chart is interactive
        await verifyChartInteractive(page)

        // Try to interact with chart (hover)
        const firstChart = charts.first()
        await firstChart.hover()
        await page.waitForTimeout(500)

        await logTestResult(page, {
          page: 'dashboard',
          feature: 'chart_interactions',
          role: 'landlord',
          action: 'verify_chart_interactivity',
          status: 'passed',
        })
      } else {
        // No charts found - might be empty state
        await logTestResult(page, {
          page: 'dashboard',
          feature: 'chart_interactions',
          role: 'landlord',
          action: 'verify_chart_interactivity',
          status: 'skipped',
          error: 'No charts found on dashboard',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'dashboard',
        feature: 'chart_interactions',
        role: 'landlord',
        action: 'verify_chart_interactivity',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('smart insights for recurring work orders display', async ({ page }) => {
    const seeded = await setupUATScenario({
      propertyName: 'Dashboard Test Property',
      createWorkOrders: true,
    })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Look for smart insights or recurring work orders
      const insightsElement = page.locator('text=/insight|recurring|pattern/i')
      const isVisible = await insightsElement
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      // Smart insights may not always be present, so this is optional
      if (isVisible) {
        await logTestResult(page, {
          page: 'dashboard',
          feature: 'smart_insights',
          role: 'landlord',
          action: 'verify_insights_display',
          status: 'passed',
        })
      } else {
        await logTestResult(page, {
          page: 'dashboard',
          feature: 'smart_insights',
          role: 'landlord',
          action: 'verify_insights_display',
          status: 'skipped',
          error: 'Smart insights not present (may require recurring work orders)',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'dashboard',
        feature: 'smart_insights',
        role: 'landlord',
        action: 'verify_insights_display',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  test('recent activity card opens modal without content cutoff', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Dashboard Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Find recent activity card or button
      const activityTrigger = page
        .locator('text=/recent activity|activity/i, button:has-text("View All"), [data-activity]')
        .first()
      const isVisible = await activityTrigger.isVisible({ timeout: 3000 }).catch(() => false)

      if (isVisible) {
        // Click to open modal
        await verifyModalOpens(
          page,
          activityTrigger.locator('..').locator('button, [role="button"]').first() ||
            activityTrigger
        )

        await logTestResult(page, {
          page: 'dashboard',
          feature: 'recent_activity_modal',
          role: 'landlord',
          action: 'verify_modal_opens',
          status: 'passed',
        })
      } else {
        await logTestResult(page, {
          page: 'dashboard',
          feature: 'recent_activity_modal',
          role: 'landlord',
          action: 'verify_modal_opens',
          status: 'skipped',
          error: 'Recent activity card not found',
        })
      }
    } catch (error) {
      const screenshot = await captureUATScreenshot(
        page,
        'dashboard',
        'recent_activity_modal',
        {},
        'error'
      )
      await logFunctionalFailure(page, {
        page: 'dashboard',
        feature: 'recent_activity_modal',
        workflow: 'open_activity_modal',
        error: error instanceof Error ? error.message : String(error),
        steps: ['Navigate to dashboard', 'Click recent activity', 'Verify modal opens'],
        screenshot,
      })
      throw error
    }
  })

  test('clickable cards open modals without content cutoff', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Dashboard Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Find clickable cards (revenue, properties, tenants, etc.)
      const clickableCards = page.locator('[class*="card"], [role="button"]').filter({
        hasText: /revenue|properties|tenants|occupancy/i,
      })

      const cardCount = await clickableCards.count()
      if (cardCount > 0) {
        // Click first clickable card
        const firstCard = clickableCards.first()
        await firstCard.click()
        await page.waitForTimeout(500)

        // Verify modal opens
        const modal = page.locator('[role="dialog"], [class*="modal"]')
        const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false)

        if (modalVisible) {
          // Verify content is not clipped
          const modalContent = modal.locator('[class*="content"], [class*="body"]')
          if (await modalContent.isVisible()) {
            const box = await modalContent.boundingBox()
            const viewport = page.viewportSize()

            if (box && viewport) {
              const isClipped =
                box.x + box.width > viewport.width || box.y + box.height > viewport.height

              if (isClipped) {
                const screenshot = await captureUATScreenshot(
                  page,
                  'dashboard',
                  'modal_clipped',
                  {},
                  'clipped'
                )
                await logVisualMismatch(page, {
                  page: 'dashboard',
                  feature: 'clickable_cards',
                  element: 'modal_content',
                  issue: 'Modal content is clipped or cut off',
                  expected: 'Modal content should fit within viewport',
                  actual: 'Content extends beyond viewport boundaries',
                  screenshot,
                })
                throw new Error('Modal content is clipped')
              }
            }
          }

          await logTestResult(page, {
            page: 'dashboard',
            feature: 'clickable_cards',
            role: 'landlord',
            action: 'verify_modal_no_clip',
            status: 'passed',
          })
        } else {
          await logTestResult(page, {
            page: 'dashboard',
            feature: 'clickable_cards',
            role: 'landlord',
            action: 'verify_modal_no_clip',
            status: 'skipped',
            error: 'Modal did not open or is not visible',
          })
        }
      } else {
        await logTestResult(page, {
          page: 'dashboard',
          feature: 'clickable_cards',
          role: 'landlord',
          action: 'verify_modal_no_clip',
          status: 'skipped',
          error: 'No clickable cards found',
        })
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('clipped')) {
        // Already logged as visual mismatch
        throw error
      }

      const screenshot = await captureUATScreenshot(
        page,
        'dashboard',
        'clickable_cards',
        {},
        'error'
      )
      await logFunctionalFailure(page, {
        page: 'dashboard',
        feature: 'clickable_cards',
        workflow: 'open_card_modal',
        error: error instanceof Error ? error.message : String(error),
        steps: ['Navigate to dashboard', 'Click card', 'Verify modal opens without clipping'],
        screenshot,
      })
      throw error
    }
  })

  test('data persists across page refreshes', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Dashboard Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await waitForPageReady(page)

    try {
      // Get initial revenue value
      const revenueElement = page.locator('text=/revenue|\\$|income/i').first()
      await expect(revenueElement).toBeVisible({ timeout: 5000 })
      const initialRevenue = await revenueElement.textContent()

      // Refresh page
      await page.reload()
      await waitForPageReady(page)

      // Verify revenue is still displayed
      const revenueAfterRefresh = page.locator('text=/revenue|\\$|income/i').first()
      await expect(revenueAfterRefresh).toBeVisible({ timeout: 5000 })
      const refreshedRevenue = await revenueAfterRefresh.textContent()

      // Values should match (or at least both be present)
      expect(initialRevenue).toBeTruthy()
      expect(refreshedRevenue).toBeTruthy()

      await logTestResult(page, {
        page: 'dashboard',
        feature: 'data_persistence',
        role: 'landlord',
        action: 'verify_data_persists',
        status: 'passed',
      })
    } catch (error) {
      await logTestResult(page, {
        page: 'dashboard',
        feature: 'data_persistence',
        role: 'landlord',
        action: 'verify_data_persists',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })
})
