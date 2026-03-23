/**
 * RLS Coverage Verification Script
 *
 * Parses migration files and schema to ensure all public tables have
 * ROW LEVEL SECURITY enabled. Fails CI if any table lacks RLS.
 *
 * Run: npx tsx scripts/verify-rls-coverage.ts
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')
const SCHEMA_FILE = join(process.cwd(), 'supabase', 'schema.sql')

// Public tables that must have RLS enabled in an active migration (supabase/migrations/*.sql, not archive/).
// Tables only created in archive/ are excluded so `supabase db reset` + CI stay consistent.
const REQUIRED_TABLES = new Set([
  'users',
  'organizations',
  'memberships',
  'subscriptions',
  'properties',
  'households',
  'units',
  'leases',
  'tenants',
  'tenant_invites',
  'maintenance_requests',
  'documents',
  'rent_records',
  'expenses',
  'messages',
  'notifications',
  'tasks',
  'notes',
  'receipt_settings',
  'user_property_types',
  'property_groups',
  'property_group_assignments',
  'rate_limit_tracking',
  'abuse_events',
  'onboarding_templates',
  'onboarding_submissions',
  'admin_metrics',
  'admin_upload_logs',
  'admin_security_logs',
  'admin_audit_logs',
  'subscription_limits',
  'stripe_connect_accounts',
  'payments',
  'payment_settings',
])

function extractRlsEnabledTables(content: string): Set<string> {
  const tables = new Set<string>()
  const regex = /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi
  let match
  while ((match = regex.exec(content)) !== null) {
    tables.add(match[1].toLowerCase())
  }
  return tables
}

function main() {
  const rlsEnabled = new Set<string>()

  // Read schema.sql
  try {
    const schema = readFileSync(SCHEMA_FILE, 'utf-8')
    for (const t of extractRlsEnabledTables(schema)) {
      rlsEnabled.add(t)
    }
  } catch (err) {
    console.warn('Could not read schema.sql:', err)
  }

  // Read all migration files
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))
  for (const file of files.sort()) {
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
    for (const t of extractRlsEnabledTables(content)) {
      rlsEnabled.add(t)
    }
  }

  const missing: string[] = []
  for (const table of REQUIRED_TABLES) {
    if (!rlsEnabled.has(table.toLowerCase())) {
      missing.push(table)
    }
  }

  if (missing.length > 0) {
    console.error('RLS verification failed: the following tables lack ROW LEVEL SECURITY:')
    missing.forEach((t) => console.error('  -', t))
    console.error('\nAdd "ALTER TABLE public.' + missing[0] + ' ENABLE ROW LEVEL SECURITY;" to a migration.')
    process.exit(1)
  }

  console.log('RLS verification passed: all', REQUIRED_TABLES.size, 'tables have RLS enabled.')
}

main()
