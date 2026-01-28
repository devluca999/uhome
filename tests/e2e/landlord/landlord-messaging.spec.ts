/**
 * Landlord Messaging E2E Tests
 *
 * Tests landlord messaging functionality: Property → Unit → Lease → Messages hierarchy,
 * landlord-tenant messaging only (no household messages).
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Landlord Messaging', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  async function loginAsLandlord(page: any, email?: string, password?: string) {
    const landlordEmail = email || generateTestEmail('landlord')
    const landlordPassword = password || 'TestPassword123!'

    if (!email) {
      // Create and confirm user if email not provided
      await createAndConfirmUser(landlordEmail, landlordPassword, { role: 'landlord' })
    }

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', landlordEmail)
    await page.fill('input[type="password"]', landlordPassword)
    await page.click('button:has-text("Sign in")')

    // Wait for redirect to landlord dashboard
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    return { landlordEmail, landlordPassword }
  }

  async function createTestScenario() {
    const supabaseAdmin = getSupabaseAdminClient()

    // Create landlord
    const landlordEmail = generateTestEmail('landlord')
    const landlordPassword = 'TestPassword123!'
    const { userId: landlordId } = await createAndConfirmUser(landlordEmail, landlordPassword, {
      role: 'landlord',
    })

    // Create property and units
    const { data: property } = await supabaseAdmin
      .from('properties')
      .insert({
        owner_id: landlordId,
        name: 'Test Property Complex',
        address: '123 Test St, Test City, TC 12345',
        rules: 'No smoking, quiet hours after 10pm',
      })
      .select()
      .single()

    const { data: unit1 } = await supabaseAdmin
      .from('units')
      .insert({
        property_id: property.id,
        unit_name: 'Unit 1A',
        rent_amount: 1500,
        rent_due_date: 1,
      })
      .select()
      .single()

    const { data: unit2 } = await supabaseAdmin
      .from('units')
      .insert({
        property_id: property.id,
        unit_name: 'Unit 1B',
        rent_amount: 1600,
        rent_due_date: 1,
      })
      .select()
      .single()

    // Create tenants and leases
    const tenant1Email = generateTestEmail('tenant1')
    const tenant1Password = 'TestPassword123!'
    const { userId: tenant1Id } = await createAndConfirmUser(tenant1Email, tenant1Password, {
      role: 'tenant',
    })

    const { data: tenant1 } = await supabaseAdmin
      .from('tenants')
      .insert({
        user_id: tenant1Id,
        move_in_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    const { data: lease1 } = await supabaseAdmin
      .from('leases')
      .insert({
        unit_id: unit1.id,
        tenant_id: tenant1.id,
        status: 'active',
        lease_start_date: new Date().toISOString().split('T')[0],
        rent_amount: 1500,
        rent_frequency: 'monthly',
        security_deposit: 1500,
      })
      .select()
      .single()

    // Update tenant with lease_id
    await supabaseAdmin.from('tenants').update({ lease_id: lease1.id }).eq('id', tenant1.id)

    return {
      landlordId,
      landlordEmail,
      landlordPassword,
      property,
      units: [unit1, unit2],
      leases: [lease1],
      tenants: [{ id: tenant1Id, email: tenant1Email, password: tenant1Password }],
    }
  }

  test('landlord sees property-unit-lease hierarchy', async ({ page }) => {
    const scenario = await createTestScenario()
    await loginAsLandlord(page, scenario.landlordEmail, scenario.landlordPassword)

    // Navigate to messages
    await page.goto(`${baseUrl}/landlord/messages`)

    // Should see property header
    await expect(page.locator(`text=${scenario.property.name}`)).toBeVisible()

    // Should see unit header
    await expect(page.locator('text=Unit 1A')).toBeVisible()

    // Should see tenant card
    await expect(page.locator('text=tenant1@')).toBeVisible()
  })

  test('landlord only sees landlord-tenant messages', async ({ page }) => {
    const scenario = await createTestScenario()
    const supabaseAdmin = getSupabaseAdminClient()

    // Create landlord-tenant message
    await supabaseAdmin.from('messages').insert({
      lease_id: scenario.leases[0].id,
      sender_id: scenario.landlordId,
      sender_role: 'landlord',
      body: 'Welcome to your unit!',
      intent: 'general',
      message_type: 'landlord_tenant',
    })

    // Create household message (should NOT be visible to landlord)
    await supabaseAdmin.from('messages').insert({
      lease_id: scenario.leases[0].id,
      sender_id: scenario.tenants[0].id,
      sender_role: 'tenant',
      body: 'This household message should not be visible to landlord',
      intent: 'general',
      message_type: 'household',
    })

    await loginAsLandlord(page, scenario.landlordEmail, scenario.landlordPassword)
    await page.goto(`${baseUrl}/landlord/messages`)

    // Click on the tenant to open message thread
    await page.locator('text=tenant1@').click()

    // Should see landlord-tenant message
    await expect(page.locator('text=Welcome to your unit!')).toBeVisible()

    // Should NOT see household message
    await expect(
      page.locator('text=This household message should not be visible to landlord')
    ).not.toBeVisible()
  })

  test('landlord can send messages to tenants', async ({ page }) => {
    const scenario = await createTestScenario()
    await loginAsLandlord(page, scenario.landlordEmail, scenario.landlordPassword)
    await page.goto(`${baseUrl}/landlord/messages`)

    // Click on the tenant to open message thread
    await page.locator('text=tenant1@').click()

    // Send a message
    const composer = page.locator('[data-testid="message-composer"]').first()
    await composer.locator('textarea').fill('Test message from landlord')
    await composer.locator('button:has-text("Send")').click()

    // Should see the message
    await expect(page.locator('text=Test message from landlord')).toBeVisible()
  })

  test('landlord sees multiple units under property', async ({ page }) => {
    const scenario = await createTestScenario()
    const supabaseAdmin = getSupabaseAdminClient()

    // Add tenant to second unit
    const tenant2Email = generateTestEmail('tenant2')
    const tenant2Password = 'TestPassword123!'
    const { userId: tenant2Id } = await createAndConfirmUser(tenant2Email, tenant2Password, {
      role: 'tenant',
    })

    const { data: tenant2 } = await supabaseAdmin
      .from('tenants')
      .insert({
        user_id: tenant2Id,
        move_in_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    const { data: lease2 } = await supabaseAdmin
      .from('leases')
      .insert({
        unit_id: scenario.units[1].id,
        tenant_id: tenant2.id,
        status: 'active',
        lease_start_date: new Date().toISOString().split('T')[0],
        rent_amount: 1600,
        rent_frequency: 'monthly',
        security_deposit: 1600,
      })
      .select()
      .single()

    // Update tenant with lease_id
    await supabaseAdmin.from('tenants').update({ lease_id: lease2.id }).eq('id', tenant2.id)

    await loginAsLandlord(page, scenario.landlordEmail, scenario.landlordPassword)
    await page.goto(`${baseUrl}/landlord/messages`)

    // Should see both units
    await expect(page.locator('text=Unit 1A')).toBeVisible()
    await expect(page.locator('text=Unit 1B')).toBeVisible()

    // Should see both tenants
    await expect(page.locator('text=tenant1@')).toBeVisible()
    await expect(page.locator('text=tenant2@')).toBeVisible()
  })

  test('landlord can filter messages', async ({ page }) => {
    const scenario = await createTestScenario()
    await loginAsLandlord(page, scenario.landlordEmail, scenario.landlordPassword)
    await page.goto(`${baseUrl}/landlord/messages`)

    // Test search filter
    const searchInput = page.locator('input[placeholder*="Search"]').first()
    await searchInput.fill('tenant1')
    await page.waitForTimeout(500)

    // Should still see the tenant
    await expect(page.locator('text=tenant1@')).toBeVisible()

    // Search for non-existent tenant
    await searchInput.fill('nonexistent')
    await page.waitForTimeout(500)

    // Should not see any tenants
    await expect(page.locator('text=No messages match filters')).toBeVisible()
  })
})
