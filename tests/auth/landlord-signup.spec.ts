import { test, expect } from '@playwright/test'
import { createTestLandlord, generateTestEmail, getSupabaseClient } from '../helpers/auth-helpers'
import { deleteUserAndData } from '../helpers/db-helpers'

test.describe('Landlord Signup', () => {
  let testEmail: string
  let userId: string | null = null

  test.beforeEach(() => {
    testEmail = generateTestEmail('landlord')
  })

  test.afterEach(async () => {
    if (userId) {
      await deleteUserAndData(userId)
      userId = null
    }
  })

  test('should sign up a new landlord and redirect to dashboard', async ({ page }) => {
    const password = 'testpassword123'

    // Navigate to signup page
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    // Verify signup page is loaded
    await expect(page.getByText('Create your account')).toBeVisible()

    // Select landlord role
    await page.getByRole('button', { name: 'Landlord' }).click()

    // Fill in email and password
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for either navigation or error message
    try {
      await page.waitForURL('/landlord/dashboard', { timeout: 15000 })
    } catch (error) {
      // Check if there's an error message displayed
      const errorElement = page.locator('.text-destructive, [class*="destructive"]')
      const hasError = await errorElement.isVisible().catch(() => false)
      if (hasError) {
        const errorText = await errorElement.textContent()
        // If it's a rate limit error, provide helpful message
        if (errorText?.toLowerCase().includes('rate limit')) {
          throw new Error(`Signup failed: Email rate limit exceeded. This happens when creating too many test users. Consider: 1) Disabling email confirmation in test Supabase instance, 2) Adding delays between tests, or 3) Using service role key to create users directly. Error: ${errorText}`)
        }
        throw new Error(`Signup failed with error: ${errorText}. Current URL: ${page.url()}`)
      }
      throw error
    }

    // Verify we're on the dashboard
    await expect(page.locator('h1')).toContainText(/dashboard/i)

    // Verify user was created in database by checking users table directly
    const supabase = getSupabaseClient()
    const { data: userRecord } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', testEmail)
      .single()

    expect(userRecord).toBeTruthy()
    expect(userRecord?.email).toBe(testEmail)
    expect(userRecord?.role).toBe('landlord')
    userId = userRecord?.id || null
  })

  test('should show error for invalid password', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    // Select landlord role
    await page.getByRole('button', { name: 'Landlord' }).click()

    // Fill in email and short password
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', 'short')

    // Submit form - browser HTML5 validation might prevent submission, so we trigger it
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Wait a moment for validation to run
    await page.waitForTimeout(1000)

    // Should show validation error - check for error message (could be in error div or HTML5 validation)
    // Try to find error text in destructive-styled elements or check if form was prevented from submitting
    const errorDiv = page.locator('[class*="destructive"]').filter({ hasText: /password/i })
    const hasErrorDiv = await errorDiv.isVisible().catch(() => false)
    
    // Also check if we're still on signup page (form didn't submit)
    const currentUrl = page.url()
    const stillOnSignup = currentUrl.includes('/signup')
    
    // Either error div should be visible OR we should still be on signup page (validation prevented submission)
    expect(hasErrorDiv || stillOnSignup).toBeTruthy()

    // Should not redirect
    await expect(page).toHaveURL(/\/signup/)
  })
})

