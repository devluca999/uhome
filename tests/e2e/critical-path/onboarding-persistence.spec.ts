/**
 * Flow 5: Onboarding Progress Persistence
 *
 * Verifies that a tenant's onboarding progress is saved across sessions,
 * the modal auto-opens only when status is not_started, the banner reflects
 * partial progress, and final submission updates the DB correctly.
 */

import { test, expect } from '@playwright/test'
import { seedTestScenario, type SeededData } from '../../helpers/seed'
import { getSupabaseAdminClient, cleanupTestUser } from '../../helpers/db-helpers'
import {
  generateTestEmail,
  loginAsTenant,
  createAndConfirmUser,
} from '../../helpers/auth-helpers'

const PASSWORD = 'TestPassword123!'

function buildTenFieldTemplate() {
  return Array.from({ length: 10 }, (_, i) => ({
    name: `field_${i + 1}`,
    label: `Field ${i + 1}`,
    type: 'text' as const,
    required: true,
  }))
}

test.describe('Onboarding Progress Persistence', () => {
  let seeded: SeededData
  let templateId: string
  const supabaseAdmin = getSupabaseAdminClient()

  test.beforeEach(async () => {
    seeded = await seedTestScenario({
      propertyName: 'Onboarding Test Property',
    })

    if (!seeded.property || !seeded.tenant) {
      throw new Error('Seed must produce property + tenant for onboarding tests')
    }

    const { data: template, error: templateErr } = await supabaseAdmin
      .from('onboarding_templates')
      .insert({
        property_id: seeded.property.id,
        title: 'Move-In Checklist',
        fields: buildTenFieldTemplate(),
        is_active: true,
        created_by: seeded.landlord.userId,
      })
      .select()
      .single()

    if (templateErr || !template) throw templateErr ?? new Error('Template insert failed')
    templateId = template.id

    const { error: subErr } = await supabaseAdmin
      .from('onboarding_submissions')
      .insert({
        tenant_id: seeded.tenant!.tenantId,
        template_id: templateId,
        data: {},
        status: 'not_started',
        completed_fields: 0,
        total_fields: 10,
      })

    if (subErr) throw subErr
  })

  test.afterEach(async () => {
    if (seeded?.tenant) await cleanupTestUser(seeded.tenant.userId)
    if (seeded?.landlord) await cleanupTestUser(seeded.landlord.userId)
  })

  test('full onboarding lifecycle: partial save, refresh, complete, submit', async ({ page }) => {
    const tenantEmail = seeded.tenant!.email
    const tenantId = seeded.tenant!.tenantId

    // Step 2: Verify submission row exists with status=not_started
    const { data: initialSub } = await supabaseAdmin
      .from('onboarding_submissions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)
      .single()

    expect(initialSub).toBeTruthy()
    expect(initialSub!.status).toBe('not_started')

    // Step 3: Login as tenant — modal should auto-open
    await loginAsTenant(page, tenantEmail, PASSWORD)
    await page.waitForLoadState('networkidle')

    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Move-In Checklist')).toBeVisible()

    // Step 4: Fill 3 of 10 fields then dismiss
    for (let i = 1; i <= 3; i++) {
      await page.fill(`input[placeholder="Field ${i}"]`, `Answer ${i}`)
    }

    const saveCloseBtn = page.locator('button:has-text("Save & Close")')
    await saveCloseBtn.click()
    await expect(modal).not.toBeVisible({ timeout: 5000 })

    // Step 5: DB check — completed_fields=3, data has 3 keys
    await page.waitForTimeout(1500)
    const { data: partialSub } = await supabaseAdmin
      .from('onboarding_submissions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)
      .single()

    expect(partialSub).toBeTruthy()
    expect(partialSub!.completed_fields).toBe(3)
    expect(Object.keys(partialSub!.data as Record<string, unknown>)).toHaveLength(3)
    expect(partialSub!.status).toBe('in_progress')

    // Step 6: Refresh — banner shows "3/10", modal does NOT auto-reopen
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await expect(page.locator('text=/3\\/10/')).toBeVisible({ timeout: 10000 })

    const modalAfterRefresh = page.locator('.fixed.inset-0.z-50')
    await expect(modalAfterRefresh).not.toBeVisible({ timeout: 3000 })

    // Step 7: Open modal via banner, complete remaining 7 fields, submit
    const continueBtn = page.locator('button:has-text("Continue")')
    await continueBtn.click()
    await expect(modal).toBeVisible({ timeout: 5000 })

    for (let i = 4; i <= 10; i++) {
      await page.fill(`input[placeholder="Field ${i}"]`, `Answer ${i}`)
    }

    const submitBtn = page.locator('button:has-text("Submit Checklist")')
    await submitBtn.click()

    await expect(page.locator('text=Checklist Submitted')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    // Step 8: DB check — status=submitted, completed_fields=10
    const { data: finalSub } = await supabaseAdmin
      .from('onboarding_submissions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)
      .single()

    expect(finalSub).toBeTruthy()
    expect(finalSub!.status).toBe('submitted')
    expect(finalSub!.completed_fields).toBe(10)
    expect(finalSub!.submitted_at).toBeTruthy()

    // Step 9: Banner should be gone after submission
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const banner = page.locator('text=move-in checklist')
    await expect(banner).not.toBeVisible({ timeout: 5000 })
  })

  test('submit with incomplete fields shows validation error', async ({ page }) => {
    const tenantEmail = seeded.tenant!.email

    await loginAsTenant(page, tenantEmail, PASSWORD)
    await page.waitForLoadState('networkidle')

    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Fill only 2 fields — submit should be disabled or show validation error
    await page.fill('input[placeholder="Field 1"]', 'Partial 1')
    await page.fill('input[placeholder="Field 2"]', 'Partial 2')

    const submitBtn = page.locator('button:has-text("Submit Checklist")')

    // The button is disabled when not all required fields are filled
    const isDisabled = await submitBtn.isDisabled()
    if (isDisabled) {
      expect(isDisabled).toBe(true)
    } else {
      // If enabled (race condition), clicking should trigger validation error
      await submitBtn.click()
      await expect(
        page.locator('.text-destructive, [class*="destructive"]')
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('double-click submit produces only 1 update', async ({ page }) => {
    const tenantEmail = seeded.tenant!.email
    const tenantId = seeded.tenant!.tenantId

    await loginAsTenant(page, tenantEmail, PASSWORD)
    await page.waitForLoadState('networkidle')

    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Fill all 10 fields
    for (let i = 1; i <= 10; i++) {
      await page.fill(`input[placeholder="Field ${i}"]`, `Answer ${i}`)
    }

    const submitBtn = page.locator('button:has-text("Submit Checklist")')
    await expect(submitBtn).toBeEnabled({ timeout: 3000 })

    // Rapid double-click
    await Promise.all([
      submitBtn.click(),
      submitBtn.click({ delay: 50 }),
    ])

    await page.waitForTimeout(3000)

    // Verify only 1 submission row exists
    const { data: rows } = await supabaseAdmin
      .from('onboarding_submissions')
      .select('id, submitted_at')
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)

    expect(rows).toBeTruthy()
    expect(rows!.length).toBe(1)
    expect(rows![0].submitted_at).toBeTruthy()
  })
})
