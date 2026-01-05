import { test, expect } from '@playwright/test'
import {
  createTestTenant,
  generateTestEmail,
  loginAsTenant,
  getSupabaseClient,
} from '../helpers/auth-helpers'
import { deleteUserAndData } from '../helpers/db-helpers'

test.describe('Tenant Signup and Login', () => {
  let testEmail: string
  let password: string
  let userId: string | null = null

  test.beforeEach(() => {
    testEmail = generateTestEmail('tenant')
    password = 'testpassword123'
  })

  test.afterEach(async () => {
    if (userId) {
      await deleteUserAndData(userId)
      userId = null
    }
  })

  test('should sign up a new tenant and redirect to dashboard', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    // Select tenant role
    await page.getByRole('button', { name: 'Tenant' }).click()

    // Fill in email and password
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to tenant dashboard
    await page.waitForURL('/tenant/dashboard', { timeout: 10000 })

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
    expect(userRecord?.role).toBe('tenant')
    userId = userRecord?.id || null
  })

  test('should login with valid tenant credentials', async ({ page }) => {
    // Create test user first
    const { userId: createdUserId, error } = await createTestTenant(testEmail, password)
    expect(error).toBeNull()
    userId = createdUserId

    await loginAsTenant(page, testEmail, password)

    // Verify we're on the tenant dashboard
    await expect(page.locator('h1')).toContainText(/dashboard/i)
    await expect(page).toHaveURL('/tenant/dashboard')
  })
})
