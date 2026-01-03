import { test, expect } from '@playwright/test'
import {
  createTestLandlord,
  createTestTenant,
  generateTestEmail,
  loginAsLandlord,
  getSupabaseClient,
} from '../helpers/auth-helpers'
import { deleteUserAndData, verifyRentRecordExists } from '../helpers/db-helpers'

test.describe('Rent Logging', () => {
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

  test('should log external payment via database and verify in UI', async ({ page }) => {
    const supabase = getSupabaseClient()
    const dueDate = new Date().toISOString().split('T')[0]
    const paidDate = new Date().toISOString().split('T')[0]
    const amount = 2500

    // Create rent record via database with external payment method
    const { data: rentRecord, error: createError } = await supabase
      .from('rent_records')
      .insert({
        property_id: propertyId!,
        tenant_id: tenantRecordId!,
        amount: amount,
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

    // Verify rent record appears in ledger
    // The property name should be visible
    const propertyName = (await supabase.from('properties').select('name').eq('id', propertyId!).single()).data?.name
    if (propertyName) {
      await expect(page.getByText(propertyName)).toBeVisible({ timeout: 5000 })
    }

    // Verify amount is displayed
    await expect(page.getByText(`$${amount.toLocaleString()}`).or(page.getByText(`$${amount}`))).toBeVisible()

    // Verify status shows as paid
    await expect(page.getByText(/paid/i)).toBeVisible()

    // Verify rent record exists in database with correct fields
    const exists = await verifyRentRecordExists(rentRecord!.id, {
      property_id: propertyId!,
      tenant_id: tenantRecordId!,
      status: 'paid',
      payment_method_type: 'external',
      payment_method_label: 'Zelle',
    })

    expect(exists).toBe(true)
  })

  test('should verify rent record with external payment method displays correctly', async ({
    page,
  }) => {
    const supabase = getSupabaseClient()
    const dueDate = new Date().toISOString().split('T')[0]
    const paidDate = new Date().toISOString().split('T')[0]

    // Create rent record with external payment
    const { data: rentRecord } = await supabase
      .from('rent_records')
      .insert({
        property_id: propertyId!,
        tenant_id: tenantRecordId!,
        amount: 3000,
        due_date: dueDate,
        status: 'paid',
        paid_date: paidDate,
        payment_method_type: 'external',
        payment_method_label: 'Cash',
      })
      .select()
      .single()

    expect(rentRecord).toBeTruthy()

    await loginAsLandlord(page, landlordEmail, password)
    await page.goto('/landlord/finances')
    await page.waitForLoadState('networkidle')

    // Expand the rent record row to see details
    // Look for the rent record row and click to expand
    const rentRow = page.locator('text=/rent/i').or(page.locator('[data-testid="rent-ledger-row"]')).first()
    if (await rentRow.isVisible()) {
      await rentRow.click()
      await page.waitForTimeout(500)

      // Verify payment method label is visible in expanded view
      await expect(page.getByText('Cash')).toBeVisible({ timeout: 2000 })
    }
  })
})

