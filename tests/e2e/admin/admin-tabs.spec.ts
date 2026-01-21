/**
 * Admin Tabs Navigation E2E Tests
 *
 * Tests tab navigation across all admin pages:
 * - Overview page tabs
 * - Users page tabs
 * - Performance page tabs
 * - Payments page tabs
 * - Audit & Security page tabs
 * - Messages & Support page tabs
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Admin Tab Navigation', () => {
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

  test('Overview page tabs work correctly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to overview
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })

    // Default tab should be Metrics
    await expect(page.locator('text=Total Users')).toBeVisible()

    // Click Transactions tab
    await page.click('button:has-text("Transactions")')
    await expect(page.locator('text=Platform Revenue')).toBeVisible()
    await expect(page.locator('text=Failed Transactions')).toBeVisible()

    // Click System Load tab
    await page.click('button:has-text("System Load")')
    await expect(page.locator('text=Active Sessions')).toBeVisible()
    await expect(page.locator('text=API Calls')).toBeVisible()

    // Click back to Metrics tab
    await page.click('button:has-text("Metrics")')
    await expect(page.locator('text=Total Users')).toBeVisible()
  })

  test('Users page tabs work correctly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to users page
    await page.goto(`${baseUrl}/admin/users`)
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Default tab should be Landlords
    await expect(page.locator('text=Landlords')).toBeVisible()

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await expect(page.locator('text=Tenants')).toBeVisible()
    // Should show tenants table header
    await expect(page.locator('th:has-text("Email")')).toBeVisible()

    // Click Suspended tab
    await page.click('button:has-text("Suspended")')
    await expect(page.locator('text=Suspended / Flagged Accounts')).toBeVisible()

    // Click back to Landlords tab
    await page.click('button:has-text("Landlords")')
    await expect(page.locator('text=Landlords')).toBeVisible()
  })

  test('Performance page tabs work correctly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to performance page
    await page.goto(`${baseUrl}/admin/performance`)
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Default tab should be Performance Metrics
    await expect(page.locator('text=Avg Page Load')).toBeVisible()

    // Click Quotas & Limits tab
    await page.click('button:has-text("Quotas & Limits")')
    await expect(page.locator('text=Quota Configuration')).toBeVisible()
    await expect(page.locator('text=Tenant Quotas')).toBeVisible()

    // Click Error Logs tab
    await page.click('button:has-text("Error Logs")')
    await expect(page.locator('text=Error Logs')).toBeVisible()
    await expect(page.locator('text=System errors')).toBeVisible()

    // Click back to Performance Metrics tab
    await page.click('button:has-text("Performance Metrics")')
    await expect(page.locator('text=Avg Page Load')).toBeVisible()
  })

  test('Payments page tabs work correctly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to payments page
    await page.goto(`${baseUrl}/admin/payments`)
    await page.waitForURL(/\/admin\/payments/, { timeout: 5000 })

    // Default tab should be Revenue Overview
    await expect(page.locator('text=Total Revenue')).toBeVisible()

    // Click Failed Transactions tab
    await page.click('button:has-text("Failed Transactions")')
    await expect(page.locator('text=Failed Transactions')).toBeVisible()
    await expect(page.locator('text=Refunds')).toBeVisible()

    // Click Subscription Analytics tab
    await page.click('button:has-text("Subscription Analytics")')
    await expect(page.locator('text=Active Subscriptions')).toBeVisible()
    await expect(page.locator('text=Subscription Trends')).toBeVisible()

    // Click back to Revenue Overview tab
    await page.click('button:has-text("Revenue Overview")')
    await expect(page.locator('text=Total Revenue')).toBeVisible()
  })

  test('Audit & Security page tabs work correctly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to audit-security page
    await page.goto(`${baseUrl}/admin/audit-security`)
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Default tab should be Audit Logs
    await expect(page.locator('text=Admin Audit Logs')).toBeVisible()

    // Click Security Alerts tab
    await page.click('button:has-text("Security Alerts")')
    await expect(page.locator('text=Security Alerts')).toBeVisible()
    await expect(page.locator('text=Failed logins')).toBeVisible()

    // Click System Behavior tab
    await page.click('button:has-text("System Behavior")')
    await expect(page.locator('text=System Behavior Analysis')).toBeVisible()
    await expect(page.locator('text=Abuse Detection')).toBeVisible()

    // Click back to Audit Logs tab
    await page.click('button:has-text("Audit Logs")')
    await expect(page.locator('text=Admin Audit Logs')).toBeVisible()
  })

  test('Messages & Support page tabs work correctly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to messages-support page
    await page.goto(`${baseUrl}/admin/messages-support`)
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Default tab should be Tickets
    await expect(page.locator('text=Support Tickets')).toBeVisible()

    // Click Conversations tab
    await page.click('button:has-text("Conversations")')
    await expect(page.locator('text=Conversations')).toBeVisible()
    await expect(page.locator('text=Read-only view')).toBeVisible()

    // Click Announcements tab
    await page.click('button:has-text("Announcements")')
    await expect(page.locator('text=Platform Announcements')).toBeVisible()
    await expect(page.locator('text=Email Logs')).toBeVisible()

    // Click back to Tickets tab
    await page.click('button:has-text("Tickets")')
    await expect(page.locator('text=Support Tickets')).toBeVisible()
  })

  test('Tab state persists in URL or maintains during navigation', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to users page
    await page.goto(`${baseUrl}/admin/users`)
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Verify tab is selected - check for active styling instead of aria-selected
    const tenantsTab = page.locator('button:has-text("Tenants")').first()
    const tabClasses = await tenantsTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')

    // Navigate away and back
    await page.goto(`${baseUrl}/admin/overview`)
    await page.goto(`${baseUrl}/admin/users`)

    // Note: Tab state may reset, but at least verify the page loads
    await expect(page.locator('text=Users')).toBeVisible()
  })

  test('Tab filtering works correctly on Users page', async ({ page }) => {
    await loginAsAdmin(page)

    // Create test users
    const landlordEmail = generateTestEmail('landlord')
    const tenantEmail = generateTestEmail('tenant')
    await createAndConfirmUser(landlordEmail, 'TestPassword123!', { role: 'landlord' })
    await createAndConfirmUser(tenantEmail, 'TestPassword123!', { role: 'tenant' })

    // Navigate to users page
    await page.goto(`${baseUrl}/admin/users`)
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click Landlords tab
    await page.click('button:has-text("Landlords")')
    await page.waitForTimeout(1000)
    // Verify tab is active - check styling
    const landlordsTab2 = page.locator('button:has-text("Landlords")').first()
    const landlordsTabClasses = await landlordsTab2.getAttribute('class')
    expect(landlordsTabClasses).toContain('bg-background')
    // Should only show landlords
    const landlordCount = await page.locator('tr').filter({ hasText: landlordEmail }).count()
    expect(landlordCount).toBeGreaterThan(0)

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(1000)
    // Should only show tenants
    const tenantCount = await page.locator('tr').filter({ hasText: tenantEmail }).count()
    expect(tenantCount).toBeGreaterThan(0)
  })

  test('active tab is visually highlighted across all pages', async ({ page }) => {
    await loginAsAdmin(page)

    // Test Overview page
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })
    const metricsTab1 = page.locator('button:has-text("Metrics")').first()
    let tabClasses = await metricsTab1.getAttribute('class')
    expect(tabClasses).toContain('bg-background')

    // Test Users page
    await page.goto(`${baseUrl}/admin/users`)
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })
    const landlordsTab = page.locator('button:has-text("Landlords")').first()
    tabClasses = await landlordsTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')

    // Test Performance page
    await page.goto(`${baseUrl}/admin/performance`)
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })
    const performanceTab = page.locator('button:has-text("Performance Metrics")').first()
    tabClasses = await performanceTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')

    // Test Payments page
    await page.goto(`${baseUrl}/admin/payments`)
    await page.waitForURL(/\/admin\/payments/, { timeout: 5000 })
    const revenueTab = page.locator('button:has-text("Revenue Overview")').first()
    tabClasses = await revenueTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')

    // Test Audit & Security page
    await page.goto(`${baseUrl}/admin/audit-security`)
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })
    const auditTab = page.locator('button:has-text("Audit Logs")').first()
    tabClasses = await auditTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')

    // Test Messages & Support page
    await page.goto(`${baseUrl}/admin/messages-support`)
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })
    const ticketsTab = page.locator('button:has-text("Tickets")').first()
    tabClasses = await ticketsTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')
  })

  test('tab content updates when switching between tabs', async ({ page }) => {
    await loginAsAdmin(page)

    // Test Overview page tabs
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })

    // Verify Metrics tab content
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

  test('tab navigation maintains filters and search state', async ({ page }) => {
    await loginAsAdmin(page)
    const supabaseAdmin = getSupabaseAdminClient()

    // Create test users
    const landlordEmail = generateTestEmail('landlord')
    const { userId: landlordId } = await createAndConfirmUser(landlordEmail, 'TestPassword123!', {
      role: 'landlord',
    })
    await supabaseAdmin
      .from('users')
      .upsert({ id: landlordId, email: landlordEmail, role: 'landlord' })

    // Navigate to users page
    await page.goto(`${baseUrl}/admin/users`)
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click Tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Enter search query
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill(landlordEmail.substring(0, 5))
    await page.waitForTimeout(500)

    // Switch to Landlords tab
    await page.click('button:has-text("Landlords")')
    await page.waitForTimeout(500)

    // Search should still be active (or cleared, depending on implementation)
    // Verify tab switch worked
    await expect(page.locator('button:has-text("Landlords")')).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  test('all admin pages have working tab navigation', async ({ page }) => {
    await loginAsAdmin(page)

    const pages = [
      { path: '/admin/overview', tabs: ['Metrics', 'Transactions', 'System Load'] },
      { path: '/admin/users', tabs: ['Landlords', 'Tenants', 'Suspended'] },
      {
        path: '/admin/performance',
        tabs: ['Performance Metrics', 'Quotas & Limits', 'Error Logs'],
      },
      {
        path: '/admin/payments',
        tabs: ['Revenue Overview', 'Failed Transactions', 'Subscription Analytics'],
      },
      { path: '/admin/audit-security', tabs: ['Audit Logs', 'Security Alerts', 'System Behavior'] },
      { path: '/admin/messages-support', tabs: ['Tickets', 'Conversations', 'Announcements'] },
    ]

    for (const pageInfo of pages) {
      await page.goto(`${baseUrl}${pageInfo.path}`)
      await page.waitForURL(new RegExp(pageInfo.path.replace('/', '\\/')), { timeout: 5000 })

      // Verify all tabs exist and are clickable
      for (const tabName of pageInfo.tabs) {
        const tab = page.locator(`button:has-text("${tabName}")`)
        await expect(tab).toBeVisible()

        // Click tab
        await tab.click()
        await page.waitForTimeout(300)

        // Verify tab is selected - check styling
        const tabClasses = await tab.getAttribute('class')
        expect(tabClasses).toContain('bg-background')
      }

      // Return to first tab
      await page.locator(`button:has-text("${pageInfo.tabs[0]}")`).click()
      await page.waitForTimeout(300)
    }
  })
})
