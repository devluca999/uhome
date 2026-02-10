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

// All public tables that must have RLS (from schema + migrations)
const REQUIRED_TABLES = new Set([
  'users',
  'organizations',
  'memberships',
  'subscriptions',
  'properties',
  'households',
  'tenants',
  'maintenance_requests',
  'documents',
  'rent_records',
  'leases',
  'units',
  'tenant_invites',
  'tasks',
  'notes',
  'messages',
  'notifications',
  'expenses',
  'property_groups',
  'property_group_assignments',
  'user_property_types',
  'receipt_settings',
  'rate_limit_tracking',
  'abuse_events',
  'admin_audit_logs',
  'admin_metrics',
  'admin_upload_logs',
  'admin_security_logs',
  'admin_quota_config',
  'support_tickets',
  'waitlist',
  'promo_codes',
  'newsletter_campaigns',
  'leads',
  'data_deletion_requests',
  'data_export_requests',
  'compliance_audit_log',
  'email_deliveries',
  'email_preferences',
  'push_subscriptions',
  'stripe_connect_accounts',
  'payments',
  'payment_settings',
  'app_releases',
  'feature_flags',
  'release_events',
  'scraper_runs',
  'scraper_kill_switch',
  'lead_import_events',
  'lead_field_mappings',
  'entity_audit_log',
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
