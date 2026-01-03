import { test, expect } from '@playwright/test'
import {
  createTestLandlord,
  generateTestEmail,
  loginAsLandlord,
  getSupabaseClient,
} from '../helpers/auth-helpers'
import { deleteUserAndData, verifyPropertyExists } from '../helpers/db-helpers'
import { PropertiesPage } from '../helpers/page-objects/properties-page'

test.describe('Property Creation', () => {
  let landlordEmail: string
  let password: string
  let userId: string | null = null

  test.beforeEach(async () => {
    landlordEmail = generateTestEmail('landlord')
    password = 'testpassword123'
    const { userId: createdUserId, error } = await createTestLandlord(landlordEmail, password)
    expect(error).toBeNull()
    userId = createdUserId
  })

  test.afterEach(async () => {
    if (userId) {
      await deleteUserAndData(userId)
      userId = null
    }
  })

  test('should create property without units', async ({ page }) => {
    await loginAsLandlord(page, landlordEmail, password)

    const propertiesPage = new PropertiesPage(page)
    await propertiesPage.goto()

    // Click Add Property button
    await propertiesPage.clickAddProperty()

    // Fill property form
    const propertyName = `Test Property ${Date.now()}`
    await page.fill('input[id="name"]', propertyName)
    await page.fill('input[id="address"]', '123 Test Street')
    await page.fill('input[id="rent_amount"]', '2500')

    // Submit form
    await propertiesPage.submitPropertyForm()

    // Wait for property to appear in list
    await propertiesPage.verifyPropertyInList(propertyName)

    // Verify property exists in database
    const supabase = getSupabaseClient()
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .eq('name', propertyName)
      .single()

    expect(properties).toBeTruthy()
    expect(properties?.name).toBe(propertyName)
    expect(properties?.rent_amount).toBe('2500')
    expect(properties?.owner_id).toBe(userId)
  })

  test('should create property with grouping', async ({ page }) => {
    await loginAsLandlord(page, landlordEmail, password)

    const supabase = getSupabaseClient()

    // First create a property group
    const { data: group, error: groupError } = await supabase
      .from('property_groups')
      .insert({
        user_id: userId!,
        name: 'Test Group',
        type: 'custom',
      })
      .select()
      .single()

    expect(groupError).toBeNull()
    expect(group).toBeTruthy()

    // Navigate to properties page
    const propertiesPage = new PropertiesPage(page)
    await propertiesPage.goto()
    await propertiesPage.clickAddProperty()

    // Fill property form
    const propertyName = `Test Grouped Property ${Date.now()}`
    await page.fill('input[id="name"]', propertyName)
    await page.fill('input[id="rent_amount"]', '3000')

    // Select the property group (this may require clicking a checkbox or dropdown)
    // The UI may show groups as checkboxes or a multi-select
    const groupCheckbox = page.locator(`input[value="${group.id}"], input[type="checkbox"]`).first()
    if (await groupCheckbox.isVisible()) {
      await groupCheckbox.check()
    }

    // Submit form
    await propertiesPage.submitPropertyForm()

    // Wait for property to appear
    await propertiesPage.verifyPropertyInList(propertyName)

    // Verify group assignment in database
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('name', propertyName)
      .single()

    expect(property).toBeTruthy()

    const { data: assignment } = await supabase
      .from('property_group_assignments')
      .select('*')
      .eq('property_id', property!.id)
      .eq('group_id', group.id)
      .single()

    expect(assignment).toBeTruthy()
  })

  test('should edit property', async ({ page }) => {
    await loginAsLandlord(page, landlordEmail, password)

    const supabase = getSupabaseClient()

    // Create property via database first
    const { data: property } = await supabase
      .from('properties')
      .insert({
        owner_id: userId!,
        name: `Test Property ${Date.now()}`,
        rent_amount: 2000,
      })
      .select()
      .single()

    expect(property).toBeTruthy()

    // Navigate to property detail
    await page.goto(`/landlord/properties/${property!.id}`)
    await page.waitForLoadState('networkidle')

    // Click edit button (if there's an edit button)
    const editButton = page.getByRole('button', { name: /edit/i }).first()
    if (await editButton.isVisible()) {
      await editButton.click()
    } else {
      // Property detail page might have inline editing, try to find editable fields
      await page.fill('input[id="name"]', 'Updated Property Name')
    }

    // Update property name
    const updatedName = `Updated Property ${Date.now()}`
    await page.fill('input[id="name"]', updatedName)

    // Save changes
    await page.click('button[type="submit"]:has-text(/save|update/i)')

    // Wait for changes to be reflected
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5000 })

    // Verify changes in database
    const { data: updatedProperty } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property!.id)
      .single()

    expect(updatedProperty?.name).toBe(updatedName)
  })

  test('should show empty state when no properties exist', async ({ page }) => {
    await loginAsLandlord(page, landlordEmail, password)

    const propertiesPage = new PropertiesPage(page)
    await propertiesPage.goto()

    // Should show empty state
    await propertiesPage.verifyEmptyState()
  })
})

