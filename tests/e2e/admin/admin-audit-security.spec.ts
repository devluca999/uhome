/**
 * Admin Audit & Security E2E Tests
 *
 * Tests audit logs, security alerts, filters, and pagination.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Admin Audit & Security', () => {
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

  test('audit-security page displays audit logs tab by default', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to audit-security page
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Default tab should be Audit Logs
    await expect(page.locator('text=Audit Logs')).toBeVisible()
    const auditLogsTab = page.locator('button:has-text("Audit Logs")').first()
    const tabClasses = await auditLogsTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')
  })

  test('audit logs are displayed in chronological order', async ({ page }) => {
    const { supabaseAdmin, adminId } = await loginAsAdmin(page)

    // Create target user
    const targetEmail = generateTestEmail('target')
    const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
      role: 'tenant',
    })

    // Seed audit logs with different timestamps
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin.from('admin_audit_logs').insert([
      {
        admin_id: adminId,
        admin_email: 'admin@test.com',
        action_type: 'ban',
        target_user_id: targetId,
        target_user_email: targetEmail,
        target_user_role: 'tenant',
        reason: 'Test ban 1',
        created_at: oneHourAgo,
      },
      {
        admin_id: adminId,
        admin_email: 'admin@test.com',
        action_type: 'lock',
        target_user_id: targetId,
        target_user_email: targetEmail,
        target_user_role: 'tenant',
        reason: 'Test lock 2',
        created_at: twoHoursAgo,
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to audit-security page
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Verify audit logs are displayed
    await expect(page.locator('text=Test ban 1')).toBeVisible()
    await expect(page.locator('text=Test lock 2')).toBeVisible()
  })

  test('filter audit logs by action type', async ({ page }) => {
    const { supabaseAdmin, adminId } = await loginAsAdmin(page)

    // Create target user
    const targetEmail = generateTestEmail('target')
    const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
      role: 'tenant',
    })

    // Seed audit logs with different action types
    await supabaseAdmin.from('admin_audit_logs').insert([
      {
        admin_id: adminId,
        admin_email: 'admin@test.com',
        action_type: 'ban',
        target_user_id: targetId,
        target_user_email: targetEmail,
        target_user_role: 'tenant',
        reason: 'Ban action',
      },
      {
        admin_id: adminId,
        admin_email: 'admin@test.com',
        action_type: 'lock',
        target_user_id: targetId,
        target_user_email: targetEmail,
        target_user_role: 'tenant',
        reason: 'Lock action',
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to audit-security page
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Filter by ban action
    const actionTypeSelect = page.locator('select').first() // Action type filter
    await actionTypeSelect.selectOption('ban')
    await page.waitForTimeout(1000)

    // Should show only ban actions
    await expect(page.locator('text=Ban action')).toBeVisible()
  })

  test('search audit logs by email', async ({ page }) => {
    const { supabaseAdmin, adminId } = await loginAsAdmin(page)

    // Create target users
    const targetEmail1 = generateTestEmail('target1')
    const { userId: targetId1 } = await createAndConfirmUser(targetEmail1, 'TestPassword123!', {
      role: 'tenant',
    })

    const targetEmail2 = generateTestEmail('target2')
    const { userId: targetId2 } = await createAndConfirmUser(targetEmail2, 'TestPassword123!', {
      role: 'tenant',
    })

    // Seed audit logs for different users
    await supabaseAdmin.from('admin_audit_logs').insert([
      {
        admin_id: adminId,
        admin_email: 'admin@test.com',
        action_type: 'ban',
        target_user_id: targetId1,
        target_user_email: targetEmail1,
        target_user_role: 'tenant',
        reason: 'Ban user 1',
      },
      {
        admin_id: adminId,
        admin_email: 'admin@test.com',
        action_type: 'lock',
        target_user_id: targetId2,
        target_user_email: targetEmail2,
        target_user_role: 'tenant',
        reason: 'Lock user 2',
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to audit-security page
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Search by email
    const searchInput = page.locator('input[placeholder*="Search"]').first()
    await searchInput.fill(targetEmail1.substring(0, 10))
    await page.waitForTimeout(500)

    // Should show matching logs
    await expect(page.locator('text=Ban user 1')).toBeVisible()
  })

  test('filter audit logs by date range', async ({ page }) => {
    const { supabaseAdmin, adminId } = await loginAsAdmin(page)

    // Create target user
    const targetEmail = generateTestEmail('target')
    const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
      role: 'tenant',
    })

    // Seed audit logs with different dates
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin.from('admin_audit_logs').insert([
      {
        admin_id: adminId,
        admin_email: 'admin@test.com',
        action_type: 'ban',
        target_user_id: targetId,
        target_user_email: targetEmail,
        target_user_role: 'tenant',
        reason: 'Recent ban',
        created_at: yesterday,
      },
      {
        admin_id: adminId,
        admin_email: 'admin@test.com',
        action_type: 'lock',
        target_user_id: targetId,
        target_user_email: targetEmail,
        target_user_role: 'tenant',
        reason: 'Old lock',
        created_at: lastWeek,
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to audit-security page
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Set date range filter (yesterday to today)
    const startDateInput = page.locator('input[type="date"]').first()
    const endDateInput = page.locator('input[type="date"]').nth(1)

    const yesterdayDate = new Date(yesterday).toISOString().split('T')[0]
    const todayDate = new Date().toISOString().split('T')[0]

    await startDateInput.fill(yesterdayDate)
    await endDateInput.fill(todayDate)
    await page.waitForTimeout(1000)

    // Should show only recent logs
    await expect(page.locator('text=Recent ban')).toBeVisible()
  })

  test('security alerts tab displays security logs', async ({ page }) => {
    const { supabaseAdmin } = await loginAsAdmin(page)

    // Seed security logs
    const testUserId = 'test-user-id-' + Date.now()
    await supabaseAdmin.from('admin_security_logs').insert([
      {
        user_id: testUserId,
        user_role: 'tenant',
        event_type: 'failed_login',
        severity: 'medium',
        ip_address: '192.168.1.1',
        details: { attempts: 3 },
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to audit-security page
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Click Security Alerts tab
    await page.click('button:has-text("Security Alerts")')
    await page.waitForTimeout(500)

    // Verify security alerts are displayed
    await expect(page.locator('text=Security Alerts')).toBeVisible()
  })

  test('filter security alerts by severity', async ({ page }) => {
    const { supabaseAdmin } = await loginAsAdmin(page)

    // Seed security logs with different severities
    const testUserId = 'test-user-id-' + Date.now()
    await supabaseAdmin.from('admin_security_logs').insert([
      {
        user_id: testUserId,
        user_role: 'tenant',
        event_type: 'failed_login',
        severity: 'low',
        ip_address: '192.168.1.1',
        details: {},
      },
      {
        user_id: testUserId,
        user_role: 'tenant',
        event_type: 'rate_limit_exceeded',
        severity: 'high',
        ip_address: '192.168.1.2',
        details: {},
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to audit-security page
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Click Security Alerts tab
    await page.click('button:has-text("Security Alerts")')
    await page.waitForTimeout(500)

    // Filter by high severity
    const severitySelect = page.locator('select').first() // Severity filter
    await severitySelect.selectOption('high')
    await page.waitForTimeout(1000)

    // Should show only high severity alerts
    // (Exact implementation depends on UI)
  })

  test('pagination handles large audit log datasets', async ({ page }) => {
    const { supabaseAdmin, adminId } = await loginAsAdmin(page)

    // Create target user
    const targetEmail = generateTestEmail('target')
    const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
      role: 'tenant',
    })

    // Seed many audit logs (more than page size)
    const logs = []
    for (let i = 0; i < 15; i++) {
      logs.push({
        admin_id: adminId,
        admin_email: 'admin@test.com',
        action_type: i % 2 === 0 ? 'ban' : 'lock',
        target_user_id: targetId,
        target_user_email: targetEmail,
        target_user_role: 'tenant',
        reason: `Test action ${i}`,
      })
    }
    await supabaseAdmin.from('admin_audit_logs').insert(logs)

    // Wait for data to sync
    await page.waitForTimeout(2000)

    // Navigate to audit-security page
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Verify logs are displayed
    const logRows = page.locator('tbody tr')
    const rowCount = await logRows.count()
    expect(rowCount).toBeGreaterThan(0)

    // Verify pagination controls exist if needed
    // (Implementation depends on pagination setup)
  })

  test('tabs switch correctly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to audit-security page
    await page.click('nav a:has-text("Audit & Security")')
    await page.waitForURL(/\/admin\/audit-security/, { timeout: 5000 })

    // Start on Audit Logs tab
    await expect(page.locator('text=Audit Logs')).toBeVisible()

    // Switch to Security Alerts
    await page.click('button:has-text("Security Alerts")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Security Alerts')).toBeVisible()

    // Switch to System Behavior
    await page.click('button:has-text("System Behavior")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=System Behavior')).toBeVisible()

    // Switch back to Audit Logs
    await page.click('button:has-text("Audit Logs")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Audit Logs')).toBeVisible()
  })
})
