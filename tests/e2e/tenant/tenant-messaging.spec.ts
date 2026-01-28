/**
 * Tenant Messaging E2E Tests
 *
 * Tests tenant messaging functionality: landlord ↔ tenant and household messaging,
 * lease resolution, tabs, and empty states.
 */

import { test, expect, type Page } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Tenant Messaging', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  async function loginAsTenant(page: Page, email?: string, password?: string) {
    const tenantEmail = email || generateTestEmail('tenant')
    const tenantPassword = password || 'TestPassword123!'

    if (!email) {
      // Create and confirm user if email not provided
      await createAndConfirmUser(tenantEmail, tenantPassword, { role: 'tenant' })
    }

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', tenantEmail)
    await page.fill('input[type="password"]', tenantPassword)
    await page.click('button:has-text("Sign in")')

    // Wait for redirect to tenant dashboard
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    return { tenantEmail, tenantPassword }
  }

  async function createTestScenario() {
    const supabaseAdmin = getSupabaseAdminClient()

    // Create landlord
    const landlordEmail = generateTestEmail('landlord')
    const landlordPassword = 'TestPassword123!'
    const { userId: landlordId } = await createAndConfirmUser(landlordEmail, landlordPassword, {
      role: 'landlord',
    })

    // Create property and unit
    const { data: property } = await supabaseAdmin
      .from('properties')
      .insert({
        owner_id: landlordId,
        name: 'Test Property',
        address: '123 Test St, Test City, TC 12345',
        rules: 'No smoking, quiet hours after 10pm',
      })
      .select()
      .single()

    const { data: unit } = await supabaseAdmin
      .from('units')
      .insert({
        property_id: property.id,
        unit_name: 'Unit 1A',
        rent_amount: 1500,
        rent_due_date: 1,
      })
      .select()
      .single()

    // Create tenant and lease
    const tenantEmail = generateTestEmail('tenant')
    const tenantPassword = 'TestPassword123!'
    const { userId: tenantId } = await createAndConfirmUser(tenantEmail, tenantPassword, {
      role: 'tenant',
    })

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .insert({
        user_id: tenantId,
        move_in_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    const { data: lease } = await supabaseAdmin
      .from('leases')
      .insert({
        unit_id: unit.id,
        tenant_id: tenant.id,
        status: 'active',
        lease_start_date: new Date().toISOString().split('T')[0],
        rent_amount: 1500,
        rent_frequency: 'monthly',
        security_deposit: 1500,
      })
      .select()
      .single()

    // Update tenant with lease_id
    await supabaseAdmin.from('tenants').update({ lease_id: lease.id }).eq('id', tenant.id)

    return {
      landlordId,
      landlordEmail,
      landlordPassword,
      tenantId,
      tenantEmail,
      tenantPassword,
      property,
      unit,
      lease,
    }
  }

  test('tenant without lease sees empty state', async ({ page }) => {
    // Create tenant without lease
    const tenantEmail = generateTestEmail('tenant')
    const tenantPassword = 'TestPassword123!'
    await createAndConfirmUser(tenantEmail, tenantPassword, { role: 'tenant' })

    await loginAsTenant(page, tenantEmail, tenantPassword)

    // Navigate to messages
    await page.goto(`${baseUrl}/tenant/messages`)

    // Should see empty state
    await expect(page.locator('text=You are not currently part of a household')).toBeVisible()
    await expect(
      page.locator("text=Messaging is only available once you've been invited")
    ).toBeVisible()
  })

  test('tenant with lease sees landlord and household tabs', async ({ page }) => {
    const scenario = await createTestScenario()
    await loginAsTenant(page, scenario.tenantEmail, scenario.tenantPassword)

    // Navigate to messages
    await page.goto(`${baseUrl}/tenant/messages`)

    // Should see tabs
    await expect(page.locator('button:has-text("Landlord")')).toBeVisible()
    await expect(page.locator('button:has-text("Household")')).toBeVisible()

    // Should show property context
    await expect(page.locator(`text=${scenario.property.name}`)).toBeVisible()
  })

  test('landlord tab shows landlord-tenant messages', async ({ page }) => {
    const scenario = await createTestScenario()
    const supabaseAdmin = getSupabaseAdminClient()

    // Create some landlord-tenant messages
    await supabaseAdmin.from('messages').insert([
      {
        lease_id: scenario.lease.id,
        sender_id: scenario.landlordId,
        sender_role: 'landlord',
        body: 'Welcome to the property!',
        intent: 'general',
        message_type: 'landlord_tenant',
      },
      {
        lease_id: scenario.lease.id,
        sender_id: scenario.tenantId,
        sender_role: 'tenant',
        body: 'Thank you!',
        intent: 'general',
        message_type: 'landlord_tenant',
      },
    ])

    await loginAsTenant(page, scenario.tenantEmail, scenario.tenantPassword)
    await page.goto(`${baseUrl}/tenant/messages`)

    // Landlord tab should be active by default
    await expect(page.locator('button:has-text("Landlord")')).toHaveClass(/bg-background/)

    // Should see messages
    await expect(page.locator('text=Welcome to the property!')).toBeVisible()
    await expect(page.locator('text=Thank you!')).toBeVisible()
  })

  test('household tab shows tenant-only messages', async ({ page }) => {
    const scenario = await createTestScenario()
    const supabaseAdmin = getSupabaseAdminClient()

    // Create roommate
    const roommateEmail = generateTestEmail('roommate')
    const roommatePassword = 'TestPassword123!'
    const { userId: roommateId } = await createAndConfirmUser(roommateEmail, roommatePassword, {
      role: 'tenant',
    })

    const { data: roommateTenant } = await supabaseAdmin
      .from('tenants')
      .insert({
        user_id: roommateId,
        lease_id: scenario.lease.id, // Same lease - roommates
        move_in_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    // Create household messages
    await supabaseAdmin.from('messages').insert([
      {
        lease_id: scenario.lease.id,
        sender_id: scenario.tenantId,
        sender_role: 'tenant',
        body: 'Hey roommate, when is trash day?',
        intent: 'general',
        message_type: 'household',
      },
      {
        lease_id: scenario.lease.id,
        sender_id: roommateId,
        sender_role: 'tenant',
        body: 'Thursday, same as always!',
        intent: 'general',
        message_type: 'household',
      },
    ])

    await loginAsTenant(page, scenario.tenantEmail, scenario.tenantPassword)
    await page.goto(`${baseUrl}/tenant/messages`)

    // Switch to household tab
    await page.click('button:has-text("Household")')

    // Should see household messages
    await expect(page.locator('text=Hey roommate, when is trash day?')).toBeVisible()
    await expect(page.locator('text=Thursday, same as always!')).toBeVisible()

    // Should NOT see landlord messages (they're on different tab)
    await expect(page.locator('text=Welcome to the property!')).not.toBeVisible()
  })

  test('tenant can send messages in both tabs', async ({ page }) => {
    const scenario = await createTestScenario()
    await loginAsTenant(page, scenario.tenantEmail, scenario.tenantPassword)
    await page.goto(`${baseUrl}/tenant/messages`)

    // Test landlord tab
    const landlordComposer = page.locator('[data-testid="message-composer"]').first()
    await landlordComposer.locator('textarea').fill('Test message to landlord')
    await landlordComposer.locator('button:has-text("Send")').click()

    // Should see the message
    await expect(page.locator('text=Test message to landlord')).toBeVisible()

    // Switch to household tab
    await page.click('button:has-text("Household")')

    const householdComposer = page.locator('[data-testid="message-composer"]').first()
    await householdComposer.locator('textarea').fill('Test household message')
    await householdComposer.locator('button:has-text("Send")').click()

    // Should see the household message
    await expect(page.locator('text=Test household message')).toBeVisible()
  })

  test('landlord messages not visible in household tab', async ({ page }) => {
    const scenario = await createTestScenario()
    const supabaseAdmin = getSupabaseAdminClient()

    // Create landlord message
    await supabaseAdmin.from('messages').insert({
      lease_id: scenario.lease.id,
      sender_id: scenario.landlordId,
      sender_role: 'landlord',
      body: 'This is from landlord',
      intent: 'general',
      message_type: 'landlord_tenant',
    })

    await loginAsTenant(page, scenario.tenantEmail, scenario.tenantPassword)
    await page.goto(`${baseUrl}/tenant/messages`)

    // Switch to household tab
    await page.click('button:has-text("Household")')

    // Landlord message should not be visible
    await expect(page.locator('text=This is from landlord')).not.toBeVisible()
    await expect(page.locator('text=No household messages yet')).toBeVisible()
  })
})
