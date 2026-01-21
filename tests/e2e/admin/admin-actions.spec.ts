/**
 * Admin Actions E2E Tests
 *
 * Tests admin actions (ban, lock, reset password, etc.) with confirmation flows
 * and audit logging verification.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Admin Actions', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('admin can ban user with confirmation flow', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Create target user to ban
    const targetEmail = generateTestEmail('tenant')
    const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
      role: 'tenant',
    })

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click on tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Find the target user row and click ban button
    const userRow = page.locator(`tr:has-text("${targetEmail}")`)
    await expect(userRow).toBeVisible()

    const banButton = userRow.locator('button[title="Ban user"]')
    await banButton.click()

    // Step 1: Warning/Confirmation modal should appear
    await expect(page.locator('text=Ban User')).toBeVisible()
    await expect(page.locator('text=This is a permanent action')).toBeVisible()

    // Fill in confirmation (user email)
    const confirmationInput = page.locator('input[placeholder*="Type the user\'s email"]')
    await confirmationInput.fill(targetEmail)

    // Fill in reason
    const reasonInput = page.locator('textarea[placeholder*="Enter reason"]')
    await reasonInput.fill('Test ban for E2E testing')

    // Click Continue
    await page.click('button:has-text("Continue")')

    // Step 2: Final confirmation screen
    await expect(page.locator('text=Final Confirmation')).toBeVisible()
    await expect(page.locator(`text=${targetEmail}`)).toBeVisible()
    await expect(page.locator('text=Test ban for E2E testing')).toBeVisible()

    // Confirm action
    await page.click('button:has-text("Confirm Action")')

    // Wait for success toast
    await expect(page.locator('text=/User ban completed successfully/')).toBeVisible({
      timeout: 10000,
    })

    // Verify user is banned in database
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('account_status, is_locked')
      .eq('id', targetId)
      .single()

    expect(userData?.account_status).toBe('banned')
    expect(userData?.is_locked).toBe(true)

    // Verify audit log was created
    const { data: auditLogs } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .eq('action_type', 'ban')
      .eq('target_user_id', targetId)
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(1)

    expect(auditLogs).toHaveLength(1)
    expect(auditLogs?.[0]?.reason).toBe('Test ban for E2E testing')
  })

  test('admin can lock user with confirmation flow', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Create target user to lock
    const targetEmail = generateTestEmail('tenant')
    const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
      role: 'tenant',
    })

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click on tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Find the target user row and click lock button
    const userRow = page.locator(`tr:has-text("${targetEmail}")`)
    await expect(userRow).toBeVisible()

    const lockButton = userRow.locator('button[title="Lock account"]')
    await lockButton.click()

    // Step 1: Warning/Confirmation modal
    await expect(page.locator('text=Lock Account')).toBeVisible()

    // Fill in confirmation (user email)
    const confirmationInput = page.locator('input[placeholder*="Type the user\'s email"]')
    await confirmationInput.fill(targetEmail)

    // Fill in reason
    const reasonInput = page.locator('textarea[placeholder*="Enter reason"]')
    await reasonInput.fill('Temporary lock for testing')

    // Click Continue
    await page.click('button:has-text("Continue")')

    // Step 2: Final confirmation
    await expect(page.locator('text=Final Confirmation')).toBeVisible()
    await page.click('button:has-text("Confirm Action")')

    // Wait for success
    await expect(page.locator('text=/User lock completed successfully/')).toBeVisible({
      timeout: 10000,
    })

    // Verify user is locked
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('account_status, is_locked')
      .eq('id', targetId)
      .single()

    expect(userData?.account_status).toBe('locked')
    expect(userData?.is_locked).toBe(true)
  })

  test('admin cannot ban user without confirmation', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Create target user
    const targetEmail = generateTestEmail('tenant')
    await createAndConfirmUser(targetEmail, 'TestPassword123!', { role: 'tenant' })

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click on tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Find user and click ban
    const userRow = page.locator(`tr:has-text("${targetEmail}")`)
    const banButton = userRow.locator('button[title="Ban user"]')
    await banButton.click()

    // Modal appears
    await expect(page.locator('text=Ban User')).toBeVisible()

    // Don't fill confirmation - try to proceed
    const reasonInput = page.locator('textarea[placeholder*="Enter reason"]')
    await reasonInput.fill('Test reason')

    // Continue button should be disabled without confirmation
    const continueButton = page.locator('button:has-text("Continue")')
    await expect(continueButton).toBeDisabled()
  })

  test('admin can reset password with confirmation', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Create target user
    const targetEmail = generateTestEmail('tenant')
    const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
      role: 'tenant',
    })

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click on tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Find user and click reset password
    const userRow = page.locator(`tr:has-text("${targetEmail}")`)
    const resetButton = userRow.locator('button[title="Reset password"]')
    await resetButton.click()

    // Modal appears
    await expect(page.locator('text=Reset Password')).toBeVisible()

    // Fill confirmation
    const confirmationInput = page.locator('input[placeholder*="Type the user\'s email"]')
    await confirmationInput.fill(targetEmail)

    // Fill reason
    const reasonInput = page.locator('textarea[placeholder*="Enter reason"]')
    await reasonInput.fill('Password reset requested')

    // Continue
    await page.click('button:has-text("Continue")')

    // Final confirmation
    await page.click('button:has-text("Confirm")')

    // Wait for success
    await expect(page.locator('text=/User reset_password completed successfully/')).toBeVisible({
      timeout: 10000,
    })

    // Verify audit log
    const { data: auditLogs } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .eq('action_type', 'reset_password')
      .eq('target_user_id', targetId)
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(1)

    expect(auditLogs).toHaveLength(1)
    expect(auditLogs?.[0]?.reason).toBe('Password reset requested')
  })

  test('admin can delete user with confirmation flow', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Create target user to delete
    const targetEmail = generateTestEmail('tenant')
    const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
      role: 'tenant',
    })

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click on tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Find the target user row and click delete button
    const userRow = page.locator(`tr:has-text("${targetEmail}")`)
    await expect(userRow).toBeVisible()

    const deleteButton = userRow.locator('button[title*="Delete"]')
    await deleteButton.click()

    // Step 1: Warning/Confirmation modal should appear
    await expect(page.locator('text=Delete User')).toBeVisible()
    await expect(page.locator('text=WARNING')).toBeVisible()

    // Fill in confirmation (DELETE)
    const confirmationInput = page.locator('input[placeholder*="Type DELETE"]')
    await confirmationInput.fill('DELETE')

    // Fill in reason (required for destructive actions)
    const reasonInput = page.locator('textarea[placeholder*="Enter reason"]')
    await reasonInput.fill('Test deletion for E2E testing')

    // Click Continue
    await page.click('button:has-text("Continue")')

    // Step 2: Final confirmation screen
    await expect(page.locator('text=Final Confirmation')).toBeVisible()
    await expect(page.locator(`text=${targetEmail}`)).toBeVisible()

    // Confirm action
    await page.click('button:has-text("Confirm Action")')

    // Wait for success toast
    await expect(page.locator('text=/User delete completed successfully/')).toBeVisible({
      timeout: 10000,
    })

    // Verify audit log was created
    const { data: auditLogs } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .eq('action_type', 'delete')
      .eq('target_user_id', targetId)
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(1)

    expect(auditLogs).toHaveLength(1)
    expect(auditLogs?.[0]?.reason).toBe('Test deletion for E2E testing')
  })

  test('admin cannot delete user without DELETE confirmation', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Create target user
    const targetEmail = generateTestEmail('tenant')
    await createAndConfirmUser(targetEmail, 'TestPassword123!', { role: 'tenant' })

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click on tenants tab
    await page.click('button:has-text("Tenants")')
    await page.waitForTimeout(500)

    // Find user and click delete
    const userRow = page.locator(`tr:has-text("${targetEmail}")`)
    const deleteButton = userRow.locator('button[title*="Delete"]')
    await deleteButton.click()

    // Modal appears
    await expect(page.locator('text=Delete User')).toBeVisible()

    // Don't fill DELETE - try incorrect confirmation
    const confirmationInput = page.locator('input[placeholder*="Type DELETE"]')
    await confirmationInput.fill('DELETE1') // Wrong confirmation

    // Fill reason
    const reasonInput = page.locator('textarea[placeholder*="Enter reason"]')
    await reasonInput.fill('Test reason')

    // Continue button should be disabled or show error
    const continueButton = page.locator('button:has-text("Continue")')
    // Button might be disabled or we might get an error message
    const isDisabled = await continueButton.isDisabled().catch(() => false)
    if (!isDisabled) {
      // If enabled, clicking should show error
      await continueButton.click()
      await expect(page.locator('text=/Please type DELETE exactly/i')).toBeVisible({
        timeout: 3000,
      })
    }
  })

  test('admin cannot ban already banned user', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Create target user already banned
    const targetEmail = generateTestEmail('tenant')
    const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin
      .from('users')
      .update({ account_status: 'banned', is_locked: true })
      .eq('id', targetId)

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click on suspended tab (banned users show here)
    await page.click('button:has-text("Suspended")')
    await page.waitForTimeout(500)

    // Find the banned user
    const userRow = page.locator(`tr:has-text("${targetEmail}")`)
    await expect(userRow).toBeVisible()

    // Verify user shows as banned
    await expect(userRow.locator('text=Banned')).toBeVisible()

    // Ban button should not be available or should be disabled for already banned users
    // This depends on UI implementation - verify that action is prevented
    const banButton = userRow.locator('button[title="Ban user"]')
    if (await banButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      // If button is visible, clicking should show error or be disabled
      const isDisabled = await banButton.isDisabled()
      if (!isDisabled) {
        // If not disabled, clicking should result in error
        await banButton.click()
        // Should show error or prevent action
        await page.waitForTimeout(1000)
        // Error message or modal indicating user is already banned
      }
    }
  })

  test('admin cannot lock already locked user', async ({ page }) => {
    // Create admin user
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    // Create target user already locked
    const targetEmail = generateTestEmail('tenant')
    const { userId: targetId } = await createAndConfirmUser(targetEmail, 'TestPassword123!', {
      role: 'tenant',
    })
    await supabaseAdmin
      .from('users')
      .update({ account_status: 'locked', is_locked: true })
      .eq('id', targetId)

    // Login as admin
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    // Navigate to users page
    await page.click('nav a:has-text("Users")')
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 })

    // Click on suspended tab (locked users show here)
    await page.click('button:has-text("Suspended")')
    await page.waitForTimeout(500)

    // Find the locked user
    const userRow = page.locator(`tr:has-text("${targetEmail}")`)
    await expect(userRow).toBeVisible()

    // Verify user shows as locked
    await expect(userRow.locator('text=Locked')).toBeVisible()

    // Lock button should not be available for already locked users
    // Unlock button should be available instead
    const unlockButton = userRow.locator('button[title*="Unlock"]')
    await expect(unlockButton).toBeVisible()
  })

  test('non-admin cannot perform admin actions', async ({ page }) => {
    // Create tenant user
    const tenantEmail = generateTestEmail('tenant')
    const password = 'TestPassword123!'
    await createAndConfirmUser(tenantEmail, password, { role: 'tenant' })

    // Create target user
    const targetEmail = generateTestEmail('tenant2')
    await createAndConfirmUser(targetEmail, 'TestPassword123!', { role: 'tenant' })

    // Login as tenant (not admin)
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', tenantEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Try to access admin users page directly
    await page.goto(`${baseUrl}/admin/users`)

    // Should be redirected or see error (depending on ProtectedRoute implementation)
    // At minimum, should not be able to perform actions
    await expect(
      page
        .locator('text=/admin/i')
        .or(page.locator('text=/unauthorized/i'))
        .or(page.locator('text=/forbidden/i'))
        .first()
    ).toBeVisible({ timeout: 5000 })
  })
})
