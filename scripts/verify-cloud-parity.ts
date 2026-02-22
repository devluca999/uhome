/**
 * Verify connection to Supabase cloud project and schema parity with local migrations.
 *
 * Prerequisites:
 *   - .env.local with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - Optional: supabase login + supabase link for migration list / db diff
 *
 * Run: npx tsx scripts/verify-cloud-parity.ts
 *   or: npm run verify:cloud-parity
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { execSync } from 'child_process'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

// Server-only vars (no VITE_ prefix) — never client-facing
const CLOUD_URL = process.env.SUPABASE_CLOUD_URL
const CLOUD_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY_CLOUD

// Tables expected from active migrations (20240101 + 20240102 + 20240219*)
const EXPECTED_TABLES = [
  'users', 'organizations', 'memberships', 'subscriptions', 'properties',
  'households', 'units', 'leases', 'tenants', 'tenant_invites',
  'maintenance_requests', 'documents', 'rent_records', 'expenses',
  'messages', 'notifications', 'tasks', 'notes', 'receipt_settings',
  'user_property_types', 'property_groups', 'property_group_assignments',
  'rate_limit_tracking', 'abuse_events',
]

async function testConnection(url: string, serviceKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    return res.ok || res.status === 404 // 404 means REST root, still connected
  } catch (e) {
    return false
  }
}

async function getRemoteTables(
  url: string,
  serviceKey: string
): Promise<{ name: string; exists: boolean; rowCount: number }[]> {
  const results: { name: string; exists: boolean; rowCount: number }[] = []
  for (const table of EXPECTED_TABLES) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: 'application/json',
          Prefer: 'count=exact',
        },
      })
      const countHeader = res.headers.get('Content-Range')
      const rowCount = countHeader ? parseInt(countHeader.split('/')[1], 10) || 0 : 0
      results.push({ name: table, exists: res.ok, rowCount })
    } catch {
      results.push({ name: table, exists: false, rowCount: 0 })
    }
  }
  return results
}

function runCli(cmd: string): { ok: boolean; out: string } {
  try {
    const out = execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() })
    return { ok: true, out }
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string }
    return { ok: false, out: (err.stdout || err.stderr || String(e)) as string }
  }
}

function log(msg: string, color?: string) {
  const c = color ? `\x1b[${color}m` : ''
  const r = '\x1b[0m'
  console.log(`${c}${msg}${r}`)
}

async function main() {
  log('\n🔍 Supabase Cloud Connection & Parity Verification\n', '36')

  const url = CLOUD_URL
  const serviceKey = CLOUD_SERVICE_KEY

  if (!url || !serviceKey) {
    log('❌ Missing cloud credentials', '31')
    log('   Add to .env.local (server-only, never client-facing):', '33')
    log('      SUPABASE_CLOUD_URL=https://<project-ref>.supabase.co', '33')
    log('      SUPABASE_SERVICE_ROLE_KEY_PROD=<service-role-key>', '33')
    process.exit(1)
  }

  // 1. Connection test
  log('1. Testing connection...', '36')
  const connected = await testConnection(url, serviceKey)
  if (!connected) {
    log('   ❌ Connection failed. Check URL and network.', '31')
    process.exit(1)
  }
  log('   ✅ Connected to ' + url, '32')

  // 2. Table parity
  log('\n2. Checking table parity (expected from local migrations)...', '36')
  const remote = await getRemoteTables(url, serviceKey)
  const existing = remote.filter((r) => r.exists)
  const missing = remote.filter((r) => !r.exists)

  if (missing.length > 0) {
    log(`   ⚠️  Missing tables (${missing.length}):`, '33')
    missing.forEach((m) => log(`      - ${m.name}`, '33'))
  }
  log(`   Found ${existing.length}/${EXPECTED_TABLES.length} expected tables`, existing.length === EXPECTED_TABLES.length ? '32' : '33')
  if (existing.length > 0) {
    log('   Sample (first 5):', '90')
    existing.slice(0, 5).forEach((t) => log(`      ${t.name}: ${t.rowCount} rows`, '90'))
  }

  // 3. Migration list (if linked)
  log('\n3. Migration history (requires: supabase login + supabase link)...', '36')
  const migrationList = runCli('npx supabase migration list --linked')
  if (migrationList.ok) {
    log('   ✅ Migration list retrieved:', '32')
    migrationList.out.split('\n').forEach((line) => log('   ' + line, '90'))
  } else {
    if (migrationList.out.includes('not logged in') || migrationList.out.includes('Access token')) {
      log('   ⚠️  Run: supabase login', '33')
    }
    if (migrationList.out.includes('linked') || migrationList.out.includes('link')) {
      log('   ⚠️  Run: supabase link --project-ref <your-project-ref>', '33')
    }
    log('   (Skipping migration list - CLI not authenticated/linked)', '90')
  }

  // 4. Schema diff (if linked)
  log('\n4. Schema diff (local migrations vs remote)...', '36')
  const dbDiff = runCli('npx supabase db diff --linked --schema public')
  if (dbDiff.ok) {
    const trimmed = dbDiff.out.trim()
    if (!trimmed || trimmed.includes('No schema changes') || trimmed.includes('No differences')) {
      log('   ✅ No schema differences', '32')
    } else {
      log('   ⚠️  Differences found:', '33')
      log(trimmed, '33')
    }
  } else {
    log('   (Skipping - run supabase login + link for full diff)', '90')
  }

  // Summary
  log('\n' + '='.repeat(60), '36')
  const parityOk = missing.length === 0
  if (parityOk) {
    log('✅ Connection OK. Table parity OK.', '32')
  } else {
    log('⚠️  Connection OK. Some tables missing on remote.', '33')
    log('   Consider running: supabase db push --linked', '33')
  }
  log('='.repeat(60) + '\n', '36')

  process.exit(parityOk ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
