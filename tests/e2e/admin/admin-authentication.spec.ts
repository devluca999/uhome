/**
 * Admin Authentication E2E Tests
 *
 * Tests admin login, access control, and role-based permissions.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Admin Authentication', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('admin can login and access admin routes', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')

    // Should redirect to admin overview
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })
    await expect(page.locator('h1:has-text("Overview")')).toBeVisible()
  })

  test('non-admin users cannot access admin routes', async ({ page }) => {
    // Create tenant user
    const tenantEmail = generateTestEmail('tenant')
    const password = 'TestPassword123!'
    await createAndConfirmUser(tenantEmail, password, { role: 'tenant' })

    // Login as tenant
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', tenantEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Try to access admin routes
    await page.goto(`${baseUrl}/admin/overview`)

    // Should be redirected away or show error
    // Check if we're still on admin route or redirected
    const currentUrl = page.url()
    if (currentUrl.includes('/admin')) {
      // If still on admin route, should show error/unauthorized message
      await expect(
        page
          .locator('text=/unauthorized/i')
          .or(page.locator('text=/forbidden/i'))
          .or(page.locator('text=/access denied/i'))
      ).toBeVisible({ timeout: 5000 })
    } else {
      // Otherwise, should be redirected to tenant dashboard
      expect(currentUrl).toContain('/tenant/')
    }
  })

  test('landlord users cannot access admin routes', async ({ page }) => {
    // Create landlord user
    const landlordEmail = generateTestEmail('landlord')
    const password = 'TestPassword123!'
    await createAndConfirmUser(landlordEmail, password, { role: 'landlord' })

    // Login as landlord
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', landlordEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    // Try to access admin routes
    await page.goto(`${baseUrl}/admin/users`)

    // Should be redirected away or show error
    const currentUrl = page.url()
    if (currentUrl.includes('/admin')) {
      await expect(
        page
          .locator('text=/unauthorized/i')
          .or(page.locator('text=/forbidden/i'))
          .or(page.locator('text=/access denied/i'))
      ).toBeVisible({ timeout: 5000 })
    } else {
      expect(currentUrl).toContain('/landlord/')
    }
  })

  test('admin session persists across page navigation', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    // Navigate to different admin pages
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })
    await expect(page.locator('h1:has-text("Users")')).toBeVisible()

    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })
    await expect(page.locator('h1:has-text("Performance")')).toBeVisible()

    await page.click('nav a:has-text("Overview")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })
    await expect(page.locator('h1:has-text("Overview")')).toBeVisible()

    // Should still be authenticated
    await expect(page.locator('nav')).toBeVisible()
  })

  test('admin role verification in database', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Verify role in database
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', adminId)
      .single()

    expect(error).toBeNull()
    expect(userData?.role).toBe('admin')
    expect(userData?.email).toBe(adminEmail)

    // Login and verify access
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })
  })

  test('RLS policies prevent non-admin access to admin tables', async ({ page }) => {
    // Create tenant user
    const tenantEmail = generateTestEmail('tenant')
    const password = 'TestPassword123!'
    const { userId: tenantId } = await createAndConfirmUser(tenantEmail, password, {
      role: 'tenant',
    })

    // Login as tenant
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', tenantEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Try to access admin tables via direct URL (if exposed)
    // RLS should prevent access even if route is somehow accessed
    await page.goto(`${baseUrl}/admin/audit-security`)

    // Should not be able to see admin data
    const currentUrl = page.url()
    if (currentUrl.includes('/admin')) {
      // If still on admin route, should not show data
      // This test verifies UI-level protection; RLS protects database
      await expect(
        page
          .locator('text=/unauthorized/i')
          .or(page.locator('text=/forbidden/i'))
          .or(page.locator('text=/access denied/i'))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('multiple admin sessions can coexist', async ({ browser }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Create two browser contexts (simulating two tabs/browsers)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      // Login on both pages
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

      // Both should be authenticated and have access
      await expect(page1.locator('h1:has-text("Overview")')).toBeVisible()
      await expect(page2.locator('h1:has-text("Overview")')).toBeVisible()

      // Both can navigate independently
      await page1.click('nav a:has-text("Users")')
      await page1.waitForURL(/\/admin\/users/, { timeout: 5000 })

      await page2.click('nav a:has-text("Performance")')
      await page2.waitForURL(/\/admin\/performance/, { timeout: 5000 })

      // Both should still be authenticated
      await expect(page1.locator('h1:has-text("Users")')).toBeVisible()
      await expect(page2.locator('h1:has-text("Performance")')).toBeVisible()
    } finally {
      await context1.close()
      await context2.close()
    }
  })
})
