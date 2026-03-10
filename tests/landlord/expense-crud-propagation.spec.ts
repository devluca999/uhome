import { test, expect } from '@playwright/test'
import {
  createTestLandlord,
  createTestTenant,
  generateTestEmail,
  loginAsLandlord,
} from '../helpers/auth-helpers'
import { deleteUserAndData } from '../helpers/db-helpers'
import { getSupabaseAdminClient } from '../helpers/db-helpers'

function parseMoney(text: string | null): number {
  if (!text) return 0
  return parseFloat(text.replace(/[^0-9.-]+/g, ''))
}

test.describe('Expense CRUD propagates across app', () => {
  test.setTimeout(120_000)
  let landlordEmail: string
  let tenantEmail: string
  let password: string
  let landlordId: string | null = null
  let tenantId: string | null = null
  let propertyId: string | null = null
  let tenantRecordId: string | null = null
  let expenseAId: string | null = null

  test.beforeEach(async () => {
    password = 'testpassword123'
    landlordEmail = generateTestEmail('landlord')
    tenantEmail = generateTestEmail('tenant')

    const { userId: createdLandlordId, error: landlordError } = await createTestLandlord(
      landlordEmail,
      password
    )
    expect(landlordError).toBeNull()
    landlordId = createdLandlordId

    const { userId: createdTenantId, error: tenantError } = await createTestTenant(
      tenantEmail,
      password
    )
    expect(tenantError).toBeNull()
    tenantId = createdTenantId

    const supabase = getSupabaseAdminClient()

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        owner_id: landlordId,
        name: `Test Property ${Date.now()}`,
        rent_amount: 2000,
      })
      .select()
      .single()

    expect(propertyError).toBeNull()
    propertyId = property!.id

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

    const today = new Date().toISOString().split('T')[0]

    // Paid rent in current month so dashboard KPIs are non-zero.
    const { error: rentError } = await supabase.from('rent_records').insert({
      property_id: propertyId,
      tenant_id: tenantRecordId,
      amount: 2000,
      due_date: today,
      status: 'paid',
      paid_date: today,
    })
    expect(rentError).toBeNull()

    // Two expenses so deleting one doesn't trigger fallback data paths.
    const { data: insertedExpenses, error: expenseError } = await supabase
      .from('expenses')
      .insert([
        {
          property_id: propertyId,
          description: 'Expense A',
          amount: 100,
          expense_date: today,
          category: 'maintenance',
          is_recurring: false,
        },
        {
          property_id: propertyId,
          description: 'Expense B',
          amount: 30,
          expense_date: today,
          category: 'repairs',
          is_recurring: false,
        },
      ])
      .select('id, description')

    expect(expenseError).toBeNull()
    expenseAId = insertedExpenses?.find(e => e.description === 'Expense A')?.id ?? null
    expect(expenseAId).toBeTruthy()
  })

  test.afterEach(async () => {
    if (landlordId) await deleteUserAndData(landlordId)
    if (tenantId && tenantId !== landlordId) await deleteUserAndData(tenantId)
    landlordId = null
    tenantId = null
    propertyId = null
    tenantRecordId = null
    expenseAId = null
  })

  test('edit + delete expense updates dashboard math', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept())

    await loginAsLandlord(page, landlordEmail, password)
    await page.goto('/landlord/dashboard')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(750) // allow KPI animations to settle

    const expensesBefore = parseMoney(
      await page.locator('[data-testid="dashboard-expenses"] .text-2xl').textContent()
    )
    const netBefore = parseMoney(
      await page.locator('[data-testid="dashboard-net-income"] .text-2xl').textContent()
    )

    // Initial: expenses = 130, revenue = 2000 => net = 1870
    expect(expensesBefore).toBeGreaterThan(0)

    await page.goto('/landlord/finances')
    await page.waitForLoadState('networkidle')

    // Edit Expense A from 100 -> 150
    const expenseARow = expenseAId
      ? page.locator(`[data-testid="finances-expense-row-${expenseAId}"]`)
      : page.locator('[data-expense-name="Expense A"]').first()
    await expenseARow.waitFor({ state: 'visible', timeout: 10000 })
    await expenseARow.locator('button[aria-label="Edit expense"]').click()
    // Ensure required selects are valid (some environments may not hydrate property_id on seeded rows)
    if (propertyId) {
      await page.selectOption('select#property', propertyId)
    }
    await page.fill('input#amount', '150')
    await page.click('button[type="submit"]')
    // Wait for edit form to close (indicates successful update)
    await expect(page.locator('input#amount')).toBeHidden({ timeout: 15000 })

    await page.goto('/landlord/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(750)

    const expensesAfterEdit = parseMoney(
      await page.locator('[data-testid="dashboard-expenses"] .text-2xl').textContent()
    )
    const netAfterEdit = parseMoney(
      await page.locator('[data-testid="dashboard-net-income"] .text-2xl').textContent()
    )

    const expenseDeltaEdit = expensesAfterEdit - expensesBefore
    const netDeltaEdit = netBefore - netAfterEdit
    // Invariant: net should move by exactly the expense delta.
    expect(Math.abs(expenseDeltaEdit - netDeltaEdit)).toBeLessThan(0.5)
    expect(expenseDeltaEdit).toBeGreaterThan(0)

    // Delete Expense A
    await page.goto('/landlord/finances')
    await page.waitForLoadState('networkidle')

    const expenseARow2 = expenseAId
      ? page.locator(`[data-testid="finances-expense-row-${expenseAId}"]`)
      : page.locator('[data-expense-name="Expense A"]').first()
    await expenseARow2.waitFor({ state: 'visible', timeout: 10000 })
    await expenseARow2.locator('button[aria-label="Delete expense"]').click()
    // Ensure row is actually removed from the list
    if (expenseAId) {
      await expect(page.locator(`[data-testid="finances-expense-row-${expenseAId}"]`)).toHaveCount(0, {
        timeout: 15000,
      })
    }

    await page.goto('/landlord/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(750)

    const expensesAfterDelete = parseMoney(
      await page.locator('[data-testid="dashboard-expenses"] .text-2xl').textContent()
    )
    const netAfterDelete = parseMoney(
      await page.locator('[data-testid="dashboard-net-income"] .text-2xl').textContent()
    )

    const expenseDeltaDelete = expensesAfterEdit - expensesAfterDelete
    const netDeltaDelete = netAfterDelete - netAfterEdit
    expect(Math.abs(expenseDeltaDelete - netDeltaDelete)).toBeLessThan(0.5)
    expect(expenseDeltaDelete).toBeGreaterThan(0)
  })
})

