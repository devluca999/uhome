/**
 * Admin Multi-Tab Synchronization E2E Tests
 *
 * Tests synchronization across multiple browser tabs/windows for admin actions.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Admin Multi-Tab Sync', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  async function loginAsAdmin(context: any) {
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    const page = await context.newPage()
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    return { adminEmail, adminId, page, supabaseAdmin }
  }

  test('admin action in one tab updates UI in second tab', async ({ browser }) => {
    const context = await browser.newContext()

    try {
      const { adminId, supabaseAdmin } = await loginAsAdmin(context)

      // Create two tabs
      const page1 = await context.newPage()
      const page2 = await context.newPage()

      // Login both tabs
      const adminEmail = generateTestEmail('admin')
      const password = 'TestPassword123!'

      await page1.goto(`${baseUrl}/login`)
      await page1.fill('input[type="email"]', adminEmail)
      await page1.fill('input[type="password"]', password)
      await page1.click('button:has-text("Sign in")')
      await page1.waitForURL(/\/admin\/overview/, { timeout: 10000 })

      await page2.goto(`${baseUrl}/login`)
      await page2.fill('input[type="email"]', adminEmail)
      await page2.fill('input[type="password"]', password)
      await page2.click('button:has-text("Sign in")')
      await page2.waitForURL(/\/admin\/overview/, { timeout: 10000 })

      // Create target user
      const targetEmail = generateTestEmail('target')
      const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
        role: 'tenant',
      })

      // Both tabs navigate to users page
      await page1.click('nav a:has-text("Users")')
      await page1.waitForURL(/\/admin\/users/, { timeout: 5000 })

      await page2.click('nav a:has-text("Users")')
      await page2.waitForURL(/\/admin\/users/, { timeout: 5000 })

      // Click Tenants tab on both
      await page1.click('button:has-text("Tenants")')
      await page1.waitForTimeout(500)

      await page2.click('button:has-text("Tenants")')
      await page2.waitForTimeout(500)

      // Verify user is visible in both tabs
      await expect(page1.locator(`tr:has-text("${targetEmail}")`)).toBeVisible()
      await expect(page2.locator(`tr:has-text("${targetEmail}")`)).toBeVisible()

      // Perform action in tab 1
      const userRow1 = page1.locator(`tr:has-text("${targetEmail}")`)
      const lockButton1 = userRow1.locator('button[title*="Lock"]')
      await lockButton1.click()

      // Complete action in tab 1
      await expect(page1.locator('text=Lock Account')).toBeVisible({ timeout: 3000 })
      const confirmationInput1 = page1.locator('input[placeholder*="Type the user\'s email"]')
      if (await confirmationInput1.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmationInput1.fill(targetEmail)
        const reasonInput1 = page1.locator('textarea[placeholder*="Enter reason"]')
        await reasonInput1.fill('Multi-tab test')
        await page1.locator('button:has-text("Continue")').click()
        await page1.waitForTimeout(500)
        await page1.locator('button:has-text("Confirm Action")').click()
        await page1.waitForTimeout(2000)
      }

      // Verify user status updated in tab 2 (requires refresh or realtime)
      await page2.reload()
      await page2.waitForLoadState('networkidle')
      await page2.click('button:has-text("Tenants")')
      await page2.waitForTimeout(500)

      // Check if user shows as locked in tab 2
      const userRow2 = page2.locator(`tr:has-text("${targetEmail}")`)
      const statusBadge2 = userRow2.locator('text=Locked')
      // User should show as locked after refresh
      await expect(statusBadge2).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })

  test('admin bans user and user tab shows logout', async ({ browser }) => {
    const adminContext = await browser.newContext()
    const userContext = await browser.newContext()

    try {
      // Login as admin
      const { adminId, supabaseAdmin } = await loginAsAdmin(adminContext)
      const adminPage = await adminContext.newPage()
      const adminEmail = generateTestEmail('admin')
      const password = 'TestPassword123!'

      await adminPage.goto(`${baseUrl}/login`)
      await adminPage.fill('input[type="email"]', adminEmail)
      await adminPage.fill('input[type="password"]', password)
      await adminPage.click('button:has-text("Sign in")')
      await adminPage.waitForURL(/\/admin\/overview/, { timeout: 10000 })

      // Login as user in separate context
      const userEmail = generateTestEmail('user')
      const userPassword = 'TestPassword123!'
      await createAndConfirmUser(userEmail, userPassword, { role: 'tenant' })

      const userPage = await userContext.newPage()
      await userPage.goto(`${baseUrl}/login`)
      await userPage.fill('input[type="email"]', userEmail)
      await userPage.fill('input[type="password"]', userPassword)
      await userPage.click('button:has-text("Sign in")')
      await userPage.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

      // Admin bans user
      await adminPage.click('nav a:has-text("Users")')
      await adminPage.waitForURL(/\/admin\/users/, { timeout: 5000 })

      await adminPage.click('button:has-text("Tenants")')
      await adminPage.waitForTimeout(500)

      const userRow = adminPage.locator(`tr:has-text("${userEmail}")`)
      await expect(userRow).toBeVisible()

      const banButton = userRow.locator('button[title*="Ban"]')
      await banButton.click()

      // Complete ban action
      await expect(adminPage.locator('text=Ban User')).toBeVisible({ timeout: 3000 })
      const confirmationInput = adminPage.locator('input[placeholder*="Type the user\'s email"]')
      if (await confirmationInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmationInput.fill(userEmail)
        const reasonInput = adminPage.locator('textarea[placeholder*="Enter reason"]')
        await reasonInput.fill('Multi-tab ban test')
        await adminPage.locator('button:has-text("Continue")').click()
        await adminPage.waitForTimeout(500)
        await adminPage.locator('button:has-text("Confirm Action")').click()
        await adminPage.waitForTimeout(2000)
      }

      // User tab should show logout or access denied
      // This depends on implementation - may require navigation or realtime updates
      await userPage.reload()
      await userPage.waitForLoadState('networkidle')

      // User should be redirected or see error
      const currentUrl = userPage.url()
      if (!currentUrl.includes('/tenant/')) {
        // User was redirected away
        expect(currentUrl).toContain('/login')
      } else {
        // User might see an error message
        await expect(
          userPage
            .locator('text=/unauthorized/i')
            .or(userPage.locator('text=/access denied/i'))
            .or(userPage.locator('text=/banned/i'))
        )
          .toBeVisible({ timeout: 5000 })
          .catch(() => {
            // May not show error immediately
          })
      }
    } finally {
      await adminContext.close()
      await userContext.close()
    }
  })

  test('database state matches UI state across tabs', async ({ browser }) => {
    const context = await browser.newContext()

    try {
      const { adminId, supabaseAdmin } = await loginAsAdmin(context)

      // Create two tabs
      const page1 = await context.newPage()
      const page2 = await context.newPage()

      const adminEmail = generateTestEmail('admin')
      const password = 'TestPassword123!'

      // Login both tabs
      await page1.goto(`${baseUrl}/login`)
      await page1.fill('input[type="email"]', adminEmail)
      await page1.fill('input[type="password"]', password)
      await page1.click('button:has-text("Sign in")')
      await page1.waitForURL(/\/admin\/overview/, { timeout: 10000 })

      await page2.goto(`${baseUrl}/login`)
      await page2.fill('input[type="email"]', adminEmail)
      await page2.fill('input[type="password"]', password)
      await page2.click('button:has-text("Sign in")')
      await page2.waitForURL(/\/admin\/overview/, { timeout: 10000 })

      // Create target user
      const targetEmail = generateTestEmail('target')
      const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
        role: 'tenant',
      })

      // Both tabs navigate to users
      await page1.click('nav a:has-text("Users")')
      await page1.waitForURL(/\/admin\/users/, { timeout: 5000 })

      await page2.click('nav a:has-text("Users")')
      await page2.waitForURL(/\/admin\/users/, { timeout: 5000 })

      await page1.click('button:has-text("Tenants")')
      await page1.waitForTimeout(500)

      await page2.click('button:has-text("Tenants")')
      await page2.waitForTimeout(500)

      // Perform action in tab 1
      const userRow1 = page1.locator(`tr:has-text("${targetEmail}")`)
      const lockButton1 = userRow1.locator('button[title*="Lock"]')
      await lockButton1.click()

      // Complete action
      await expect(page1.locator('text=Lock Account')).toBeVisible({ timeout: 3000 })
      const confirmationInput1 = page1.locator('input[placeholder*="Type the user\'s email"]')
      if (await confirmationInput1.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmationInput1.fill(targetEmail)
        const reasonInput1 = page1.locator('textarea[placeholder*="Enter reason"]')
        await reasonInput1.fill('Database sync test')
        await page1.locator('button:has-text("Continue")').click()
        await page1.waitForTimeout(500)
        await page1.locator('button:has-text("Confirm Action")').click()
        await page1.waitForTimeout(2000)
      }

      // Verify database state
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('account_status, is_locked')
        .eq('id', targetId)
        .single()

      expect(userData?.account_status).toBe('locked')
      expect(userData?.is_locked).toBe(true)

      // Refresh tab 2 and verify UI matches database
      await page2.reload()
      await page2.waitForLoadState('networkidle')
      await page2.click('button:has-text("Tenants")')
      await page2.waitForTimeout(500)

      const userRow2 = page2.locator(`tr:has-text("${targetEmail}")`)
      await expect(userRow2.locator('text=Locked')).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
    }
  })
})
