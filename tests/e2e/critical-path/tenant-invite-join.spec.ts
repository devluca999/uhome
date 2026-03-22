/**
 * Tenant Invite & Join E2E Tests
 *
 * Tests the full invite flow: landlord creates invite, tenant signs up
 * and accepts, lease activates, DB state is consistent.
 */

import { test, expect, type BrowserContext } from '@playwright/test'
import { type SeededData } from '../../helpers/seed'
import { getSupabaseAdminClient, cleanupTestUser } from '../../helpers/db-helpers'
import {
  generateTestEmail,
  createAndConfirmUser,
  loginAsLandlord,
  loginAsTenant,
} from '../../helpers/auth-helpers'

const PASSWORD = 'TestPassword123!'

test.describe('Tenant Invite & Join', () => {
  let landlordUserId: string
  let landlordEmail: string
  let tenantUserId: string | null = null
  let propertyId: string

  test.beforeEach(async () => {
    const admin = getSupabaseAdminClient()

    // Create landlord
    landlordEmail = generateTestEmail('invite-landlord')
    const { userId } = await createAndConfirmUser(landlordEmail, PASSWORD)
    landlordUserId = userId

    await admin.from('users').upsert({
      id: landlordUserId,
      email: landlordEmail,
      role: 'landlord',
    })

    // Create property via DB
    const { data: property, error } = await admin
      .from('properties')
      .insert({
        owner_id: landlordUserId,
        name: 'Invite Test Property',
        address: '42 Invite Way',
        rent_amount: 1800,
        rent_due_date: 1,
      })
      .select()
      .single()

    if (error) throw error
    propertyId = property.id
  })

  test.afterEach(async () => {
    if (landlordUserId) await cleanupTestUser(landlordUserId)
    if (tenantUserId) await cleanupTestUser(tenantUserId)
  })

  test('landlord invites tenant, tenant accepts, lease activates', async ({ page, context }) => {
    const admin = getSupabaseAdminClient()
    const tenantEmail = generateTestEmail('invite-tenant')

    // --- Landlord: navigate to property detail → tenants tab → invite ---
    await loginAsLandlord(page, landlordEmail, PASSWORD)
    await page.goto(`/landlord/properties/${propertyId}?tab=tenants`)
    await page.waitForLoadState('networkidle')

    // Click "Invite Tenant"
    await page.click('button:has-text("Invite Tenant")')
    await page.waitForTimeout(1000)

    // Fill invite form (fields from tenant-invite-form.tsx)
    await page.fill('#email', tenantEmail)

    // Submit invite
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // --- Verify invite row in DB with token and expires_at ---
    const { data: invite, error: inviteError } = await admin
      .from('tenant_invites')
      .select('*')
      .eq('email', tenantEmail)
      .eq('property_id', propertyId)
      .single()

    expect(inviteError).toBeNull()
    expect(invite).toBeTruthy()
    expect(invite!.token).toBeTruthy()
    expect(invite!.expires_at).toBeTruthy()
    expect(new Date(invite!.expires_at).getTime()).toBeGreaterThan(Date.now())

    // Invite should have created a draft lease
    const leaseId = invite!.lease_id
    expect(leaseId).toBeTruthy()

    // --- Tenant: sign up and accept invite ---
    // Create tenant user via helper (proper password hashing + confirmation)
    const { userId: newTenantUserId } = await createAndConfirmUser(tenantEmail, PASSWORD)
    tenantUserId = newTenantUserId

    // Set tenant role in users table
    await admin.from('users').upsert({
      id: tenantUserId,
      email: tenantEmail,
      role: 'tenant',
    })

    // Open accept-invite page in a new browser context (fresh session)
    const tenantContext: BrowserContext = await page.context().browser()!.newContext()
    const tenantPage = await tenantContext.newPage()

    // Login as tenant first
    await loginAsTenant(tenantPage, tenantEmail, PASSWORD)

    // Navigate to accept-invite URL
    await tenantPage.goto(`/accept-invite?token=${invite!.token}`)
    await tenantPage.waitForLoadState('networkidle')

    // Click "Accept Invitation"
    const acceptBtn = tenantPage.locator('button:has-text("Accept Invitation")')
    await expect(acceptBtn).toBeVisible({ timeout: 10000 })
    await acceptBtn.click()

    // Wait for acceptance to complete (redirects to tenant dashboard)
    await tenantPage.waitForURL(/\/tenant\/dashboard/, { timeout: 15000 })

    // --- Verify DB state after acceptance ---

    // 1. Lease should be activated
    const { data: lease } = await admin
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .single()

    expect(lease).toBeTruthy()
    expect(lease!.status).toBe('active')
    expect(lease!.tenant_id).toBeTruthy()

    // 2. Invite accepted_at should be set
    const { data: updatedInvite } = await admin
      .from('tenant_invites')
      .select('accepted_at')
      .eq('id', invite!.id)
      .single()

    expect(updatedInvite!.accepted_at).toBeTruthy()

    // 3. Tenant row should exist
    const { data: tenantRow } = await admin
      .from('tenants')
      .select('*')
      .eq('user_id', tenantUserId)
      .single()

    expect(tenantRow).toBeTruthy()

    // 4. Tenant dashboard should show the property name
    await tenantPage.waitForLoadState('networkidle')
    await expect(
      tenantPage.locator('text=Invite Test Property')
    ).toBeVisible({ timeout: 10000 })

    // --- Refresh and verify state persists ---
    await tenantPage.reload()
    await tenantPage.waitForLoadState('networkidle')

    await expect(
      tenantPage.locator('text=Invite Test Property')
    ).toBeVisible({ timeout: 10000 })

    await tenantContext.close()
  })
})
