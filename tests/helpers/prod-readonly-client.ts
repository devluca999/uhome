/**
 * Production read-only Supabase client.
 *
 * Uses anon key only. Hard runtime write-guard: throws if insert, update, upsert,
 * or delete is called when SUPABASE_ENV=production. For use in prod smoke tests only.
 *
 * Gate: PROD_SMOKE_TEST=true and SUPABASE_ENV=production
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const WRITE_METHODS = new Set(['insert', 'update', 'upsert', 'delete'])

const WRITE_GUARD_MSG =
  '❌ PROD READ-ONLY: insert/update/upsert/delete are not allowed against production. ' +
  'Production smoke tests must be read-only.'

function wrapBuilder<T extends object>(builder: T): T {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (WRITE_METHODS.has(prop as string)) {
        return () => {
          throw new Error(WRITE_GUARD_MSG)
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}

/**
 * Create a production read-only client (anon key only).
 * Write methods throw immediately - no network call is made.
 */
export function createProdReadonlyClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || ''
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required for prod smoke tests')
  }

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const originalFrom = client.from.bind(client)
  ;(client as { from: (table: string) => unknown }).from = (table: string) => {
    const builder = originalFrom(table)
    return wrapBuilder(builder as object)
  }

  return client
}

/**
 * Whitelist of tables allowed for read-only prod smoke queries.
 */
export const PROD_SMOKE_READ_ONLY_TABLES = [
  'rent_records',
  'expenses',
  'users',
  'properties',
  'tenants',
  'leases',
  'maintenance_requests',
  'documents',
  'messages',
] as const
