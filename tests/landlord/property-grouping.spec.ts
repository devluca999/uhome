import { test, expect } from '@playwright/test'
import {
  createTestLandlord,
  generateTestEmail,
  loginAsLandlord,
  getSupabaseClient,
} from '../helpers/auth-helpers'
import { deleteUserAndData } from '../helpers/db-helpers'

test.describe('Property Grouping', () => {
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

  test('should create property group and assign property to it', async ({ page }) => {
    const supabase = getSupabaseClient()

    // Create property group via database
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

    // Create property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        owner_id: userId!,
        name: `Test Property ${Date.now()}`,
        rent_amount: 2500,
      })
      .select()
      .single()

    expect(propertyError).toBeNull()

    // Assign property to group
    const { error: assignmentError } = await supabase.from('property_group_assignments').insert({
      property_id: property!.id,
      group_id: group!.id,
    })

    expect(assignmentError).toBeNull()

    // Verify assignment exists
    const { data: assignment } = await supabase
      .from('property_group_assignments')
      .select('*')
      .eq('property_id', property!.id)
      .eq('group_id', group!.id)
      .single()

    expect(assignment).toBeTruthy()
  })
})

