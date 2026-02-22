/**
 * Tier 2 Edge Cases
 *
 * Tests for boundary conditions in property and tenant management:
 * zero-rent properties, deactivation, tenant unlinking, multi-tab consistency.
 */

import { test, expect } from '@playwright/test'
import { seedTestScenario, type SeededData } from '../../helpers/seed'
import { getSupabaseAdminClient, cleanupTestUser } from '../../helpers/db-helpers'
import {
  generateTestEmail,
  loginAsLandlord,
  createAndConfirmUser,
} from '../../helpers/auth-helpers'

const PASSWORD = 'TestPassword123!'

test.describe('Tier 2 Edge Cases', () => {
  const supabaseAdmin = getSupabaseAdminClient()

  test.describe('activate property without rent', () => {
    let landlordUserId: string
    let landlordEmail: string
    let propertyId: string

    test.beforeEach(async () => {
      landlordEmail = generateTestEmail('landlord')
      const { userId } = await createAndConfirmUser(landlordEmail, PASSWORD)
      landlordUserId = userId

      await supabaseAdmin.from('users').upsert({
        id: landlordUserId,
        email: landlordEmail,
        role: 'landlord',
      })

      const { data: prop, error } = await supabaseAdmin
        .from('properties')
        .insert({
          owner_id: landlordUserId,
          name: 'Zero Rent Property',
          address: '0 Free Street',
          rent_amount: 0,
          rent_due_date: 1,
        })
        .select()
        .single()

      if (error || !prop) throw error ?? new Error('Property insert failed')
      propertyId = prop.id
    })

    test.afterEach(async () => {
      await cleanupTestUser(landlordUserId)
    })

    test('property with rent_amount=0 appears in dashboard', async ({ page }) => {
      await loginAsLandlord(page, landlordEmail, PASSWORD)
      await page.goto('/landlord/properties')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('text=Zero Rent Property')).toBeVisible({ timeout: 10000 })

      // DB sanity check
      const { data: dbProp } = await supabaseAdmin
        .from('properties')
        .select('rent_amount')
        .eq('id', propertyId)
        .single()

      expect(dbProp).toBeTruthy()
      expect(dbProp!.rent_amount).toBe(0)
    })
  })

  test.describe('deactivate property', () => {
    let seeded: SeededData

    test.beforeEach(async () => {
      seeded = await seedTestScenario({ propertyName: 'Deactivation Target' })
    })

    test.afterEach(async () => {
      if (seeded?.tenant) await cleanupTestUser(seeded.tenant.userId)
      if (seeded?.landlord) await cleanupTestUser(seeded.landlord.userId)
    })

    test('toggling is_active=false updates the DB', async () => {
      const propertyId = seeded.property!.id

      // Verify initially active
      const { data: before } = await supabaseAdmin
        .from('properties')
        .select('is_active')
        .eq('id', propertyId)
        .single()

      // Default is true (or null = active)
      expect(before!.is_active).not.toBe(false)

      // Deactivate
      const { error } = await supabaseAdmin
        .from('properties')
        .update({ is_active: false })
        .eq('id', propertyId)

      expect(error).toBeNull()

      // Confirm
      const { data: after } = await supabaseAdmin
        .from('properties')
        .select('is_active')
        .eq('id', propertyId)
        .single()

      expect(after!.is_active).toBe(false)
    })
  })

  test.describe('tenant removed from property', () => {
    let seeded: SeededData

    test.beforeEach(async () => {
      seeded = await seedTestScenario({ propertyName: 'Unlink Test Property' })
    })

    test.afterEach(async () => {
      if (seeded?.tenant) await cleanupTestUser(seeded.tenant.userId)
      if (seeded?.landlord) await cleanupTestUser(seeded.landlord.userId)
    })

    test('unlinking tenant sets property_id to null but preserves tenant row', async () => {
      const tenantId = seeded.tenant!.tenantId

      // Verify initial link
      const { data: before } = await supabaseAdmin
        .from('tenants')
        .select('id, property_id, user_id')
        .eq('id', tenantId)
        .single()

      expect(before!.property_id).toBe(seeded.property!.id)

      // Unlink tenant from property
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ property_id: null })
        .eq('id', tenantId)

      expect(error).toBeNull()

      // Verify tenant row still exists with null property
      const { data: after } = await supabaseAdmin
        .from('tenants')
        .select('id, property_id, user_id')
        .eq('id', tenantId)
        .single()

      expect(after).toBeTruthy()
      expect(after!.id).toBe(tenantId)
      expect(after!.property_id).toBeNull()
      expect(after!.user_id).toBe(seeded.tenant!.userId)
    })
  })

  test.describe('two tabs same user', () => {
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

    test('property created in tab 1 appears in tab 2 after refresh', async ({
      context,
    }) => {
      const tab1 = await context.newPage()
      const tab2 = await context.newPage()

      // Login in tab 1
      await loginAsLandlord(tab1, landlordEmail, PASSWORD)
      await tab1.goto('/landlord/properties')
      await tab1.waitForLoadState('networkidle')

      // Login in tab 2
      await loginAsLandlord(tab2, landlordEmail, PASSWORD)
      await tab2.goto('/landlord/properties')
      await tab2.waitForLoadState('networkidle')

      // Create property in tab 1 via DB (simulates form submission)
      const { data: newProp, error } = await supabaseAdmin
        .from('properties')
        .insert({
          owner_id: landlordUserId,
          name: 'Multi-Tab Property',
          address: '42 Tab Street',
          rent_amount: 2000,
          rent_due_date: 15,
        })
        .select()
        .single()

      if (error) throw error

      // Refresh tab 1 and tab 2
      await tab1.reload()
      await tab1.waitForLoadState('networkidle')

      await tab2.reload()
      await tab2.waitForLoadState('networkidle')

      // Both tabs should show the new property
      await expect(tab1.locator('text=Multi-Tab Property')).toBeVisible({ timeout: 10000 })
      await expect(tab2.locator('text=Multi-Tab Property')).toBeVisible({ timeout: 10000 })

      // Cleanup
      await tab1.close()
      await tab2.close()
    })
  })
})
