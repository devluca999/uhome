/**
 * Admin Overview E2E Tests
 *
 * Tests the admin overview page with tabs (Metrics, Transactions, System Load),
 * metrics display, charts, and time range filters.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Admin Overview', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  async function loginAsAdmin(page: any) {
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    return { adminEmail, adminId }
  }

  test('overview page displays metrics tab by default', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to overview (should already be there after login)
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })

    // Default tab should be Metrics
    await expect(page.locator('text=Total Users')).toBeVisible()
    await expect(page.locator('text=Landlords')).toBeVisible()
    await expect(page.locator('text=Tenants')).toBeVisible()
    await expect(page.locator('text=Subscriptions')).toBeVisible()
  })

  test('metrics tab displays user statistics', async ({ page }) => {
    // Create test users
    const adminInfo = await loginAsAdmin(page)
    const supabaseAdmin = getSupabaseAdminClient()

    // Create test landlord
    const landlordEmail = generateTestEmail('landlord')
    const { userId: landlordId } = await createAndConfirmUser(landlordEmail, 'TestPassword123!', {
      role: 'landlord',
    })
    await supabaseAdmin
      .from('users')
      .upsert({ id: landlordId, email: landlordEmail, role: 'landlord' })

    // Create test tenant
    const tenantEmail = generateTestEmail('tenant')
    const { userId: tenantId } = await createAndConfirmUser(tenantEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin.from('users').upsert({ id: tenantId, email: tenantEmail, role: 'tenant' })

    // Wait a bit for data to sync
    await page.waitForTimeout(1000)

    // Navigate to overview
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })

    // Verify metrics tab is active - check styling
    const metricsTab = page.locator('button:has-text("Metrics")').first()
    const tabClasses = await metricsTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')

    // Verify user counts are displayed (at least 1 for each role we created)
    await expect(page.locator('text=Total Users')).toBeVisible()
    await expect(page.locator('text=Landlords')).toBeVisible()
    await expect(page.locator('text=Tenants')).toBeVisible()
  })

  test('transactions tab displays transaction metrics', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to overview
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })

    // Click Transactions tab
    await page.click('button:has-text("Transactions")')
    await page.waitForTimeout(500)

    // Verify Transactions tab content
    await expect(page.locator('text=Platform Revenue')).toBeVisible()
    await expect(page.locator('text=Monthly Revenue')).toBeVisible()
    await expect(page.locator('text=Failed Transactions')).toBeVisible()
    await expect(page.locator('text=Refunds')).toBeVisible()
  })

  test('system load tab displays system metrics', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to overview
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })

    // Click System Load tab
    await page.click('button:has-text("System Load")')
    await page.waitForTimeout(500)

    // Verify System Load tab content
    await expect(page.locator('text=Active Sessions')).toBeVisible()
    await expect(page.locator('text=API Calls')).toBeVisible()
    await expect(page.locator('text=Average Response Time')).toBeVisible()
  })

  test('tabs switch correctly and content updates', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to overview
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })

    // Start on Metrics tab
    await expect(page.locator('text=Total Users')).toBeVisible()

    // Switch to Transactions
    await page.click('button:has-text("Transactions")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Platform Revenue')).toBeVisible()
    await expect(page.locator('text=Total Users')).not.toBeVisible()

    // Switch to System Load
    await page.click('button:has-text("System Load")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Active Sessions')).toBeVisible()
    await expect(page.locator('text=Platform Revenue')).not.toBeVisible()

    // Switch back to Metrics
    await page.click('button:has-text("Metrics")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Total Users')).toBeVisible()
    await expect(page.locator('text=Active Sessions')).not.toBeVisible()
  })

  test('metrics load correctly with seeded data', async ({ page }) => {
    const adminInfo = await loginAsAdmin(page)
    const supabaseAdmin = getSupabaseAdminClient()

    // Create multiple test users
    const users = []
    for (let i = 0; i < 3; i++) {
      const email = generateTestEmail(`landlord${i}`)
      const { userId } = await createAndConfirmUser(email, 'TestPassword123!', { role: 'landlord' })
      await supabaseAdmin.from('users').upsert({ id: userId, email, role: 'landlord' })
      users.push({ email, userId })
    }

    for (let i = 0; i < 5; i++) {
      const email = generateTestEmail(`tenant${i}`)
      const { userId } = await createAndConfirmUser(email, 'TestPassword123!', { role: 'tenant' })
      await supabaseAdmin.from('users').upsert({ id: userId, email, role: 'tenant' })
      users.push({ email, userId })
    }

    // Wait for data to sync
    await page.waitForTimeout(2000)

    // Navigate to overview and refresh
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify metrics reflect the seeded data (at least the minimum counts)
    await expect(page.locator('text=Total Users')).toBeVisible()
    // Note: Exact counts may vary depending on existing test data, but should show numbers
    const totalUsersText = await page
      .locator('text=/Total Users/')
      .first()
      .locator('..')
      .locator('.text-2xl')
      .textContent()
    expect(parseInt(totalUsersText || '0')).toBeGreaterThanOrEqual(9) // 1 admin + 3 landlords + 5 tenants
  })

  test('charts render properly in overview', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to overview
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })

    // Wait for charts to load (Recharts renders as SVG)
    await page.waitForSelector('svg', { timeout: 10000 })

    // Verify SVG elements exist (charts are rendered)
    const svgCount = await page.locator('svg').count()
    expect(svgCount).toBeGreaterThan(0)
  })

  test('active tab is visually highlighted', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to overview
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })

    // Metrics tab should be active initially - check styling
    const metricsTab = page.locator('button:has-text("Metrics")').first()
    let tabClasses = await metricsTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')

    // Click Transactions tab
    await page.click('button:has-text("Transactions")')
    await page.waitForTimeout(500)

    // Transactions tab should now be active - check styling
    const transactionsTab = page.locator('button:has-text("Transactions")').first()
    tabClasses = await transactionsTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')

    // Metrics tab should no longer be active
    tabClasses = await metricsTab.getAttribute('class')
    expect(tabClasses).not.toContain('bg-background')
  })
})
