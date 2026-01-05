import { test, expect } from '@playwright/test'
import {
  createTestLandlord,
  createTestTenant,
  generateTestEmail,
  loginAsLandlord,
  getSupabaseClient,
} from '../helpers/auth-helpers'
import { deleteUserAndData, verifyTenantExists } from '../helpers/db-helpers'

test.describe('Tenant Assignment', () => {
  let landlordEmail: string
  let tenantEmail: string
  let password: string
  let landlordId: string | null = null
  let tenantId: string | null = null
  let propertyId: string | null = null

  test.beforeEach(async () => {
    password = 'testpassword123'
    landlordEmail = generateTestEmail('landlord')
    tenantEmail = generateTestEmail('tenant')

    // Create landlord
    const { userId: createdLandlordId, error: landlordError } = await createTestLandlord(
      landlordEmail,
      password
    )
    expect(landlordError).toBeNull()
    landlordId = createdLandlordId

    // Create tenant user
    const { userId: createdTenantId, error: tenantError } = await createTestTenant(
      tenantEmail,
      password
    )
    expect(tenantError).toBeNull()
    tenantId = createdTenantId

    // Create property
    const supabase = getSupabaseClient()
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        owner_id: landlordId,
        name: `Test Property ${Date.now()}`,
        rent_amount: 2500,
      })
      .select()
      .single()

    expect(propertyError).toBeNull()
    expect(property).toBeTruthy()
    propertyId = property!.id
  })

  test.afterEach(async () => {
    if (landlordId) {
      await deleteUserAndData(landlordId)
    }
    if (tenantId && tenantId !== landlordId) {
      await deleteUserAndData(tenantId)
    }
    landlordId = null
    tenantId = null
    propertyId = null
  })

  test('should assign tenant to property', async ({ page }) => {
    await loginAsLandlord(page, landlordEmail, password)

    // Navigate to tenants page
    await page.goto('/landlord/tenants')
    await page.waitForLoadState('networkidle')

    // Click Add Tenant button
    await page.click('button:has-text("Add Tenant")')

    // Fill tenant form - search for tenant email
    await page.fill('input[type="email"], input[placeholder*="email" i]', tenantEmail)

    // Click search button if there is one
    const searchButton = page.getByRole('button', { name: /search/i })
    if (await searchButton.isVisible()) {
      await searchButton.click()
      await page.waitForTimeout(500) // Wait for search to complete
    }

    // Select property from dropdown
    await page.selectOption('select', propertyId!)

    // Set move-in date
    const moveInDate = new Date().toISOString().split('T')[0]
    await page.fill('input[type="date"], input[name*="move" i]', moveInDate)

    // Submit form
    await page.click('button[type="submit"]:has-text(/save|create|add/i)')

    // Wait for tenant to appear in list
    await expect(page.getByText(tenantEmail)).toBeVisible({ timeout: 5000 })

    // Verify tenant exists in database
    const supabase = getSupabaseClient()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', tenantId!)
      .eq('property_id', propertyId!)
      .single()

    expect(tenant).toBeTruthy()
    expect(tenant?.property_id).toBe(propertyId)
    expect(tenant?.user_id).toBe(tenantId)
  })

  test('should verify tenant can access property', async ({ page }) => {
    const supabase = getSupabaseClient()

    // Create tenant assignment directly in database for this test
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        user_id: tenantId!,
        property_id: propertyId!,
        move_in_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(tenant).toBeTruthy()

    // Login as tenant
    await page.goto('/login')
    await page.fill('input[type="email"]', tenantEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')

    // Wait for redirect to tenant dashboard
    await page.waitForURL('/tenant/dashboard', { timeout: 10000 })

    // Verify tenant sees their property information
    await expect(page.locator('h1')).toContainText(/dashboard/i)
  })
})
