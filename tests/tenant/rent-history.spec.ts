import { test, expect } from '@playwright/test'
import {
  createTestLandlord,
  createTestTenant,
  generateTestEmail,
  loginAsTenant,
  getSupabaseClient,
} from '../helpers/auth-helpers'
import { deleteUserAndData } from '../helpers/db-helpers'

test.describe('Tenant Rent History', () => {
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

  test('should view rent history on dashboard', async ({ page }) => {
    const supabase = getSupabaseClient()
    const today = new Date()
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      .toISOString()
      .split('T')[0]
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      .toISOString()
      .split('T')[0]

    // Create rent records for tenant
    const { data: paidRecord } = await supabase
      .from('rent_records')
      .insert({
        property_id: propertyId!,
        tenant_id: tenantRecordId!,
        amount: 2500,
        due_date: lastMonth,
        status: 'paid',
        paid_date: lastMonth,
      })
      .select()
      .single()

    const { data: pendingRecord } = await supabase
      .from('rent_records')
      .insert({
        property_id: propertyId!,
        tenant_id: tenantRecordId!,
        amount: 2500,
        due_date: nextMonth,
        status: 'pending',
      })
      .select()
      .single()

    expect(paidRecord).toBeTruthy()
    expect(pendingRecord).toBeTruthy()

    // Login as tenant
    await loginAsTenant(page, tenantEmail, password)

    // Verify rent status is displayed on dashboard
    await expect(page.getByText(/rent|payment/i)).toBeVisible({ timeout: 5000 })

    // Verify tenant can see their rent records
    // The dashboard should show rent information
    await expect(page.locator('h1')).toContainText(/dashboard/i)
  })

  test('should verify tenant only sees their own rent records', async ({ page }) => {
    const supabase = getSupabaseClient()

    // Create another tenant and property (different landlord)
    const otherLandlordEmail = generateTestEmail('landlord2')
    const { userId: otherLandlordId } = await createTestLandlord(otherLandlordEmail, password)
    const { data: otherProperty } = await supabase
      .from('properties')
      .insert({
        owner_id: otherLandlordId!,
        name: 'Other Property',
        rent_amount: 3000,
      })
      .select()
      .single()

    const otherTenantEmail = generateTestEmail('tenant2')
    const { userId: otherTenantId } = await createTestTenant(otherTenantEmail, password)
    const { data: otherTenantRecord } = await supabase
      .from('tenants')
      .insert({
        user_id: otherTenantId!,
        property_id: otherProperty!.id,
        move_in_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    // Create rent record for other tenant
    await supabase.from('rent_records').insert({
      property_id: otherProperty!.id,
      tenant_id: otherTenantRecord!.id,
      amount: 3000,
      due_date: new Date().toISOString().split('T')[0],
      status: 'pending',
    })

    // Create rent record for our tenant
    await supabase.from('rent_records').insert({
      property_id: propertyId!,
      tenant_id: tenantRecordId!,
      amount: 2500,
      due_date: new Date().toISOString().split('T')[0],
      status: 'pending',
    })

    // Login as our tenant
    await loginAsTenant(page, tenantEmail, password)

    // Verify tenant only sees their own rent amount ($2500, not $3000)
    await expect(page.getByText('$2,500').or(page.getByText('$2500'))).toBeVisible()
    await expect(page.getByText('$3,000')).not.toBeVisible()

    // Cleanup other landlord
    if (otherLandlordId) {
      await deleteUserAndData(otherLandlordId)
    }
    if (otherTenantId) {
      await deleteUserAndData(otherTenantId)
    }
  })
})

