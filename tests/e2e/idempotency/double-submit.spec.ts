/**
 * Phase 4 Idempotency — Double-Submit Protection
 *
 * Verifies that rapid double-clicks on submit buttons do not create
 * duplicate rows in the database. Tests property creation, work order
 * submission, and onboarding submission.
 */

import { test, expect } from '@playwright/test'
import { seedTestScenario, type SeededData } from '../../helpers/seed'
import { getSupabaseAdminClient, cleanupTestUser } from '../../helpers/db-helpers'
import {
  generateTestEmail,
  loginAsLandlord,
  loginAsTenant,
  createAndConfirmUser,
} from '../../helpers/auth-helpers'

const PASSWORD = 'TestPassword123!'

test.describe('Double-Submit Idempotency', () => {
  const supabaseAdmin = getSupabaseAdminClient()

  test.describe('property creation double-click', () => {
    let landlordUserId: string
    let landlordEmail: string

    test.beforeEach(async () => {
      landlordEmail = generateTestEmail('landlord')
      const { userId } = await createAndConfirmUser(landlordEmail, PASSWORD)
      landlordUserId = userId

      await supabaseAdmin.from('users').upsert({
        id: landlordUserId,
        email: landlordEmail,
        role: 'landlord',
      })
    })

    test.afterEach(async () => {
      await cleanupTestUser(landlordUserId)
    })

    test('rapid double-click on add-property creates only 1 row', async ({ page }) => {
      await loginAsLandlord(page, landlordEmail, PASSWORD)
      await page.goto('/landlord/properties')
      await page.waitForLoadState('networkidle')

      // Open add property form
      const addBtn = page.locator('text=Add Property')
      await addBtn.click()
      await page.waitForTimeout(1000)

      // Fill form
      await page.fill('input[name="name"]', 'Double-Click Property')
      await page.fill('input[name="address"]', '1 Idempotent Way')
      await page.fill('input[name="rent_amount"]', '1200')

      // Rapid double-click submit
      const submitBtn = page.locator('button[type="submit"]')
      await Promise.all([
        submitBtn.click(),
        submitBtn.click({ delay: 50 }),
      ])

      // Wait for any network activity to settle
      await page.waitForTimeout(3000)

      // DB assertion: exactly 1 property with that name
      const { data: props } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('owner_id', landlordUserId)
        .eq('name', 'Double-Click Property')

      expect(props).toBeTruthy()
      expect(props!.length).toBe(1)
    })
  })

  test.describe('work order double-click', () => {
    let seeded: SeededData

    test.beforeEach(async () => {
      seeded = await seedTestScenario({
        propertyName: 'WO Idempotency Property',
        createWorkOrders: false,
      })
    })

    test.afterEach(async () => {
      if (seeded?.tenant) await cleanupTestUser(seeded.tenant.userId)
      if (seeded?.landlord) await cleanupTestUser(seeded.landlord.userId)
    })

    test('rapid double-click on work order submit creates only 1 row', async ({ page }) => {
      await loginAsTenant(page, seeded.tenant!.email, PASSWORD)
      await page.goto('/tenant/maintenance')
      await page.waitForLoadState('networkidle')

      // Open new work order form
      const newRequestBtn = page.locator('button:has-text("New Request"), button:has-text("Submit Request"), a:has-text("Submit Request")')
      await newRequestBtn.first().click()
      await page.waitForTimeout(1000)

      // Fill the maintenance request form
      const descriptionField = page.locator(
        'textarea[name="description"], textarea[placeholder*="escri"], textarea'
      ).first()
      await descriptionField.fill('Leaking faucet in kitchen - idempotency test')

      // Rapid double-click submit
      const submitBtn = page.locator('button[type="submit"]')
      await Promise.all([
        submitBtn.click(),
        submitBtn.click({ delay: 50 }),
      ])

      await page.waitForTimeout(3000)

      // DB assertion: exactly 1 maintenance_request matching the description
      const { data: requests } = await supabaseAdmin
        .from('maintenance_requests')
        .select('id')
        .eq('property_id', seeded.property!.id)
        .like('description', '%idempotency test%')

      expect(requests).toBeTruthy()
      expect(requests!.length).toBe(1)
    })
  })

  test.describe('onboarding double submit', () => {
    let seeded: SeededData
    let templateId: string

    test.beforeEach(async () => {
      seeded = await seedTestScenario({ propertyName: 'Onboarding Idempotency' })

      if (!seeded.property || !seeded.tenant) {
        throw new Error('Seed must produce property + tenant')
      }

      // Create a 5-field template (shorter for speed)
      const fields = Array.from({ length: 5 }, (_, i) => ({
        name: `field_${i + 1}`,
        label: `Item ${i + 1}`,
        type: 'text' as const,
        required: true,
      }))

      const { data: template, error: tErr } = await supabaseAdmin
        .from('onboarding_templates')
        .insert({
          property_id: seeded.property.id,
          title: 'Quick Checklist',
          fields,
          is_active: true,
          created_by: seeded.landlord.userId,
        })
        .select()
        .single()

      if (tErr || !template) throw tErr ?? new Error('Template insert failed')
      templateId = template.id

      // Seed submission in not_started state
      const { error: sErr } = await supabaseAdmin
        .from('onboarding_submissions')
        .insert({
          tenant_id: seeded.tenant.tenantId,
          template_id: templateId,
          data: {},
          status: 'not_started',
          completed_fields: 0,
          total_fields: 5,
        })

      if (sErr) throw sErr
    })

    test.afterEach(async () => {
      if (seeded?.tenant) await cleanupTestUser(seeded.tenant.userId)
      if (seeded?.landlord) await cleanupTestUser(seeded.landlord.userId)
    })

    test('rapid double-click on onboarding submit produces only 1 submitted_at', async ({
      page,
    }) => {
      const tenantId = seeded.tenant!.tenantId

      await loginAsTenant(page, seeded.tenant!.email, PASSWORD)
      await page.waitForLoadState('networkidle')

      // Modal auto-opens for not_started
      const modal = page.locator('.fixed.inset-0.z-50')
      await expect(modal).toBeVisible({ timeout: 10000 })

      // Fill all 5 fields
      for (let i = 1; i <= 5; i++) {
        await page.fill(`input[placeholder="Item ${i}"]`, `Value ${i}`)
      }

      const submitBtn = page.locator('button:has-text("Submit Checklist")')
      await expect(submitBtn).toBeEnabled({ timeout: 3000 })

      // Rapid double-click
      await Promise.all([
        submitBtn.click(),
        submitBtn.click({ delay: 50 }),
      ])

      await page.waitForTimeout(3000)

      // DB assertion: only 1 row, 1 submitted_at
      const { data: rows } = await supabaseAdmin
        .from('onboarding_submissions')
        .select('id, submitted_at, status')
        .eq('tenant_id', tenantId)
        .eq('template_id', templateId)

      expect(rows).toBeTruthy()
      expect(rows!.length).toBe(1)
      expect(rows![0].submitted_at).toBeTruthy()
      expect(rows![0].status).toBe('submitted')
    })
  })
})
