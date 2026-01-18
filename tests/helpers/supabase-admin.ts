/**
 * Supabase Admin Helper
 * 
 * Re-exports the getSupabaseAdminClient function from db-helpers for backward compatibility.
 * Tests import this module to get admin access to Supabase (bypasses RLS).
 */

export { getSupabaseAdminClient } from './db-helpers'

