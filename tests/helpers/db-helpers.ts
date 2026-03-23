import './load-test-env'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isProduction } from './env-guard'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.TEST_SUPABASE_SERVICE_KEY || ''

/**
 * Get Supabase client for database operations
 * Uses anon key (respects RLS)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env / .env.local / .env.test'
    )
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Get Supabase admin client for admin operations
 * Uses service key (bypasses RLS, allows admin operations like creating users)
 * Hard-fails if called when SUPABASE_ENV=production
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (isProduction()) {
    throw new Error(
      '❌ getSupabaseAdminClient cannot be used against production. ' +
        'SUPABASE_ENV=production or VITE_SUPABASE_URL points to production. ' +
        'Tests and seeds must use local or staging.'
    )
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_KEY (or TEST_SUPABASE_SERVICE_KEY) in .env / .env.local / .env.test'
    )
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Clean up test data for a specific user
 * Note: This function is kept for backwards compatibility but deleteUserAndData is preferred
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  await deleteUserAndData(userId)
}

/**
 * Clean up test data by email pattern
 */
export async function cleanupTestDataByEmail(emailPattern: string): Promise<void> {
  const supabase = getSupabaseClient()

  // Find all test users
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .like('email', `%${emailPattern}%`)

  if (!users) return

  for (const user of users) {
    await cleanupTestUser(user.id)
  }
}

/**
 * Delete a user and all related data
 */
export async function deleteUserAndData(userId: string): Promise<void> {
  const supabase = getSupabaseClient()

  // Get user's properties first
  const { data: properties } = await supabase.from('properties').select('id').eq('owner_id', userId)

  if (properties) {
    const propertyIds = properties.map(p => p.id)

    // Delete rent records
    if (propertyIds.length > 0) {
      await supabase.from('rent_records').delete().in('property_id', propertyIds)
      await supabase.from('maintenance_requests').delete().in('property_id', propertyIds)
      await supabase.from('documents').delete().in('property_id', propertyIds)
    }
  }

  // Delete tenants
  await supabase.from('tenants').delete().eq('user_id', userId)

  // Delete properties
  await supabase.from('properties').delete().eq('owner_id', userId)

  // Delete property groups
  await supabase.from('property_groups').delete().eq('user_id', userId)

  // Delete user
  await supabase.from('users').delete().eq('id', userId)

  // Delete auth user (requires service key)
  if (supabaseServiceKey) {
    try {
      await supabase.auth.admin.deleteUser(userId)
    } catch (error) {
      console.warn('Could not delete auth user (may require service key):', error)
    }
  }
}

/**
 * Verify data exists in database
 */
export async function verifyPropertyExists(
  propertyId: string,
  expectedData?: { name?: string; owner_id?: string }
): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (error || !data) return false

  if (expectedData) {
    if (expectedData.name && data.name !== expectedData.name) return false
    if (expectedData.owner_id && data.owner_id !== expectedData.owner_id) return false
  }

  return true
}

/**
 * Verify tenant exists in database
 */
export async function verifyTenantExists(
  tenantId: string,
  expectedData?: { property_id?: string; user_id?: string }
): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId).single()

  if (error || !data) return false

  if (expectedData) {
    if (expectedData.property_id && data.property_id !== expectedData.property_id) return false
    if (expectedData.user_id && data.user_id !== expectedData.user_id) return false
  }

  return true
}

/**
 * Verify rent record exists in database
 */
export async function verifyRentRecordExists(
  recordId: string,
  expectedData?: {
    property_id?: string
    tenant_id?: string
    status?: string
    payment_method_type?: string
    payment_method_label?: string
  }
): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('rent_records')
    .select('*')
    .eq('id', recordId)
    .single()

  if (error || !data) return false

  if (expectedData) {
    if (expectedData.property_id && data.property_id !== expectedData.property_id) return false
    if (expectedData.tenant_id && data.tenant_id !== expectedData.tenant_id) return false
    if (expectedData.status && data.status !== expectedData.status) return false
    if (
      expectedData.payment_method_type &&
      data.payment_method_type !== expectedData.payment_method_type
    )
      return false
    if (
      expectedData.payment_method_label &&
      data.payment_method_label !== expectedData.payment_method_label
    )
      return false
  }

  return true
}

/**
 * Verify maintenance request exists in database
 */
export async function verifyMaintenanceRequestExists(
  requestId: string,
  expectedData?: { property_id?: string; tenant_id?: string; status?: string }
): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (error || !data) return false

  if (expectedData) {
    if (expectedData.property_id && data.property_id !== expectedData.property_id) return false
    if (expectedData.tenant_id && data.tenant_id !== expectedData.tenant_id) return false
    if (expectedData.status && data.status !== expectedData.status) return false
  }

  return true
}
