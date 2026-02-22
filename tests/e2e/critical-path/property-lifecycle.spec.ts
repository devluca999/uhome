/**
 * Property Lifecycle E2E Tests
 *
 * Tests the full property creation, detail view, expense visibility,
 * active/inactive toggle, and data integrity.
 */

import { test, expect } from '@playwright/test'
import { seedTestScenario, type SeededData } from '../../helpers/seed'
import { getSupabaseAdminClient, cleanupTestUser } from '../../helpers/db-helpers'
import { generateTestEmail, createAndConfirmUser, loginAsLandlord } from '../../helpers/auth-helpers'

const PASSWORD = 'TestPassword123!'

test.describe('Property Lifecycle', () => {
  let landlordUserId: string
  let landlordEmail: string

  test.beforeEach(async () => {
    landlordEmail = generateTestEmail('prop-lifecycle')
    const { userId } = await createAndConfirmUser(landlordEmail, PASSWORD)
    landlordUserId = userId

    const admin = getSupabaseAdminClient()
    await admin.from('users').upsert({
      id: landlordUserId,
      email: landlordEmail,
      role: 'landlord',
    })
  })

  test.afterEach(async () => {
    if (landlordUserId) await cleanupTestUser(landlordUserId)
  })

  test('create property, verify in list and DB', async ({ page }) => {
    await loginAsLandlord(page, landlordEmail, PASSWORD)
    await page.goto('/landlord/properties')
    await page.waitForLoadState('networkidle')

    // Click "Add Property"
    await page.click('button:has-text("Add Property")')
    await page.waitForLoadState('networkidle')

    const propertyName = `Test Property ${Date.now()}`

    // Fill property form (IDs from property-form.tsx)
    await page.fill('#name', propertyName)
    await page.fill('#address', '456 Integration Test Blvd')
    await page.fill('#rent_amount', '2200')
    await page.fill('#rent_due_date', '5')

    // Submit
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // Should redirect back to properties list
    await page.waitForURL(/\/landlord\/properties/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify property appears in the list
    await expect(page.locator(`text=${propertyName}`)).toBeVisible({ timeout: 10000 })

    // Verify property exists in DB
    const admin = getSupabaseAdminClient()
    const { data: dbProperty, error } = await admin
      .from('properties')
      .select('*')
      .eq('owner_id', landlordUserId)
      .eq('name', propertyName)
      .single()

    expect(error).toBeNull()
    expect(dbProperty).toBeTruthy()
    expect(dbProperty!.rent_amount).toBe(2200)
    expect(dbProperty!.address).toBe('456 Integration Test Blvd')
    expect(dbProperty!.rent_due_date).toBe(5)
  })

  test('property detail shows rent amount', async ({ page }) => {
    // Seed a property via DB for deterministic data
    const admin = getSupabaseAdminClient()
    const { data: property } = await admin
      .from('properties')
      .insert({
        owner_id: landlordUserId,
        name: 'Rent Detail Property',
        address: '789 Detail Ave',
        rent_amount: 1850,
        rent_due_date: 1,
      })
      .select()
      .single()

    expect(property).toBeTruthy()

    await loginAsLandlord(page, landlordEmail, PASSWORD)
    await page.goto(`/landlord/properties/${property!.id}`)
    await page.waitForLoadState('networkidle')

    // Overview tab is default — verify rent amount displayed
    await expect(page.locator('text=$1,850')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Monthly Rent')).toBeVisible()
  })

  test('expense created via DB appears on finances page', async ({ page }) => {
    const admin = getSupabaseAdminClient()
    const { data: property } = await admin
      .from('properties')
      .insert({
        owner_id: landlordUserId,
        name: 'Expense Test Property',
        address: '100 Expense Rd',
        rent_amount: 1500,
        rent_due_date: 1,
      })
      .select()
      .single()

    expect(property).toBeTruthy()

    // Create expense via admin client (expenses table: description, amount, category, expense_date)
    const { error: expenseError } = await admin.from('expenses').insert({
      property_id: property!.id,
      amount: 350,
      description: 'Plumbing repair E2E test',
      category: 'maintenance',
      expense_date: new Date().toISOString().split('T')[0],
    })
    expect(expenseError).toBeNull()

    await loginAsLandlord(page, landlordEmail, PASSWORD)
    await page.goto('/landlord/finances')
    await page.waitForLoadState('networkidle')

    // Verify expense shows on the finances page
    await expect(
      page.locator('text=Plumbing repair E2E test').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('toggle property inactive and verify in DB', async ({ page }) => {
    const admin = getSupabaseAdminClient()
    const { data: property, error: insertError } = await admin
      .from('properties')
      .insert({
        owner_id: landlordUserId,
        name: 'Toggle Test Property',
        address: '200 Toggle St',
        rent_amount: 1200,
        rent_due_date: 1,
        is_active: true,
      })
      .select()
      .single()

    expect(insertError).toBeNull()
    expect(property).toBeTruthy()

    await loginAsLandlord(page, landlordEmail, PASSWORD)
    await page.goto(`/landlord/properties/${property!.id}`)
    await page.waitForLoadState('networkidle')

    // Verify initially active
    await expect(page.locator('text=Active').first()).toBeVisible({ timeout: 10000 })

    // Toggle the switch (aria-label based selector from property-detail.tsx)
    const toggle = page.locator('button[role="switch"][aria-label="Mark property inactive"]')
    await expect(toggle).toBeVisible({ timeout: 5000 })
    await toggle.click()
    await page.waitForTimeout(2000)

    // Verify UI updated to "Inactive"
    await expect(page.locator('p:has-text("Inactive")')).toBeVisible({ timeout: 5000 })

    // Verify in DB
    const { data: updatedProperty } = await admin
      .from('properties')
      .select('is_active')
      .eq('id', property!.id)
      .single()

    expect(updatedProperty!.is_active).toBe(false)
  })

  test('inactive property persists after page refresh', async ({ page }) => {
    const admin = getSupabaseAdminClient()
    const { data: property, error: insertError } = await admin
      .from('properties')
      .insert({
        owner_id: landlordUserId,
        name: 'Persist Inactive Property',
        address: '300 Persist Ln',
        rent_amount: 900,
        rent_due_date: 15,
        is_active: false,
      })
      .select()
      .single()

    expect(insertError).toBeNull()
    expect(property).toBeTruthy()

    await loginAsLandlord(page, landlordEmail, PASSWORD)
    await page.goto(`/landlord/properties/${property!.id}`)
    await page.waitForLoadState('networkidle')

    // Verify shows as inactive
    await expect(page.locator('p:has-text("Inactive")')).toBeVisible({ timeout: 10000 })

    // Refresh page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should still show inactive
    await expect(page.locator('p:has-text("Inactive")')).toBeVisible({ timeout: 10000 })
  })

  test('no duplicate property rows in DB after creation', async ({ page }) => {
    await loginAsLandlord(page, landlordEmail, PASSWORD)
    await page.goto('/landlord/properties')
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Add Property")')
    await page.waitForLoadState('networkidle')

    const uniqueName = `NoDupe Property ${Date.now()}`
    await page.fill('#name', uniqueName)
    await page.fill('#address', '999 Unique Ave')
    await page.fill('#rent_amount', '1000')

    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)
    await page.waitForURL(/\/landlord\/properties/, { timeout: 10000 })

    // Query DB for exact name match — should be exactly 1 row
    const admin = getSupabaseAdminClient()
    const { data: rows, error } = await admin
      .from('properties')
      .select('id')
      .eq('owner_id', landlordUserId)
      .eq('name', uniqueName)

    expect(error).toBeNull()
    expect(rows).toHaveLength(1)
  })
})
