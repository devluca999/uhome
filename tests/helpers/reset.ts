/**
 * Test Reset & Cleanup Helpers
 * 
 * MANDATORY: All tests must call reset functions in beforeEach hooks.
 * Ensures no test leaves residue in staging database or storage.
 */

import { getSupabaseClient, getSupabaseAdminClient } from './db-helpers'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Reset dev mode state (localStorage, sessionStorage)
 * Call this in beforeEach hooks
 */
export async function resetDevState(page: any): Promise<void> {
  if (!page) return

  try {
    // Only clear storage if page has a valid context
    const url = page.url()
    if (url && url !== 'about:blank') {
      await page.evaluate(() => {
        try {
          localStorage.clear()
          sessionStorage.clear()
        } catch (e) {
          // Ignore security errors if page isn't fully loaded
        }
      })
    }
  } catch (error) {
    // Silently ignore - page may not be ready yet
  }
}

/**
 * Reset staging database fixtures
 * Deletes all test data tagged with is_test = true
 * Call this in beforeEach hooks
 */
export async function resetStagingFixtures(): Promise<void> {
  // Use admin client to bypass RLS for cleanup operations
  const supabase = getSupabaseAdminClient()

  try {
    // Delete in dependency order to avoid foreign key violations

    // Delete test work orders
    await supabase
      .from('maintenance_requests')
      .delete()
      .like('description', '%Test%')

    // Delete test tasks
    await supabase
      .from('tasks')
      .delete()
      .like('title', '%Test%')

    // Delete test messages
    await supabase
      .from('messages')
      .delete()
      .like('body', '%Test%')

    // Delete test documents (metadata)
    await supabase
      .from('documents')
      .delete()
      .like('file_name', '%test%')

    // Delete test tenants
    const { data: testTenants } = await supabase
      .from('tenants')
      .select('user_id')
      .not('user_id', 'is', null)

    if (testTenants) {
      const testUserIds = testTenants.map(t => t.user_id).filter(Boolean)
      if (testUserIds.length > 0) {
        // Delete test users (this will cascade to tenants)
        await supabase
          .from('users')
          .delete()
          .in('id', testUserIds)
          .or('email.like.%test.uhome.com%,email.like.%@test.%')
      }
    }

    // Delete test properties
    await supabase
      .from('properties')
      .delete()
      .or('name.like.%Test%')

    // Delete test households
    await supabase
      .from('households')
      .delete()
      .like('name', '%Test%')

    // Delete test invites
    await supabase
      .from('tenant_invites')
      .delete()
      .like('email', '%@test.%')

    // Delete test leases
    await supabase
      .from('leases')
      .delete()
      .like('notes', '%Test%')

    // Clean up rate limit tracking (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    await supabase
      .from('rate_limit_tracking')
      .delete()
      .lt('created_at', oneHourAgo)

    // Clean up abuse events (older than 1 hour)
    await supabase
      .from('abuse_events')
      .delete()
      .lt('created_at', oneHourAgo)
  } catch (error) {
    console.warn('Failed to reset staging fixtures:', error)
    // Don't throw - allow tests to continue even if cleanup fails
  }
}

/**
 * Cleanup storage (remove test uploads)
 * Call this in afterEach hooks
 */
export async function cleanupStorage(): Promise<void> {
  const supabase = getSupabaseClient()

  try {
    // List all files in documents bucket
    const { data: files, error: listError } = await supabase.storage
      .from('documents')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (listError) {
      console.warn('Failed to list storage files:', listError)
      return
    }

    if (!files || files.length === 0) return

    // Filter test files (by name pattern or metadata)
    const testFiles = files.filter(
      file =>
        file.name.includes('test') ||
        file.name.includes('Test') ||
        file.metadata?.dev_mode === 'true'
    )

    if (testFiles.length === 0) return

    // Delete test files
    const filePaths = testFiles.map(file => file.name)
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove(filePaths)

    if (deleteError) {
      console.warn('Failed to delete test files from storage:', deleteError)
    }
  } catch (error) {
    console.warn('Failed to cleanup storage:', error)
    // Don't throw - allow tests to continue
  }
}

/**
 * Close realtime subscriptions
 * Call this in afterEach hooks
 */
export async function closeSubscriptions(supabase: SupabaseClient): Promise<void> {
  try {
    // Remove all channel subscriptions
    const channels = supabase.getChannels()
    for (const channel of channels) {
      await supabase.removeChannel(channel)
    }
  } catch (error) {
    console.warn('Failed to close subscriptions:', error)
    // Don't throw - allow tests to continue
  }
}

/**
 * Comprehensive reset - calls all reset functions
 * Use this in beforeEach hooks for maximum safety
 */
export async function resetAll(page?: any): Promise<void> {
  if (page) {
    await resetDevState(page)
  }
  await resetStagingFixtures()
  // Note: cleanupStorage and closeSubscriptions should be called in afterEach
}

/**
 * Cleanup specific user's data
 * Useful for cleaning up after individual tests
 */
export async function cleanupUserData(userId: string): Promise<void> {
  // Use admin client to bypass RLS for cleanup operations
  const supabase = getSupabaseAdminClient()

  try {
    // Get user's properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', userId)

    if (properties && properties.length > 0) {
      const propertyIds = properties.map(p => p.id)

      // Delete related data
      await supabase.from('rent_records').delete().in('property_id', propertyIds)
      await supabase.from('maintenance_requests').delete().in('property_id', propertyIds)
      await supabase.from('documents').delete().in('property_id', propertyIds)
    }

    // Delete tenants
    await supabase.from('tenants').delete().eq('user_id', userId)

    // Delete properties
    await supabase.from('properties').delete().eq('owner_id', userId)

    // Delete user
    await supabase.from('users').delete().eq('id', userId)

    // Delete auth user (requires service key)
    const supabaseServiceKey = process.env.TEST_SUPABASE_SERVICE_KEY
    if (supabaseServiceKey) {
      try {
        await supabase.auth.admin.deleteUser(userId)
      } catch (error) {
        console.warn('Could not delete auth user:', error)
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup user data:', error)
  }
}

