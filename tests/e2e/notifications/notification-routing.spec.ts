/**
 * Smoke: notification dropdown "View all" routes to role-scoped notifications page.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'

test.describe('Notification routing', () => {
  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('landlord: bell → view all → /landlord/notifications', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Demo Landlord' }).click()
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 15_000 })

    await page.getByRole('button', { name: /^Notifications$|unread notifications/i }).click()
    await expect(page.getByRole('link', { name: /view all notifications/i })).toBeVisible({
      timeout: 5000,
    })
    await page.getByRole('link', { name: /view all notifications/i }).click()
    await page.waitForURL(/\/landlord\/notifications/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  })

  test('tenant: bell → view all → /tenant/notifications', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Demo Tenant' }).click()
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 15_000 })

    await page.getByRole('button', { name: /^Notifications$|unread notifications/i }).click()
    await expect(page.getByRole('link', { name: /view all notifications/i })).toBeVisible({
      timeout: 5000,
    })
    await page.getByRole('link', { name: /view all notifications/i }).click()
    await page.waitForURL(/\/tenant\/notifications/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  })
})
