/**
 * Tenant invite cold start: unauthenticated user opens accept-invite, signs up,
 * resumes on accept-invite, then accepts (pending_invite_token resume path).
 */

import { test, expect, type BrowserContext } from '@playwright/test'
import { getSupabaseAdminClient, cleanupTestUser } from '../../helpers/db-helpers'
import {
  generateTestEmail,
  createAndConfirmUser,
  loginAsLandlord,
} from '../../helpers/auth-helpers'

const PASSWORD = 'TestPassword123!'

test.describe('Tenant invite cold signup', () => {
  let landlordUserId: string
  let landlordEmail: string
  let tenantEmail: string
  let tenantUserId: string | null = null
  let propertyId: string

  test.beforeEach(async () => {
    const admin = getSupabaseAdminClient()
    landlordEmail = generateTestEmail('cold-invite-landlord')
    const { userId } = await createAndConfirmUser(landlordEmail, PASSWORD)
    landlordUserId = userId

    await admin.from('users').upsert({
      id: landlordUserId,
      email: landlordEmail,
      role: 'landlord',
    })

    const { data: property, error } = await admin
      .from('properties')
      .insert({
        owner_id: landlordUserId,
        name: 'Cold Invite Property',
        address: '99 Cold Start Ln',
        rent_amount: 1600,
        rent_due_date: 1,
      })
      .select()
      .single()

    if (error) throw error
    propertyId = property.id
    tenantEmail = generateTestEmail('cold-invite-tenant')
  })

  test.afterEach(async () => {
    if (landlordUserId) await cleanupTestUser(landlordUserId)
    if (tenantUserId) await cleanupTestUser(tenantUserId)
  })

  test('logged-out accept-invite → signup → accept lease', async ({ page, context }) => {
    const admin = getSupabaseAdminClient()

    await loginAsLandlord(page, landlordEmail, PASSWORD)
    await page.goto(`/landlord/properties/${propertyId}?tab=tenants`)
    await page.waitForLoadState('domcontentloaded')

    await page.getByRole('button', { name: 'Invite Tenant' }).click()
    await page.waitForTimeout(500)

    await page.locator('#email').fill(tenantEmail)
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(2500)

    const { data: invite, error: inviteError } = await admin
      .from('tenant_invites')
      .select('*')
      .eq('email', tenantEmail)
      .eq('property_id', propertyId)
      .single()

    expect(inviteError).toBeNull()
    expect(invite?.token).toBeTruthy()
    const leaseId = invite!.lease_id as string

    const tenantContext: BrowserContext = await context.browser()!.newContext()
    const coldPage = await tenantContext.newPage()

    await coldPage.goto(`/accept-invite?token=${invite!.token}`)
    await coldPage.waitForLoadState('domcontentloaded')

    await expect(coldPage.getByRole('link', { name: 'Sign Up First' })).toBeVisible({
      timeout: 15000,
    })
    await coldPage.getByRole('link', { name: 'Sign Up First' }).click()

    await coldPage.waitForURL(/\/signup\?invite=true/, { timeout: 10000 })

    await coldPage.locator('#email').fill(tenantEmail)
    await coldPage.locator('#password').fill(PASSWORD)
    await coldPage.getByRole('button', { name: 'Create Account' }).click()

    await coldPage.waitForURL(/\/accept-invite\?token=/, { timeout: 20000 })

    const acceptBtn = coldPage.getByRole('button', { name: 'Accept Invitation' })
    await expect(acceptBtn).toBeVisible({ timeout: 15000 })
    await acceptBtn.click()

    await coldPage.waitForURL(/\/tenant\/dashboard/, { timeout: 20000 })

    const { data: userRow } = await admin.from('users').select('id').eq('email', tenantEmail).single()
    expect(userRow?.id).toBeTruthy()
    tenantUserId = userRow!.id

    const { data: lease } = await admin.from('leases').select('*').eq('id', leaseId).single()
    expect(lease?.status).toBe('active')
    expect(lease?.tenant_id).toBeTruthy()

    await tenantContext.close()
  })
})
