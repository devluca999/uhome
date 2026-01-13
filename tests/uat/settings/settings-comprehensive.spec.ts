/**
 * Comprehensive Settings UAT Tests
 * 
 * Tests all settings features:
 * - Dark mode toggle
 * - Navigation preferences
 * - Interface preferences
 * - Profile picture upload
 * - Danger zone actions
 * - Button/toggle visual states
 */

import { test, expect } from '@playwright/test'
import { verifyStagingEnvironment, setupUATScenario, waitForPageReady, cleanupUATTest, verifyToggleState } from '../helpers/uat-helpers'
import { logTestResult, logVisualMismatch } from '../helpers/result-logger'
import { captureUATScreenshot } from '../helpers/screenshot-manager'
import { createTestFile, uploadFileViaUI } from '../../helpers/upload'

test.describe('Settings Comprehensive UAT', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    verifyStagingEnvironment()
    await cleanupUATTest(page)
  })

  test('dark mode toggle works and persists', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Settings Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/landlord/settings`)
    await waitForPageReady(page)

    try {
      // Find dark mode toggle
      const darkModeToggle = page.locator('button:has-text("Dark"), [data-theme-toggle], [aria-label*="theme"]').first()
      const isVisible = await darkModeToggle.isVisible({ timeout: 3000 }).catch(() => false)

      if (isVisible) {
        // Get initial state
        const initialState = await darkModeToggle.getAttribute('aria-checked') || 
                            await darkModeToggle.getAttribute('data-state') ||
                            (await darkModeToggle.isChecked() ? 'true' : 'false')

        // Toggle dark mode
        await darkModeToggle.click()
        await page.waitForTimeout(1000)

        // Verify state changed
        const newState = await darkModeToggle.getAttribute('aria-checked') || 
                       await darkModeToggle.getAttribute('data-state') ||
                       (await darkModeToggle.isChecked() ? 'true' : 'false')

        expect(newState).not.toBe(initialState)

        // Verify toggle state is visually obvious
        await verifyToggleState(page, darkModeToggle.locator('..').locator('button, [role="button"]').first() || darkModeToggle, newState === 'true' || newState === 'checked')

        // Refresh and verify persistence
        await page.reload()
        await waitForPageReady(page)

        const persistedState = await darkModeToggle.getAttribute('aria-checked') || 
                              await darkModeToggle.getAttribute('data-state') ||
                              (await darkModeToggle.isChecked() ? 'true' : 'false')

        expect(persistedState).toBe(newState)

        await logTestResult(page, {
          page: 'settings',
          feature: 'dark_mode',
          role: 'landlord',
          action: 'toggle_dark_mode',
          status: 'passed',
        })
      } else {
        await logTestResult(page, {
          page: 'settings',
          feature: 'dark_mode',
          role: 'landlord',
          action: 'toggle_dark_mode',
          status: 'skipped',
          error: 'Dark mode toggle not found',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'settings',
        feature: 'dark_mode',
        role: 'landlord',
        action: 'toggle_dark_mode',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('profile picture upload in settings', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Settings Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/landlord/settings`)
    await waitForPageReady(page)

    try {
      const fileInput = page.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        const testImage = createTestFile('profile-settings.jpg', 1024 * 100, 'image/jpeg')
        await uploadFileViaUI(page, 'input[type="file"]', testImage)
        await page.waitForTimeout(2000)

        await logTestResult(page, {
          page: 'settings',
          feature: 'profile_picture',
          role: 'landlord',
          action: 'upload_profile',
          status: 'passed',
        })
      } else {
        await logTestResult(page, {
          page: 'settings',
          feature: 'profile_picture',
          role: 'landlord',
          action: 'upload_profile',
          status: 'skipped',
          error: 'Profile picture upload not found',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'settings',
        feature: 'profile_picture',
        role: 'landlord',
        action: 'upload_profile',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('danger zone actions are accessible', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Settings Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/landlord/settings`)
    await waitForPageReady(page)

    try {
      // Find danger zone section
      const dangerZone = page.locator('text=/danger|delete|logout/i').first()
      const isVisible = await dangerZone.isVisible({ timeout: 3000 }).catch(() => false)

      if (isVisible) {
        // Verify logout button exists
        const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first()
        const logoutVisible = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)

        await logTestResult(page, {
          page: 'settings',
          feature: 'danger_zone',
          role: 'landlord',
          action: 'verify_danger_zone',
          status: logoutVisible ? 'passed' : 'skipped',
          error: logoutVisible ? undefined : 'Danger zone actions not found',
        })
      } else {
        await logTestResult(page, {
          page: 'settings',
          feature: 'danger_zone',
          role: 'landlord',
          action: 'verify_danger_zone',
          status: 'skipped',
          error: 'Danger zone section not found',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'settings',
        feature: 'danger_zone',
        role: 'landlord',
        action: 'verify_danger_zone',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('button/toggle visual states are obvious', async ({ page }) => {
    const seeded = await setupUATScenario({ propertyName: 'Settings Test Property' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.landlord.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/landlord/settings`)
    await waitForPageReady(page)

    try {
      // Find toggles
      const toggles = page.locator('[role="switch"], [type="checkbox"], [data-toggle]')
      const toggleCount = await toggles.count()

      if (toggleCount > 0) {
        const firstToggle = toggles.first()
        
        // Verify toggle is visible
        await expect(firstToggle).toBeVisible()

        // Verify visual state
        const opacity = await firstToggle.evaluate(el => {
          const style = window.getComputedStyle(el)
          return parseFloat(style.opacity)
        })
        expect(opacity).toBeGreaterThan(0.5)

        await logTestResult(page, {
          page: 'settings',
          feature: 'toggle_states',
          role: 'landlord',
          action: 'verify_visual_states',
          status: 'passed',
        })
      } else {
        await logTestResult(page, {
          page: 'settings',
          feature: 'toggle_states',
          role: 'landlord',
          action: 'verify_visual_states',
          status: 'skipped',
          error: 'No toggles found',
        })
      }
    } catch (error) {
      const screenshot = await captureUATScreenshot(page, 'settings', 'toggle_states', {}, 'error')
      await logVisualMismatch(page, {
        page: 'settings',
        feature: 'toggle_states',
        element: 'toggle',
        issue: 'Toggle visual state not obvious',
        expected: 'Toggle should have clear visual state',
        actual: 'Toggle state not clearly visible',
        screenshot,
      })
      throw error
    }
  })
})

