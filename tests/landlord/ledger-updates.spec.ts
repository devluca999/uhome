import { test, expect } from '@playwright/test'
import {
  createTestLandlord,
  createTestTenant,
  generateTestEmail,
  loginAsLandlord,
  getSupabaseClient,
} from '../helpers/auth-helpers'
import { deleteUserAndData } from '../helpers/db-helpers'

test.describe('Ledger Updates and Charts', () => {
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

  test('should verify ledger displays rent records with correct status', async ({ page }) => {
    const supabase = getSupabaseClient()
    const today = new Date()
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      .toISOString()
      .split('T')[0]
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      .toISOString()
      .split('T')[0]

    // Create multiple rent records with different statuses
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

    // Login and navigate to finances page
    await loginAsLandlord(page, landlordEmail, password)
    await page.goto('/landlord/finances')
    await page.waitForLoadState('networkidle')

    // Verify records appear in ledger
    // Check for amounts
    await expect(page.getByText('$2,500').or(page.getByText('$2500'))).toBeVisible()

    // Verify status badges display (paid and pending)
    await expect(page.getByText(/paid/i)).toBeVisible()
    await expect(page.getByText(/pending/i)).toBeVisible()
  })

  test('should verify financial charts render', async ({ page }) => {
    const supabase = getSupabaseClient()

    // Create rent records for chart data
    const { data: rentRecord } = await supabase
      .from('rent_records')
      .insert({
        property_id: propertyId!,
        tenant_id: tenantRecordId!,
        amount: 2500,
        due_date: new Date().toISOString().split('T')[0],
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    expect(rentRecord).toBeTruthy()

    await loginAsLandlord(page, landlordEmail, password)
    await page.goto('/landlord/finances')
    await page.waitForLoadState('networkidle')

    // Verify KPI strip is displayed
    await expect(page.getByText(/collected|income|total/i)).toBeVisible({ timeout: 5000 })

    // Verify charts are rendered (look for SVG elements which recharts uses)
    const charts = page.locator('svg').filter({ hasText: /./ })
    const chartCount = await charts.count()
    expect(chartCount).toBeGreaterThan(0)
  })
})

