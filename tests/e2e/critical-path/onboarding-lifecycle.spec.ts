/**
 * Onboarding Lifecycle E2E Tests
 *
 * Tests the full onboarding flow: landlord creates template,
 * tenant invite auto-creates submission, tenant fills and submits,
 * landlord receives notification, reminder banner disappears.
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

test.describe('Onboarding Lifecycle', () => {
  let landlordUserId: string
  let landlordEmail: string
  let tenantUserId: string | null = null
  let propertyId: string
  let templateId: string

  test.beforeEach(async () => {
    const admin = getSupabaseAdminClient()

    // Create landlord
    landlordEmail = generateTestEmail('onboard-landlord')
    const { userId } = await createAndConfirmUser(landlordEmail, PASSWORD)
    landlordUserId = userId

    await admin.from('users').upsert({
      id: landlordUserId,
      email: landlordEmail,
      role: 'landlord',
    })

    // Create property
    const { data: property, error: propError } = await admin
      .from('properties')
      .insert({
        owner_id: landlordUserId,
        name: 'Onboarding Test Property',
        address: '10 Onboard Lane',
        rent_amount: 1600,
        rent_due_date: 1,
      })
      .select()
      .single()

    if (propError) throw propError
    propertyId = property.id

    // Create onboarding template via admin client
    const { data: template, error: tmplError } = await admin
      .from('onboarding_templates')
      .insert({
        property_id: propertyId,
        title: 'Move-In Checklist',
        is_active: true,
        created_by: landlordUserId,
        fields: [
          { name: 'emergency_contact', label: 'Emergency Contact Name', type: 'text', required: true },
          { name: 'emergency_phone', label: 'Emergency Contact Phone', type: 'text', required: true },
          { name: 'vehicle_info', label: 'Vehicle Info (make/model/plate)', type: 'text', required: false },
          { name: 'move_in_date', label: 'Preferred Move-In Date', type: 'date', required: true },
          { name: 'agree_rules', label: 'I agree to the house rules', type: 'checkbox', required: true },
        ],
      })
      .select()
      .single()

    if (tmplError) throw tmplError
    templateId = template.id
  })

  test.afterEach(async () => {
    if (landlordUserId) await cleanupTestUser(landlordUserId)
    if (tenantUserId) await cleanupTestUser(tenantUserId)
  })

  test('full onboarding flow: invite → accept → fill → submit → notification → no banner', async ({
    page,
    context,
  }) => {
    const admin = getSupabaseAdminClient()
    const tenantEmail = generateTestEmail('onboard-tenant')

    // === Step 1: Landlord creates tenant invite ===
    await loginAsLandlord(page, landlordEmail, PASSWORD)
    await page.goto(`/landlord/properties/${propertyId}?tab=tenants`)
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Invite Tenant")')
    await page.waitForTimeout(1000)

    await page.fill('#email', tenantEmail)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // Get invite from DB
    const { data: invite } = await admin
      .from('tenant_invites')
      .select('*')
      .eq('email', tenantEmail)
      .eq('property_id', propertyId)
      .single()

    expect(invite).toBeTruthy()
    expect(invite!.token).toBeTruthy()

    // === Step 2: Create tenant user and accept invite ===
    const { userId: newTenantUserId } = await createAndConfirmUser(tenantEmail, PASSWORD)
    tenantUserId = newTenantUserId

    await admin.from('users').upsert({
      id: tenantUserId,
      email: tenantEmail,
      role: 'tenant',
    })

    // Accept invite in a new context
    const tenantContext: BrowserContext = await page.context().browser()!.newContext()
    const tenantPage = await tenantContext.newPage()

    await loginAsTenant(tenantPage, tenantEmail, PASSWORD)
    await tenantPage.goto(`/accept-invite?token=${invite!.token}`)
    await tenantPage.waitForLoadState('networkidle')

    const acceptBtn = tenantPage.locator('button:has-text("Accept Invitation")')
    await expect(acceptBtn).toBeVisible({ timeout: 10000 })
    await acceptBtn.click()

    await tenantPage.waitForURL(/\/tenant\/dashboard/, { timeout: 15000 })
    await tenantPage.waitForLoadState('networkidle')

    // === Step 3: Verify onboarding_submissions row created with status='not_started' ===
    // The accept-invite flow auto-creates a submission when template exists
    const { data: tenantRow } = await admin
      .from('tenants')
      .select('id')
      .eq('user_id', tenantUserId)
      .single()

    expect(tenantRow).toBeTruthy()

    const { data: submission } = await admin
      .from('onboarding_submissions')
      .select('*')
      .eq('tenant_id', tenantRow!.id)
      .eq('template_id', templateId)
      .single()

    expect(submission).toBeTruthy()
    expect(submission!.status).toBe('not_started')

    // === Step 4: Verify modal auto-opens on tenant dashboard ===
    // The tenant dashboard auto-opens onboarding modal when status = 'not_started'
    await expect(tenantPage.locator('text=Move-In Checklist')).toBeVisible({ timeout: 10000 })

    // === Step 5: Fill all required fields and submit ===
    // Fields: emergency_contact (text), emergency_phone (text), move_in_date (date), agree_rules (checkbox)
    // vehicle_info is optional

    // Fill text fields by their label
    const emergencyContactInput = tenantPage
      .locator('label:has-text("Emergency Contact Name")')
      .locator('..')
      .locator('input')
    await emergencyContactInput.fill('Jane Doe')

    const emergencyPhoneInput = tenantPage
      .locator('label:has-text("Emergency Contact Phone")')
      .locator('..')
      .locator('input')
    await emergencyPhoneInput.fill('555-0199')

    const moveInDateInput = tenantPage
      .locator('label:has-text("Preferred Move-In Date")')
      .locator('..')
      .locator('input[type="date"]')
    await moveInDateInput.fill('2026-04-01')

    // Check the agreement checkbox
    const agreeCheckbox = tenantPage.locator('input[type="checkbox"]')
    await agreeCheckbox.check()

    await tenantPage.waitForTimeout(500)

    // Click "Submit Checklist"
    await tenantPage.click('button:has-text("Submit Checklist")')
    await tenantPage.waitForTimeout(3000)

    // Should show success state
    await expect(tenantPage.locator('text=Checklist Submitted')).toBeVisible({ timeout: 10000 })

    // === Step 6: Verify status='submitted' and submitted_at set in DB ===
    const { data: updatedSubmission } = await admin
      .from('onboarding_submissions')
      .select('*')
      .eq('id', submission!.id)
      .single()

    expect(updatedSubmission!.status).toBe('submitted')
    expect(updatedSubmission!.submitted_at).toBeTruthy()

    // === Step 7: Verify notification created for landlord ===
    const { data: notifications } = await admin
      .from('notifications')
      .select('*')
      .eq('user_id', landlordUserId)
      .eq('type', 'system')
      .ilike('title', '%Onboarding%')

    expect(notifications).toBeTruthy()
    expect(notifications!.length).toBeGreaterThanOrEqual(1)

    const onboardingNotif = notifications!.find(n =>
      n.message?.includes('Onboarding Test Property')
    )
    expect(onboardingNotif).toBeTruthy()

    // === Step 8: Verify reminder banner not visible after submission ===
    // Close the success modal (it auto-closes, but let's navigate away and back)
    await tenantPage.goto('/tenant/dashboard')
    await tenantPage.waitForLoadState('networkidle')

    // The OnboardingReminderBanner should NOT be visible since status is 'submitted'
    // (banner only shows for not_started, in_progress, reopened)
    const reminderBanner = tenantPage.locator('text=move-in checklist')
    // Allow time for data to load
    await tenantPage.waitForTimeout(2000)
    await expect(reminderBanner).not.toBeVisible({ timeout: 5000 })

    await tenantContext.close()
  })
})
