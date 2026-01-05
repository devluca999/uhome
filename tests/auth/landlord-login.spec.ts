import { test, expect } from '@playwright/test'
import {
  createTestLandlord,
  generateTestEmail,
  loginAsLandlord,
  getSupabaseClient,
} from '../helpers/auth-helpers'
import { deleteUserAndData } from '../helpers/db-helpers'

test.describe('Landlord Login', () => {
  let testEmail: string
  let password: string
  let userId: string | null = null

  test.beforeEach(async () => {
    testEmail = generateTestEmail('landlord')
    password = 'testpassword123'

    // Create test user
    const { userId: createdUserId, error } = await createTestLandlord(testEmail, password)

    // Log error details for debugging
    if (error) {
      console.error('Failed to create test landlord:', error)
      throw new Error(`Failed to create test landlord: ${JSON.stringify(error)}`)
    }

    expect(error).toBeNull()
    expect(createdUserId).toBeTruthy()
    userId = createdUserId

    // Verify user was actually created by checking database
    const supabase = getSupabaseClient()
    const { data: userRecord, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single()

    if (fetchError || !userRecord) {
      throw new Error(
        `User was not created in database. Error: ${fetchError?.message || 'User not found'}`
      )
    }

    // Small delay to ensure auth state is ready
    await new Promise(resolve => setTimeout(resolve, 500))
  })

  test.afterEach(async () => {
    if (userId) {
      await deleteUserAndData(userId)
      userId = null
    }
  })

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await loginAsLandlord(page, testEmail, password)

    // Verify we're on the dashboard
    await expect(page.locator('h1')).toContainText(/dashboard/i)

    // Verify session exists by checking we're authenticated (can access protected route)
    await expect(page).toHaveURL('/landlord/dashboard')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Fill in wrong password
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', 'wrongpassword')

    // Submit form
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 })

    // Should not redirect
    await expect(page).toHaveURL(/\/login/)
  })
})
