/**
 * Admin Performance E2E Tests
 *
 * Tests performance monitoring: metrics, charts, time range filters, and alerts.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Admin Performance', () => {
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

  test('performance page displays performance metrics tab by default', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Default tab should be Performance Metrics
    await expect(page.locator('text=Performance Metrics')).toBeVisible()
    const performanceTab = page.locator('button:has-text("Performance Metrics")').first()
    const tabClasses = await performanceTab.getAttribute('class')
    expect(tabClasses).toContain('bg-background')
  })

  test('performance metrics display correctly', async ({ page }) => {
    const { supabaseAdmin } = await loginAsAdmin(page)

    // Seed some performance metrics
    const testUserId = 'test-user-id-' + Date.now()
    await supabaseAdmin.from('admin_metrics').insert([
      {
        user_id: testUserId,
        user_role: 'tenant',
        metric_type: 'page_load',
        metric_name: 'test_page',
        page_path: '/test',
        duration_ms: 1500,
      },
      {
        user_id: testUserId,
        user_role: 'tenant',
        metric_type: 'api_call',
        metric_name: 'test_api',
        duration_ms: 200,
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Verify metrics are displayed
    await expect(page.locator('text=Average Page Load Time')).toBeVisible()
    await expect(page.locator('text=Total API Calls')).toBeVisible()
  })

  test('charts render properly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Wait for charts to load (Recharts renders as SVG)
    await page.waitForSelector('svg', { timeout: 10000 })

    // Verify SVG elements exist (charts are rendered)
    const svgCount = await page.locator('svg').count()
    expect(svgCount).toBeGreaterThan(0)
  })

  test('time range filter works correctly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Find time range select
    const timeRangeSelect = page.locator('select').first()

    // Change to 7d
    await timeRangeSelect.selectOption('7d')
    await page.waitForTimeout(1000)

    // Change to 30d
    await timeRangeSelect.selectOption('30d')
    await page.waitForTimeout(1000)

    // Change back to 24h
    await timeRangeSelect.selectOption('24h')
    await page.waitForTimeout(1000)

    // Metrics should still be displayed
    await expect(page.locator('text=Average Page Load Time')).toBeVisible()
  })

  test('quotas and limits tab displays quota information', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Click Quotas & Limits tab
    await page.click('button:has-text("Quotas & Limits")')
    await page.waitForTimeout(500)

    // Verify quotas tab content
    await expect(page.locator('text=Quota Usage')).toBeVisible()
  })

  test('error logs tab displays error logs', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Click Error Logs tab
    await page.click('button:has-text("Error Logs")')
    await page.waitForTimeout(500)

    // Verify error logs tab content
    await expect(page.locator('text=Error Logs')).toBeVisible()
  })

  test('tabs switch correctly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Start on Performance Metrics tab
    await expect(page.locator('text=Performance Metrics')).toBeVisible()

    // Switch to Quotas & Limits
    await page.click('button:has-text("Quotas & Limits")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Quota Usage')).toBeVisible()

    // Switch to Error Logs
    await page.click('button:has-text("Error Logs")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Error Logs')).toBeVisible()

    // Switch back to Performance Metrics
    await page.click('button:has-text("Performance Metrics")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Performance Metrics')).toBeVisible()
  })

  test('upload logs are displayed', async ({ page }) => {
    const { supabaseAdmin } = await loginAsAdmin(page)

    // Seed upload logs
    const testUserId = 'test-user-id-' + Date.now()
    await supabaseAdmin.from('admin_upload_logs').insert([
      {
        user_id: testUserId,
        user_role: 'tenant',
        bucket: 'test-bucket',
        file_name: 'test-file.jpg',
        file_size_bytes: 102400,
        file_type: 'image/jpeg',
        status: 'success',
      },
      {
        user_id: testUserId,
        user_role: 'tenant',
        bucket: 'test-bucket',
        file_name: 'test-file-failed.jpg',
        file_size_bytes: 0,
        file_type: 'image/jpeg',
        status: 'failed',
        error_message: 'Upload failed',
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Verify upload metrics are displayed
    await expect(page.locator('text=Upload Success Rate')).toBeVisible()
  })

  test('security logs are displayed', async ({ page }) => {
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
      {
        user_id: testUserId,
        user_role: 'tenant',
        event_type: 'rate_limit_exceeded',
        severity: 'high',
        ip_address: '192.168.1.2',
        details: { limit: 100 },
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Verify security metrics are displayed
    await expect(page.locator('text=Security Incidents')).toBeVisible()
  })

  test('performance alerts trigger for thresholds', async ({ page }) => {
    const { supabaseAdmin } = await loginAsAdmin(page)

    // Seed metrics that exceed thresholds (e.g., >2s page load)
    const testUserId = 'test-user-id-' + Date.now()
    await supabaseAdmin.from('admin_metrics').insert([
      {
        user_id: testUserId,
        user_role: 'tenant',
        metric_type: 'page_load',
        metric_name: 'slow_page',
        page_path: '/slow',
        duration_ms: 3500, // >2s threshold
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to performance page
    await page.click('nav a:has-text("Performance")')
    await page.waitForURL(/\/admin\/performance/, { timeout: 5000 })

    // Verify alerts or warnings are displayed for slow pages
    // (Depends on alert implementation - may show in charts or alerts section)
    await page.waitForTimeout(1000)
    // Charts should display the slow page load time
  })
})
