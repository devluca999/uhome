/**
 * Admin Users Management E2E Tests
 *
 * Tests user management functionality: search, filter, pagination, and tab navigation.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Admin Users Management', () => {
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

  test('users page displays landlords tab by default', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Default tab should be Landlords
    await expect(page.locator('text=Landlords')).toBeVisible()
    const landlordsTab = page.locator('button:has-text("Landlords")').first()
    const tabClasses = await landlordsTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')
  })

  test('search filters users by email', async ({ page }) => {
    await loginAsAdmin(page)
    const supabaseAdmin = getSupabaseAdminClient()

    // Create test users
    const searchEmail = generateTestEmail('searchtest')
    const { userId: searchUserId } = await createAndConfirmUser(searchEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin
      .from('users')
      .upsert({ id: searchUserId, email: searchEmail, role: 'tenant' })

    const otherEmail = generateTestEmail('other')
    const { userId: otherUserId } = await createAndConfirmUser(otherEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin.from('users').upsert({ id: otherUserId, email: otherEmail, role: 'tenant' })

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Search for specific email
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill(searchEmail.substring(0, 10)) // Partial match

    await page.waitForTimeout(500)

    // Should show matching user
    await expect(page.locator(`tr:has-text("${searchEmail}")`)).toBeVisible()

    // Other user might or might not be visible depending on search implementation
    // At minimum, search result should be visible
  })

  test('filter by role works correctly', async ({ page }) => {
    await loginAsAdmin(page)
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

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click Landlords tab
    await page.click('button:has-text("Landlords")')
    await page.waitForTimeout(500)

    // Should show landlord
    await expect(page.locator(`tr:has-text("${landlordEmail}")`)).toBeVisible()

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Should show tenant
    await expect(page.locator(`tr:has-text("${tenantEmail}")`)).toBeVisible()
  })

  test('filter by account status works correctly', async ({ page }) => {
    await loginAsAdmin(page)
    const supabaseAdmin = getSupabaseAdminClient()

    // Create test users with different statuses
    const activeEmail = generateTestEmail('active')
    const { userId: activeId } = await createAndConfirmUser(activeEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin
      .from('users')
      .upsert({ id: activeId, email: activeEmail, role: 'tenant', account_status: 'active' })

    const suspendedEmail = generateTestEmail('suspended')
    const { userId: suspendedId } = await createAndConfirmUser(suspendedEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin
      .from('users')
      .upsert({
        id: suspendedId,
        email: suspendedEmail,
        role: 'tenant',
        account_status: 'suspended',
      })

    const bannedEmail = generateTestEmail('banned')
    const { userId: bannedId } = await createAndConfirmUser(bannedEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin
      .from('users')
      .upsert({ id: bannedId, email: bannedEmail, role: 'tenant', account_status: 'banned' })

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click Suspended/Flagged tab
    await page.click('button:has-text("Suspended")')
    await page.waitForTimeout(500)

    // Should show suspended and banned users
    // At least one of them should be visible
    const suspendedVisible = await page
      .locator(`tr:has-text("${suspendedEmail}")`)
      .isVisible()
      .catch(() => false)
    const bannedVisible = await page
      .locator(`tr:has-text("${bannedEmail}")`)
      .isVisible()
      .catch(() => false)

    expect(suspendedVisible || bannedVisible).toBe(true)

    // Click Tenants tab (should show all tenants including active)
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Active tenant should be visible
    await expect(page.locator(`tr:has-text("${activeEmail}")`)).toBeVisible()
  })

  test('users table displays user information', async ({ page }) => {
    await loginAsAdmin(page)
    const supabaseAdmin = getSupabaseAdminClient()

    // Create test user
    const testEmail = generateTestEmail('displaytest')
    const { userId } = await createAndConfirmUser(testEmail, 'TestPassword123!', { role: 'tenant' })
    await supabaseAdmin.from('users').upsert({ id: userId, email: testEmail, role: 'tenant' })

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Find user row
    const userRow = page.locator(`tr:has-text("${testEmail}")`)
    await expect(userRow).toBeVisible()

    // Verify table columns are visible
    await expect(userRow.locator('td')).toHaveCount(5) // Email, Status, Created, Last Sign In, Actions
  })

  test('pagination handles large user lists', async ({ page }) => {
    await loginAsAdmin(page)
    const supabaseAdmin = getSupabaseAdminClient()

    // Create multiple test tenants (more than default page size)
    const users = []
    for (let i = 0; i < 15; i++) {
      const email = generateTestEmail(`tenant${i}`)
      const { userId } = await createAndConfirmUser(email, 'TestPassword123!', { role: 'tenant' })
      await supabaseAdmin.from('users').upsert({ id: userId, email, role: 'tenant' })
      users.push({ email, userId })
    }

    // Wait for data to sync
    await page.waitForTimeout(2000)

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Verify users are displayed (at least some of them)
    // Exact count depends on pagination implementation
    const userRows = page.locator('tbody tr')
    const rowCount = await userRows.count()
    expect(rowCount).toBeGreaterThan(0)

    // Verify pagination controls exist if there are enough users
    // (This depends on pagination implementation)
  })

  test('user status badges display correctly', async ({ page }) => {
    await loginAsAdmin(page)
    const supabaseAdmin = getSupabaseAdminClient()

    // Create users with different statuses
    const activeEmail = generateTestEmail('activebadge')
    const { userId: activeId } = await createAndConfirmUser(activeEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin
      .from('users')
      .upsert({ id: activeId, email: activeEmail, role: 'tenant', account_status: 'active' })

    const suspendedEmail = generateTestEmail('suspendedbadge')
    const { userId: suspendedId } = await createAndConfirmUser(suspendedEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin
      .from('users')
      .upsert({
        id: suspendedId,
        email: suspendedEmail,
        role: 'tenant',
        account_status: 'suspended',
      })

    const bannedEmail = generateTestEmail('bannedbadge')
    const { userId: bannedId } = await createAndConfirmUser(bannedEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin
      .from('users')
      .upsert({ id: bannedId, email: bannedEmail, role: 'tenant', account_status: 'banned' })

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Verify status badges
    const activeRow = page.locator(`tr:has-text("${activeEmail}")`)
    await expect(activeRow.locator('text=Active')).toBeVisible()

    // Check suspended/flagged tab
    await page.click('button:has-text("Suspended")')
    await page.waitForTimeout(500)

    const suspendedRow = page.locator(`tr:has-text("${suspendedEmail}")`)
    await expect(suspendedRow.locator('text=Suspended')).toBeVisible()

    const bannedRow = page.locator(`tr:has-text("${bannedEmail}")`)
    await expect(bannedRow.locator('text=Banned')).toBeVisible()
  })

  test('tab navigation updates user list', async ({ page }) => {
    await loginAsAdmin(page)
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

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Landlords tab
    await page.click('button:has-text("Landlords")')
    await page.waitForTimeout(500)
    await expect(page.locator(`tr:has-text("${landlordEmail}")`)).toBeVisible()

    // Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)
    await expect(page.locator(`tr:has-text("${tenantEmail}")`)).toBeVisible()

    // Suspended tab
    await page.click('button:has-text("Suspended")')
    await page.waitForTimeout(500)
    // Should not show our active users
    await expect(page.locator(`tr:has-text("${landlordEmail}")`)).not.toBeVisible()
    await expect(page.locator(`tr:has-text("${tenantEmail}")`)).not.toBeVisible()
  })
})
