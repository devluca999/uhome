/**
 * Smoke Tests - Critical Path Only
 *
 * These are the absolute must-pass tests that verify core functionality.
 * Run before every commit: npm run test:smoke
 *
 * Prerequisites: `.env.test` with valid Supabase URL/keys, and a reachable project
 * (local `npx supabase start` or staging). "fetch failed" on signup means the test
 * runner cannot reach `VITE_SUPABASE_URL`.
 *
 * Expected runtime: 2-5 minutes
 * Target: 100% pass rate always
 */

import { test, expect } from '@playwright/test'
import { loginAsLandlord, generateTestEmail, createAndConfirmUser } from '../helpers/auth-helpers'
import { getSupabaseAdminClient, cleanupTestUser } from '../helpers/db-helpers'

const PASSWORD = 'TestPassword123!'

test.describe('Smoke Tests - Must Pass Always', () => {
  test('landlord can login and see dashboard', async ({ page }) => {
    const email = generateTestEmail('smoke-landlord')
    const { userId } = await createAndConfirmUser(email, PASSWORD)
    
    try {
      const admin = getSupabaseAdminClient()
      await admin.from('users').upsert({
        id: userId,
        email,
        role: 'landlord',
      })

      await loginAsLandlord(page, email, PASSWORD)
      
      // Should land on dashboard
      await expect(page).toHaveURL(/\/landlord\/dashboard/)
      
      // Should see key dashboard elements
      await expect(page.getByText('Dashboard')).toBeVisible()
      await expect(page.getByText('Properties')).toBeVisible()
      await expect(page.getByText('Tenants')).toBeVisible()
      
    } finally {
      await cleanupTestUser(userId)
    }
  })

  test('tenant invite acceptance flow works', async ({ page }) => {
    // This is your newly fixed critical flow
    const landlordEmail = generateTestEmail('smoke-ll')
    const tenantEmail = generateTestEmail('smoke-tenant')
    
    const { userId: landlordId } = await createAndConfirmUser(landlordEmail, PASSWORD)
    let tenantId: string | null = null
    
    try {
      const admin = getSupabaseAdminClient()
      
      await admin.from('users').upsert({
        id: landlordId,
        email: landlordEmail,
        role: 'landlord',
      })

      // Create property
      const { data: property } = await admin
        .from('properties')
        .insert({
          owner_id: landlordId,
          name: 'Smoke Test Property',
          address: '123 Smoke St',
          rent_amount: 1000,
          rent_due_date: 1,
        })
        .select()
        .single()

      // Draft lease + invite (matches app: lease_id required on tenant_invites)
      const { data: draftLease, error: leaseErr } = await admin
        .from('leases')
        .insert({
          property_id: property!.id,
          tenant_id: null,
          status: 'draft',
          lease_type: 'long-term',
          rent_amount: property!.rent_amount ?? 1000,
          rent_frequency: 'monthly',
        })
        .select('id')
        .single()

      if (leaseErr) throw leaseErr

      const token = crypto.randomUUID()
      const { error: inviteErr } = await admin.from('tenant_invites').insert({
        created_by: landlordId,
        property_id: property!.id,
        lease_id: draftLease!.id,
        email: tenantEmail,
        token,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      if (inviteErr) throw inviteErr

      // Accept invite (cold start)
      await page.goto(`/accept-invite?token=${token}`)
      await page.waitForLoadState('domcontentloaded')

      // Should prompt to sign up
      await expect(page.getByRole('link', { name: 'Sign Up First' })).toBeVisible()
      await page.getByRole('link', { name: 'Sign Up First' }).click()

      // Sign up
      await page.waitForURL(/\/signup\?invite=true/)
      await page.locator('#email').fill(tenantEmail)
      await page.locator('#password').fill(PASSWORD)
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should auto-redirect to accept invite
      await page.waitForURL(/\/accept-invite\?token=/, { timeout: 20000 })
      
      // Accept invitation
      const acceptBtn = page.getByRole('button', { name: 'Accept Invitation' })
      await expect(acceptBtn).toBeVisible({ timeout: 15000 })
      await acceptBtn.click()

      // Should land on tenant dashboard
      await page.waitForURL(/\/tenant\/dashboard/, { timeout: 20000 })
      await expect(page.getByText('Dashboard')).toBeVisible()
      
      // Get tenant ID for cleanup
      const { data: tenantUser } = await admin
        .from('users')
        .select('id')
        .eq('email', tenantEmail)
        .single()
      
      tenantId = tenantUser?.id || null
      
    } finally {
      await cleanupTestUser(landlordId)
      if (tenantId) await cleanupTestUser(tenantId)
    }
  })

  test('notifications page routing works', async ({ page }) => {
    const email = generateTestEmail('smoke-notif')
    const { userId } = await createAndConfirmUser(email, PASSWORD)
    
    try {
      const admin = getSupabaseAdminClient()
      await admin.from('users').upsert({
        id: userId,
        email,
        role: 'landlord',
      })

      await loginAsLandlord(page, email, PASSWORD)
      
      // Click notification bell (see NotificationDropdown aria-label)
      await page.getByRole('button', { name: /^Notifications$|unread notifications/i }).click()

      // Dropdown should appear
      await expect(page.getByText(/Notifications/i).first()).toBeVisible()

      // "View all notifications" is a Link, not a Button
      await page.getByRole('link', { name: /view all notifications/i }).click()
      
      // Should navigate to notifications page
      await expect(page).toHaveURL(/\/landlord\/notifications/)
      await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible()
      
    } finally {
      await cleanupTestUser(userId)
    }
  })
})
