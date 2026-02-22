/**
 * Tier 3 Permission Tests — RLS Boundaries
 *
 * Verifies that role-based access control is enforced both at the
 * route level (redirects) and at the Supabase RLS level (query failures).
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { seedTestScenario, type SeededData } from '../../helpers/seed'
import { getSupabaseAdminClient, cleanupTestUser } from '../../helpers/db-helpers'
import {
  generateTestEmail,
  loginAsTenant,
  loginAsLandlord,
  createAndConfirmUser,
} from '../../helpers/auth-helpers'

const PASSWORD = 'TestPassword123!'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

test.describe('RLS Boundaries', () => {
  const supabaseAdmin = getSupabaseAdminClient()

  test.describe('tenant route guards', () => {
    let seeded: SeededData

    test.beforeEach(async () => {
      seeded = await seedTestScenario({ propertyName: 'RLS Route Test' })
    })

    test.afterEach(async () => {
      if (seeded?.tenant) await cleanupTestUser(seeded.tenant.userId)
      if (seeded?.landlord) await cleanupTestUser(seeded.landlord.userId)
    })

    test('tenant cannot access admin routes', async ({ page }) => {
      await loginAsTenant(page, seeded.tenant!.email, PASSWORD)

      await page.goto('/admin/overview')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      const url = new URL(page.url())
      expect(url.pathname).not.toBe('/admin/overview')
      expect(
        url.pathname === '/tenant/dashboard' || url.pathname === '/login'
      ).toBe(true)
    })

    test('tenant cannot access landlord routes', async ({ page }) => {
      await loginAsTenant(page, seeded.tenant!.email, PASSWORD)

      await page.goto('/landlord/properties')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      const url = new URL(page.url())
      expect(url.pathname).not.toBe('/landlord/properties')
      expect(
        url.pathname === '/tenant/dashboard' || url.pathname === '/login'
      ).toBe(true)
    })
  })

  test.describe('tenant Supabase RLS', () => {
    let seeded: SeededData

    test.beforeEach(async () => {
      seeded = await seedTestScenario({ propertyName: 'RLS Mutation Test' })
    })

    test.afterEach(async () => {
      if (seeded?.tenant) await cleanupTestUser(seeded.tenant.userId)
      if (seeded?.landlord) await cleanupTestUser(seeded.landlord.userId)
    })

    test('tenant cannot mutate properties via Supabase', async () => {
      // Create an authenticated Supabase client as the tenant
      const tenantClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

      const { error: signInErr } = await tenantClient.auth.signInWithPassword({
        email: seeded.tenant!.email,
        password: PASSWORD,
      })
      expect(signInErr).toBeNull()

      // Attempt to insert a property as tenant — should be blocked by RLS
      const { data, error } = await tenantClient
        .from('properties')
        .insert({
          owner_id: seeded.tenant!.userId,
          name: 'Rogue Property',
          address: '999 Forbidden Ave',
          rent_amount: 9999,
          rent_due_date: 1,
        })
        .select()

      // RLS should reject: either an error is returned or data is empty
      const blocked = error !== null || !data || data.length === 0
      expect(blocked).toBe(true)

      // Verify the rogue property does NOT exist in the database
      const { data: check } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('name', 'Rogue Property')
        .eq('owner_id', seeded.tenant!.userId)

      expect(check?.length ?? 0).toBe(0)

      await tenantClient.auth.signOut()
    })
  })

  test.describe('cross-landlord isolation', () => {
    let landlordA: { userId: string; email: string }
    let landlordB: { userId: string; email: string }
    let propertyBId: string

    test.beforeEach(async () => {
      // Landlord A
      const emailA = generateTestEmail('landlordA')
      const { userId: idA } = await createAndConfirmUser(emailA, PASSWORD)
      await supabaseAdmin.from('users').upsert({ id: idA, email: emailA, role: 'landlord' })
      landlordA = { userId: idA, email: emailA }

      // Landlord B with a property
      const emailB = generateTestEmail('landlordB')
      const { userId: idB } = await createAndConfirmUser(emailB, PASSWORD)
      await supabaseAdmin.from('users').upsert({ id: idB, email: emailB, role: 'landlord' })
      landlordB = { userId: idB, email: emailB }

      const { data: prop, error } = await supabaseAdmin
        .from('properties')
        .insert({
          owner_id: idB,
          name: 'Private B Property',
          address: '1 Secret Lane',
          rent_amount: 3000,
          rent_due_date: 1,
        })
        .select()
        .single()

      if (error || !prop) throw error ?? new Error('Property B insert failed')
      propertyBId = prop.id
    })

    test.afterEach(async () => {
      await cleanupTestUser(landlordA.userId)
      await cleanupTestUser(landlordB.userId)
    })

    test('landlord A cannot access landlord B property via Supabase', async () => {
      // Authenticate as Landlord A
      const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { error: signInErr } = await clientA.auth.signInWithPassword({
        email: landlordA.email,
        password: PASSWORD,
      })
      expect(signInErr).toBeNull()

      // Query Landlord B's property — should return empty due to RLS
      const { data, error } = await clientA
        .from('properties')
        .select('*')
        .eq('id', propertyBId)

      expect(error).toBeNull()
      expect(data?.length ?? 0).toBe(0)

      await clientA.auth.signOut()
    })
  })
})
