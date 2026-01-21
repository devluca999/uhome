/**
 * Admin Comprehensive UAT Tests
 *
 * Full workflow integration tests for admin functionality.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'
import {
  seedAdminTestScenario,
  seedAuditLogs,
  seedSupportTickets,
  seedPerformanceMetrics,
} from '../../helpers/admin-test-helpers'
import { seedTestScenario } from '../../helpers/seed'

test.describe('Admin Comprehensive UAT', () => {
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

    return { adminEmail, adminId, supabaseAdmin }
  }

  test('complete admin workflow: overview to user management to audit', async ({ page }) => {
    // Seed comprehensive test data
    const scenario = await seedAdminTestScenario()
    await seedAuditLogs(
      20,
      scenario.admin.userId,
      scenario.users.map(u => u.userId)
    )
    await seedSupportTickets(10)
    await seedPerformanceMetrics(30)

    const { adminId } = await loginAsAdmin(page)

    // 1. View Overview
    await page.goto(`${baseUrl}/admin/overview`)
    await page.waitForURL(/\/admin\/overview/, { timeout: 5000 })
    await expect(page.locator('text=Total Users')).toBeVisible()

    // Switch between tabs
    await page.click('button:has-text("Transactions")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Platform Revenue')).toBeVisible()

    await page.click('button:has-text("System Load")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Active Sessions')).toBeVisible()

    // 2. Manage Users
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Search for a user
    const searchInput = page.locator('input[placeholder*="Search"]')
    if (scenario.users.length > 0) {
      await searchInput.fill(scenario.users[0].email.substring(0, 5))
      await page.waitForTimeout(500)
    }

    // View tenants
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // View suspended/flagged
    await page.click('button:has-text("Suspended")')
    await page.waitForTimeout(500)

    // 3. View Performance
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })
    await expect(page.locator('text=Performance Metrics')).toBeVisible()

    // Switch time range
    const timeRangeSelect = page.locator('select').first()
    await timeRangeSelect.selectOption('7d')
    await page.waitForTimeout(1000)

    // 4. View Audit & Security
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })
    await expect(page.locator('text=Audit Logs')).toBeVisible()

    // View security alerts
    await page.click('button:has-text("Security Alerts")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Security Alerts')).toBeVisible()

    // 5. View Messages & Support
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })
    await expect(page.locator('text=Support Tickets')).toBeVisible()

    // View conversations
    await page.click('button:has-text("Conversations")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Conversations')).toBeVisible()
  })

  test('admin action workflow: ban user and verify audit log', async ({ page }) => {
    const scenario = await seedAdminTestScenario()
    const { adminId, supabaseAdmin } = await loginAsAdmin(page)

    // Find an active tenant to ban
    const activeTenant = scenario.users.find(u => u.status === 'active' && u.role === 'tenant')
    if (!activeTenant) {
      throw new Error('No active tenant found for ban test')
    }

    // Navigate to users
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Ban user
    const userRow = page.locator(`tr:has-text("${activeTenant.email}")`)
    await expect(userRow).toBeVisible()

    const banButton = userRow.locator('button[title*="Ban"]')
    await banButton.click()

    // Complete ban action
    await expect(page.locator('text=Ban User')).toBeVisible({ timeout: 3000 })
    const confirmationInput = page.locator('input[placeholder*="Type the user\'s email"]')
    if (await confirmationInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmationInput.fill(activeTenant.email)
      const reasonInput = page.locator('textarea[placeholder*="Enter reason"]')
      await reasonInput.fill('Comprehensive UAT test')
      await page.locator('button:has-text("Continue")').click()
      await page.waitForTimeout(500)
      await page.locator('button:has-text("Confirm Action")').click()
      await page.waitForTimeout(2000)
    }

    // Verify in audit logs
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Filter by ban action
    const actionTypeSelect = page.locator('select').first()
    await actionTypeSelect.selectOption('ban')
    await page.waitForTimeout(1000)

    // Verify audit log entry
    await expect(page.locator('text=Comprehensive UAT test')).toBeVisible({ timeout: 5000 })

    // Verify user is banned in database
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('account_status')
      .eq('id', activeTenant.userId)
      .single()

    expect(userData?.account_status).toBe('banned')
  })

  test('admin can handle multiple tabs and actions', async ({ browser }) => {
    const scenario = await seedAdminTestScenario()

    const context = await browser.newContext()
    try {
      const { adminId } = await loginAsAdmin(await context.newPage())

      // Create two admin tabs
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

      // Tab 1: View overview
      await page1.goto(`${baseUrl}/admin/overview`)
      await expect(page1.locator('text=Total Users')).toBeVisible()

      // Tab 2: View users
      await page2.goto(`${baseUrl}/admin/users`)
      await expect(page2.locator('text=Users')).toBeVisible()

      // Both tabs should work independently
      await expect(page1.locator('text=Total Users')).toBeVisible()
      await expect(page2.locator('text=Users')).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
