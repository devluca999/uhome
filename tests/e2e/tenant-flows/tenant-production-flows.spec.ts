/**
 * Tenant Production Flows E2E Tests
 * 
 * Tests tenant core flows, household UI, messaging parity, and role-based access control.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { seedTestScenario } from '../../helpers/seed'
import { createAndConfirmUser, loginAsTenant, loginAsLandlord, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'

test.describe('Tenant Production Flows', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('tenant without household sees join form', async ({ page }) => {
    // Create tenant user WITHOUT tenant record (not yet assigned to property)
    const tenantEmail = generateTestEmail('tenant')
    const password = 'TestPassword123!'

    const { userId: tenantId } = await createAndConfirmUser(tenantEmail, password, { role: 'tenant' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: tenantId, email: tenantEmail, role: 'tenant' })

    // Login as tenant
    await loginAsTenant(page, tenantEmail, password)

    // Should redirect to tenant dashboard
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Assert: Empty state with join household prompt
    await expect(page.locator('text=No property assigned yet')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button:has-text("Join Household")')).toBeVisible()

    // Verify household tab exists in nav
    await expect(page.locator('nav a:has-text("Household")')).toBeVisible()

    // Navigate to household page
    await page.click('nav a:has-text("Household")')
    await page.waitForURL(/\/tenant\/household/, { timeout: 5000 })

    // Should see join household interface
    await expect(page.locator('text=Not part of a household yet')).toBeVisible()
    await expect(page.locator('button:has-text("Join with Invite Link")')).toBeVisible()
  })

  test('tenant with household sees dashboard data', async ({ page }) => {
    // Use seedTestScenario to create tenant + property
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
      createWorkOrders: true,
    })

    if (!seeded.tenant || !seeded.property) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as tenant
    await loginAsTenant(page, seeded.tenant.email, 'TestPassword123!')

    // Should redirect to tenant dashboard
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Assert: Property data visible
    await expect(page.locator(`text=${seeded.property.name}`)).toBeVisible({ timeout: 5000 })

    // Assert: Rent status card visible
    await expect(page.locator('[data-testid="rent-status"]')).toBeVisible()

    // Assert: Maintenance card visible
    await expect(page.locator('[data-testid="pending-work-orders-count"]')).toBeVisible()
  })

  test('tenant cannot access landlord routes', async ({ page }) => {
    // Seed tenant
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as tenant
    await loginAsTenant(page, seeded.tenant.email, 'TestPassword123!')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Try to navigate to landlord dashboard
    await page.goto(`${baseUrl}/landlord/dashboard`)
    await page.waitForTimeout(2000)

    // Assert: Redirected to tenant dashboard
    await expect(page).toHaveURL(/\/tenant\/dashboard/)

    // Try to navigate to landlord properties
    await page.goto(`${baseUrl}/landlord/properties`)
    await page.waitForTimeout(2000)

    // Assert: Redirected to tenant dashboard
    await expect(page).toHaveURL(/\/tenant\/dashboard/)
  })

  test('tenant invite acceptance adds to household', async ({ page, context }) => {
    // Create landlord + property
    const landlordEmail = generateTestEmail('landlord')
    const tenantEmail = generateTestEmail('tenant')
    const password = 'TestPassword123!'

    const { userId: landlordId } = await createAndConfirmUser(landlordEmail, password, { role: 'landlord' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: landlordId, email: landlordEmail, role: 'landlord' })

    // Login as landlord
    await loginAsLandlord(page, landlordEmail, password)
    await page.goto(`${baseUrl}/landlord/properties`)
    await page.waitForLoadState('networkidle')

    // Create property
    await page.click('button:has-text("Add Property")')
    await page.fill('input[name="name"]', 'Invite Test Property')
    await page.fill('input[name="address"]', '456 Invite St')
    await page.fill('input[name="rent_amount"]', '2000')
    await page.click('button[type="submit"]:has-text("Create Property")')
    await page.waitForTimeout(2000)

    // Navigate to tenants page to create invite
    await page.goto(`${baseUrl}/landlord/tenants`)
    await page.waitForLoadState('networkidle')

    // Create invite
    await page.click('button:has-text("Invite Tenant")')
    await page.waitForTimeout(500)
    await page.fill('input[type="email"]', tenantEmail)
    
    // Select property from dropdown (if available)
    const propertySelect = page.locator('select[name="property_id"], select:has-text("Select property")')
    if (await propertySelect.isVisible()) {
      await propertySelect.selectOption({ label: 'Invite Test Property' })
    }
    
    await page.click('button[type="submit"]:has-text("Send Invite")')
    await page.waitForTimeout(2000)

    // Get invite token from database
    const { data: invite } = await supabaseAdmin
      .from('tenant_invites')
      .select('token')
      .eq('email', tenantEmail)
      .single()

    if (!invite) {
      throw new Error('Invite not created')
    }

    // Open tenant page
    const tenantPage = await context.newPage()
    await tenantPage.goto(`${baseUrl}/signup`)
    await tenantPage.waitForLoadState('networkidle')

    // Create tenant account
    await tenantPage.fill('input[type="email"]', tenantEmail)
    await tenantPage.fill('input[type="password"]', password)
    await tenantPage.click('button[type="submit"]:has-text("Sign up")')
    await tenantPage.waitForTimeout(3000)

    // Accept invite
    await tenantPage.goto(`${baseUrl}/accept-invite/${invite.token}`)
    await tenantPage.waitForTimeout(2000)
    await tenantPage.click('button:has-text("Accept")')
    await tenantPage.waitForTimeout(3000)

    // Assert: Tenant sees property data (no hard refresh needed)
    await expect(tenantPage.locator('text=Invite Test Property')).toBeVisible({ timeout: 10000 })
  })

  test('tenant and landlord see same message thread', async ({ page, context }) => {
    // Seed tenant + landlord + lease
    const seeded = await seedTestScenario({
      propertyName: 'Message Test Property',
      createMessages: false, // Start with no messages
    })

    if (!seeded.tenant || !seeded.landlord || !seeded.lease) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as tenant
    await loginAsTenant(page, seeded.tenant.email, 'TestPassword123!')
    await page.goto(`${baseUrl}/tenant/messages`)
    await page.waitForLoadState('networkidle')

    // Click on lease to open thread
    await page.click(`text=${seeded.property?.name || 'Property'}`)
    await page.waitForTimeout(1000)

    // Tenant sends message
    const tenantMessage = 'Hello landlord, this is a test message from tenant'
    await page.fill('textarea', tenantMessage)
    await page.click('button:has-text("Send")')
    await page.waitForTimeout(2000)

    // Assert: Tenant sees their message with "Tenant" badge
    await expect(page.locator(`text=${tenantMessage}`)).toBeVisible()
    await expect(page.locator('text=Tenant').first()).toBeVisible()

    // Open landlord page
    const landlordPage = await context.newPage()
    await loginAsLandlord(landlordPage, seeded.landlord.email, 'TestPassword123!')
    await landlordPage.goto(`${baseUrl}/landlord/messages`)
    await landlordPage.waitForLoadState('networkidle')

    // Click on lease to open thread
    await landlordPage.click(`text=${seeded.tenant.email}`)
    await landlordPage.waitForTimeout(1000)

    // Assert: Landlord sees tenant message
    await expect(landlordPage.locator(`text=${tenantMessage}`)).toBeVisible({ timeout: 5000 })

    // Landlord replies
    const landlordMessage = 'Hello tenant, I received your message'
    await landlordPage.fill('textarea', landlordMessage)
    await landlordPage.click('button:has-text("Send")')
    await landlordPage.waitForTimeout(2000)

    // Assert: Landlord sees their message with "Landlord" badge
    await expect(landlordPage.locator(`text=${landlordMessage}`)).toBeVisible()
    await expect(landlordPage.locator('text=Landlord').first()).toBeVisible()

    // Go back to tenant page and check for landlord reply
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Assert: Tenant sees landlord reply
    await expect(page.locator(`text=${landlordMessage}`)).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Landlord').first()).toBeVisible()
  })

  test('tenant dashboard metrics scoped to household', async ({ page }) => {
    // This test verifies no cross-property data leakage
    const supabaseAdmin = getSupabaseAdminClient()

    // Create landlord with 2 properties
    const landlordEmail = generateTestEmail('landlord')
    const tenant1Email = generateTestEmail('tenant1')
    const tenant2Email = generateTestEmail('tenant2')
    const password = 'TestPassword123!'

    const { userId: landlordId } = await createAndConfirmUser(landlordEmail, password, { role: 'landlord' })
    await supabaseAdmin.from('users').upsert({ id: landlordId, email: landlordEmail, role: 'landlord' })

    // Create property 1
    const { data: property1 } = await supabaseAdmin
      .from('properties')
      .insert({
        owner_id: landlordId,
        name: 'Property One',
        address: '111 First St',
        rent_amount: 1000,
      })
      .select()
      .single()

    // Create property 2
    const { data: property2 } = await supabaseAdmin
      .from('properties')
      .insert({
        owner_id: landlordId,
        name: 'Property Two',
        address: '222 Second St',
        rent_amount: 2000,
      })
      .select()
      .single()

    if (!property1 || !property2) {
      throw new Error('Failed to create properties')
    }

    // Create tenant 1 for property 1
    const { userId: tenant1Id } = await createAndConfirmUser(tenant1Email, password, { role: 'tenant' })
    await supabaseAdmin.from('users').upsert({ id: tenant1Id, email: tenant1Email, role: 'tenant' })
    
    const { data: tenant1Record } = await supabaseAdmin
      .from('tenants')
      .insert({
        user_id: tenant1Id,
        property_id: property1.id,
        move_in_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    // Create tenant 2 for property 2
    const { userId: tenant2Id } = await createAndConfirmUser(tenant2Email, password, { role: 'tenant' })
    await supabaseAdmin.from('users').upsert({ id: tenant2Id, email: tenant2Email, role: 'tenant' })

    await supabaseAdmin.from('tenants').insert({
      user_id: tenant2Id,
      property_id: property2.id,
      move_in_date: new Date().toISOString().split('T')[0],
    })

    // Login as tenant 1
    await loginAsTenant(page, tenant1Email, password)
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Assert: Only property 1 data visible
    await expect(page.locator('text=Property One')).toBeVisible({ timeout: 5000 })

    // Assert: Property 2 data NOT visible
    await expect(page.locator('text=Property Two')).not.toBeVisible()

    // Navigate to household page
    await page.click('nav a:has-text("Household")')
    await page.waitForURL(/\/tenant\/household/, { timeout: 5000 })

    // Assert: Only property 1 details shown
    await expect(page.locator('text=Property One')).toBeVisible()
    await expect(page.locator('text=111 First St')).toBeVisible()
    await expect(page.locator('text=Property Two')).not.toBeVisible()
  })

  test('tenant sees household tab after joining', async ({ page }) => {
    // Seed tenant with household
    const seeded = await seedTestScenario({
      propertyName: 'Household Tab Test',
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as tenant
    await loginAsTenant(page, seeded.tenant.email, 'TestPassword123!')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Navigate to household page
    await page.click('nav a:has-text("Household")')
    await page.waitForURL(/\/tenant\/household/, { timeout: 5000 })

    // Assert: Tabs visible
    await expect(page.locator('button[role="tab"]:has-text("Home")')).toBeVisible()
    await expect(page.locator('button[role="tab"]:has-text("Housemates")')).toBeVisible()
    await expect(page.locator('button[role="tab"]:has-text("Documents")')).toBeVisible()

    // Click Housemates tab
    await page.click('button[role="tab"]:has-text("Housemates")')
    await page.waitForTimeout(1000)

    // Assert: Housemates content visible (tenant should see themselves)
    await expect(page.locator('text=Housemates')).toBeVisible()
    // Should see tenant email in the list
    await expect(page.locator(`text=${seeded.tenant.email}`)).toBeVisible()
  })

  test('tenant work orders scoped to property', async ({ page }) => {
    // Seed tenant with work orders
    const seeded = await seedTestScenario({
      propertyName: 'Work Order Test',
      createWorkOrders: true,
    })

    if (!seeded.tenant || !seeded.property) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as tenant
    await loginAsTenant(page, seeded.tenant.email, 'TestPassword123!')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Navigate to maintenance
    await page.click('nav a:has-text("Maintenance")')
    await page.waitForURL(/\/tenant\/maintenance/, { timeout: 5000 })

    // Assert: Can see maintenance requests
    await expect(page.locator('[data-testid^="work-order-card-"]').first()).toBeVisible({ timeout: 5000 })

    // Assert: Can submit new request
    await expect(page.locator('button:has-text("New Request")')).toBeVisible()
  })

  test('landlord cannot access tenant routes', async ({ page }) => {
    // Seed landlord
    const seeded = await seedTestScenario({
      propertyName: 'Route Guard Test',
    })

    if (!seeded.landlord) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as landlord
    await loginAsLandlord(page, seeded.landlord.email, 'TestPassword123!')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })

    // Try to navigate to tenant dashboard
    await page.goto(`${baseUrl}/tenant/dashboard`)
    await page.waitForTimeout(2000)

    // Assert: Redirected to landlord dashboard
    await expect(page).toHaveURL(/\/landlord\/dashboard/)

    // Try to navigate to tenant household
    await page.goto(`${baseUrl}/tenant/household`)
    await page.waitForTimeout(2000)

    // Assert: Redirected to landlord dashboard
    await expect(page).toHaveURL(/\/landlord\/dashboard/)
  })
})

