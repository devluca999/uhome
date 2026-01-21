/**
 * Admin Performance Monitoring E2E Tests
 *
 * Tests admin-only access to performance monitoring, metrics visibility,
 * upload logs, and security logs.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import {
  createAndConfirmUser,
  loginAsTenant,
  loginAsLandlord,
  generateTestEmail,
} from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'
import { seedTestScenario } from '../../helpers/seed'

test.describe('Admin Performance Monitoring', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('admin can access performance page', async ({ page }) => {
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

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Assert: Performance page elements visible
    await expect(page.locator('h1:has-text("Performance & Security")')).toBeVisible()
    await expect(page.locator('text=Avg Page Load')).toBeVisible()
    await expect(page.locator('text=API Calls')).toBeVisible()
    await expect(page.locator('text=Upload Success Rate')).toBeVisible()
    await expect(page.locator('text=Security Incidents')).toBeVisible()
  })

  test('non-admin users cannot access performance page', async ({ page }) => {
    // Create tenant user
    const tenantEmail = generateTestEmail('tenant')
    const password = 'TestPassword123!'
    const { userId: tenantId } = await createAndConfirmUser(tenantEmail, password, {
      role: 'tenant',
    })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: tenantId, email: tenantEmail, role: 'tenant' })

    // Login as tenant
    await loginAsTenant(page, tenantEmail, password)
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Try to access admin performance page directly
    await page.goto(`${baseUrl}/admin/performance`)

    // Should be redirected (403 or back to dashboard)
    // The ProtectedRoute component should block access
    await expect(page).not.toHaveURL(/\/admin\/performance/)
  })

  test('landlord cannot access performance page', async ({ page }) => {
    // Create landlord user
    const landlordEmail = generateTestEmail('landlord')
    const password = 'TestPassword123!'
    const { userId: landlordId } = await createAndConfirmUser(landlordEmail, password, {
      role: 'landlord',
    })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin
      .from('users')
      .upsert({ id: landlordId, email: landlordEmail, role: 'landlord' })

    // Login as landlord
    await loginAsLandlord(page, landlordEmail, password)
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    // Try to access admin performance page directly
    await page.goto(`${baseUrl}/admin/performance`)

    // Should be redirected (403 or back to dashboard)
    await expect(page).not.toHaveURL(/\/admin\/performance/)
  })

  test('performance metrics are displayed', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Seed some test metrics data
    // Note: In a real scenario, metrics would be logged automatically
    // For testing, we can insert directly via admin client
    const anonymizedUserId = Buffer.from(adminId).toString('base64').substring(0, 32) // Simple anonymization for test

    await supabaseAdmin.from('admin_metrics').insert([
      {
        user_id: anonymizedUserId,
        user_role: 'admin',
        metric_type: 'page_load',
        page_path: '/admin/overview',
        metric_name: 'page_load_admin_overview',
        duration_ms: 500,
        metadata: {},
      },
      {
        user_id: anonymizedUserId,
        user_role: 'admin',
        metric_type: 'api_call',
        page_path: '/admin/overview',
        metric_name: 'api_users_list',
        duration_ms: 200,
        metadata: {},
      },
    ])

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Assert: Metrics cards show data
    await expect(page.locator('text=/\\d+ms/')).toBeVisible({ timeout: 5000 })
  })

  test('time range filter works', async ({ page }) => {
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

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Change time range to 7 days
    await page.click('select, button[role="combobox"]') // Select or Combobox trigger
    await page.click('text=Last 7 days')

    // Assert: Page updates (metrics should reload)
    await expect(page.locator('h1:has-text("Performance & Security")')).toBeVisible()
  })
})
