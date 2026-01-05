import { test, expect } from '@playwright/test'
import {
  createTestLandlord,
  createTestTenant,
  generateTestEmail,
  loginAsTenant,
  loginAsLandlord,
  getSupabaseClient,
} from '../helpers/auth-helpers'
import { deleteUserAndData, verifyMaintenanceRequestExists } from '../helpers/db-helpers'

test.describe('Maintenance Requests', () => {
  let landlordEmail: string
  let tenantEmail: string
  let password: string
  let landlordId: string | null = null
  let tenantId: string | null = null
  let propertyId: string | null = null
  let tenantRecordId: string | null = null

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
    propertyId = property!.id

    // Create tenant assignment
    const { data: tenant, error: tenantRecordError } = await supabase
      .from('tenants')
      .insert({
        user_id: tenantId,
        property_id: propertyId,
        move_in_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    expect(tenantRecordError).toBeNull()
    tenantRecordId = tenant!.id
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
    tenantRecordId = null
  })

  test('should submit maintenance request', async ({ page }) => {
    await loginAsTenant(page, tenantEmail, password)

    // Navigate to maintenance page
    await page.goto('/tenant/maintenance')
    await page.waitForLoadState('networkidle')

    // Click "New Request" button
    await page.click('button:has-text("New Request")')

    // Fill maintenance request form
    const category = 'Plumbing'
    const description = 'Leaky faucet in kitchen sink'

    // Fill category if there's a category field
    const categoryInput = page.locator('input[name*="category"], select[name*="category"]').first()
    if (await categoryInput.isVisible()) {
      if ((await categoryInput.getAttribute('type')) === 'text') {
        await categoryInput.fill(category)
      } else {
        await categoryInput.selectOption(category)
      }
    }

    // Fill description
    await page.fill(
      'textarea[name*="description"], textarea[placeholder*="description" i]',
      description
    )

    // Submit form
    await page.click('button[type="submit"]:has-text(/submit|create|save/i)')

    // Wait for request to appear in list
    await expect(page.getByText(description)).toBeVisible({ timeout: 5000 })

    // Verify request appears with "pending" status
    await expect(page.getByText(/pending/i)).toBeVisible()

    // Verify maintenance request exists in database
    const supabase = getSupabaseClient()
    const { data: requests } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('property_id', propertyId!)
      .eq('tenant_id', tenantRecordId!)
      .eq('description', description)

    expect(requests).toBeTruthy()
    expect(requests!.length).toBeGreaterThan(0)
    expect(requests![0].status).toBe('pending')
    expect(requests![0].property_id).toBe(propertyId)
    expect(requests![0].tenant_id).toBe(tenantRecordId)
  })

  test('should allow landlord to view and update maintenance request status', async ({ page }) => {
    const supabase = getSupabaseClient()

    // Create maintenance request via database
    const { data: request, error: createError } = await supabase
      .from('maintenance_requests')
      .insert({
        property_id: propertyId!,
        tenant_id: tenantRecordId!,
        status: 'pending',
        category: 'Plumbing',
        description: 'Test maintenance request',
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(request).toBeTruthy()

    // Login as landlord
    await loginAsLandlord(page, landlordEmail, password)

    // Navigate to operations page
    await page.goto('/landlord/operations')
    await page.waitForLoadState('networkidle')

    // Verify request appears in pending section
    await expect(page.getByText('Test maintenance request')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/pending/i)).toBeVisible()

    // Click "Mark In Progress" button
    const markInProgressButton = page.getByRole('button', { name: /mark in progress/i }).first()
    if (await markInProgressButton.isVisible()) {
      await markInProgressButton.click()
      await page.waitForTimeout(1000)

      // Verify status updates to "in_progress" in UI
      await expect(page.getByText(/in progress/i)).toBeVisible({ timeout: 3000 })

      // Verify status in database
      const { data: updatedRequest } = await supabase
        .from('maintenance_requests')
        .select('status')
        .eq('id', request!.id)
        .single()

      expect(updatedRequest?.status).toBe('in_progress')

      // Click "Mark Complete" button
      const markCompleteButton = page
        .getByRole('button', { name: /mark complete|complete/i })
        .first()
      if (await markCompleteButton.isVisible()) {
        await markCompleteButton.click()
        await page.waitForTimeout(1000)

        // Verify status updates to "completed"
        await expect(page.getByText(/completed/i)).toBeVisible({ timeout: 3000 })

        // Verify status in database
        const { data: completedRequest } = await supabase
          .from('maintenance_requests')
          .select('status')
          .eq('id', request!.id)
          .single()

        expect(completedRequest?.status).toBe('completed')
      }
    }
  })
})
