import { test, expect } from '@playwright/test'
import { loginAsLandlord } from '../helpers/auth-helpers'
import { deleteUserAndData } from '../helpers/db-helpers'
import { createSharedLandlordForDescribe } from '../fixtures/user-pool'

test.describe('Landlord Login', () => {
  let sharedLandlord: { email: string; password: string; userId: string }

  test.beforeAll(async () => {
    sharedLandlord = await createSharedLandlordForDescribe()
  })

  test.afterAll(async () => {
    if (sharedLandlord?.userId) {
      await deleteUserAndData(sharedLandlord.userId)
    }
  })

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await loginAsLandlord(page, sharedLandlord.email, sharedLandlord.password)

    // Verify we're on the dashboard
    await expect(page.locator('h1')).toContainText(/dashboard/i)

    // Verify session exists by checking we're authenticated (can access protected route)
    await expect(page).toHaveURL('/landlord/dashboard')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Fill in wrong password
    await page.fill('input[type="email"]', sharedLandlord.email)
    await page.fill('input[type="password"]', 'wrongpassword')

    // Submit form
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 })

    // Should not redirect
    await expect(page).toHaveURL(/\/login/)
  })
})
