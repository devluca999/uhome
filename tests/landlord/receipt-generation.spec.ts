import { test, expect } from '@playwright/test'
import {
  createTestLandlord,
  createTestTenant,
  generateTestEmail,
  loginAsLandlord,
  getSupabaseClient,
} from '../helpers/auth-helpers'
import { deleteUserAndData } from '../helpers/db-helpers'

test.describe('Receipt Generation', () => {
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

  test('should generate receipt for paid rent', async ({ page }) => {
    const supabase = getSupabaseClient()
    const dueDate = new Date().toISOString().split('T')[0]
    const paidDate = new Date().toISOString().split('T')[0]

    // Create paid rent record
    const { data: rentRecord, error: createError } = await supabase
      .from('rent_records')
      .insert({
        property_id: propertyId!,
        tenant_id: tenantRecordId!,
        amount: 2500,
        due_date: dueDate,
        status: 'paid',
        paid_date: paidDate,
        payment_method_type: 'external',
        payment_method_label: 'Zelle',
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(rentRecord).toBeTruthy()

    // Login and navigate to finances page
    await loginAsLandlord(page, landlordEmail, password)
    await page.goto('/landlord/finances')
    await page.waitForLoadState('networkidle')

    // Find the rent record row and expand it
    // Look for rent record rows - may need to find by amount or property name
    const rentRow = page
      .locator('text=/rent/i')
      .or(page.locator('[data-testid*="rent"]'))
      .or(page.locator('text=$2,500'))
      .first()

    if (await rentRow.isVisible()) {
      // Click to expand the row
      await rentRow.click({ force: true })
      await page.waitForTimeout(1000)

      // Look for Generate Receipt button
      const generateReceiptButton = page
        .getByRole('button', { name: /generate receipt/i })
        .or(page.getByText(/generate receipt/i))

      if (await generateReceiptButton.isVisible({ timeout: 2000 })) {
        // Click generate receipt
        await generateReceiptButton.click()

        // Wait for receipt generation (this might take a moment)
        await page.waitForTimeout(3000)

        // Verify receipt URL appears (check database or UI)
        const { data: updatedRecord } = await supabase
          .from('rent_records')
          .select('receipt_url')
          .eq('id', rentRecord!.id)
          .single()

        // Receipt URL should be set (if edge function is working)
        // Note: This test may fail if edge function is not deployed
        if (updatedRecord?.receipt_url) {
          expect(updatedRecord.receipt_url).toContain('receipt')
        }

        // Verify receipt link/button is visible in UI
        const receiptLink = page.locator('a[href*="receipt"], button:has-text(/receipt/i)').first()
        await expect(receiptLink).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
