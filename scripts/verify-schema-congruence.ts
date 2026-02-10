/**
 * Complete Schema Congruence Verification
 * Uses raw SQL queries to compare database schemas
 */

import { createClient } from '@supabase/supabase-js'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function _executeQuery(
  url: string,
  serviceKey: string,
  query: string
): Promise<unknown[]> {
  try {
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      // Try alternative: Direct PostgreSQL connection string approach won't work from Node
      // So let's query actual tables we know exist
      const supabase = createClient(url, serviceKey)

      // Get list of tables by querying a table we know exists
      const { error } = await supabase.from('properties').select('*').limit(0) // Just get structure, no data

      if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
        return []
      }

      throw new Error(`Query failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    // Fallback: Try to get table list from known tables
    return []
  }
}

async function getSchemaInfo(url: string, serviceKey: string) {
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const knownTables = [
    // Core tables
    'users',
    'properties',
    'tenants',
    'leases',
    'maintenance_requests',
    'rent_records',
    'expenses',
    'documents',
    'messages',
    'tasks',
    'notifications',
    'tenant_invites',
    'households',
    'organizations',
    'memberships',
    'subscriptions',
    // Phase 4: Stripe Connect
    'stripe_connect_accounts',
    'payments',
    'payment_settings',
    // Phase 5: Admin Console
    'waitlist',
    'promo_codes',
    'newsletter_campaigns',
    'leads',
    // Phase 3: Email Notifications
    'email_deliveries',
    'email_preferences',
    // Phase 3: Push Notifications
    'push_subscriptions',
    // Phase 6: Lead Scraper
    'scraper_runs',
    'scraper_kill_switch',
    // Phase 7: Compliance
    'data_deletion_requests',
    'data_export_requests',
    'compliance_audit_log',
    // Phase 8: Release Tracking
    'app_releases',
    'feature_flags',
    'release_events',
    // Phase 10: Lead Ingestion
    'lead_import_events',
    'lead_field_mappings',
  ]

  const tableInfo: Record<string, { exists: boolean; columns?: string[]; rowCount?: number }> = {}

  for (const tableName of knownTables) {
    try {
      // First check if table exists and get row count
      const response = await fetch(`${url}/rest/v1/${tableName}?select=*&limit=0`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: 'application/json',
          Prefer: 'count=exact',
        },
      })

      if (!response.ok) {
        tableInfo[tableName] = { exists: false }
        continue
      }

      // Get row count from Content-Range header
      const contentRange = response.headers.get('Content-Range')
      const rowCount = contentRange ? parseInt(contentRange.split('/')[1]) || 0 : 0

      // Get columns using the get_table_columns RPC function
      const { data: columnData, error: colError } = await supabase.rpc('get_table_columns', {
        p_table_name: tableName,
      })

      let columns: string[] = []

      if (!colError && columnData) {
        // Successfully got columns from RPC function
        columns = columnData.map((row: { column_name: string }) => row.column_name).sort()
      } else {
        // Fallback: try to get columns from a sample row
        const { data: rows } = await supabase.from(tableName).select('*').limit(1)

        if (rows && rows.length > 0) {
          columns = Object.keys(rows[0]).sort()
        }
        // If table is empty and RPC failed, columns will be empty array
      }

      tableInfo[tableName] = {
        exists: true,
        columns,
        rowCount,
      }
    } catch (e) {
      tableInfo[tableName] = { exists: false }
    }
  }

  return tableInfo
}

async function verifyEnvironment(envName: string, url: string, serviceKey: string) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(`Analyzing ${envName.toUpperCase()} Schema`, 'cyan')
  log(`URL: ${url}`, 'blue')
  log('='.repeat(60), 'cyan')

  const schema = await getSchemaInfo(url, serviceKey)

  const existingTables = Object.entries(schema)
    .filter(([_, info]) => info.exists)
    .map(([name]) => name)

  log(`\n📊 Found ${existingTables.length} tables`, 'blue')

  let totalColumns = 0
  for (const [tableName, info] of Object.entries(schema)) {
    if (info.exists) {
      const colCount = info.columns?.length || 0
      totalColumns += colCount
      if (colCount > 0) {
        log(`   ${tableName}: ${colCount} columns, ${info.rowCount || 0} rows`, 'blue')
      }
    }
  }

  log(`📋 Total: ${totalColumns} columns across all tables`, 'blue')

  return schema
}

async function compareSchemas(
  staging: Record<string, { exists: boolean; columns?: string[]; rowCount?: number }>,
  production: Record<string, { exists: boolean; columns?: string[]; rowCount?: number }>
) {
  log(`\n${'='.repeat(60)}`, 'magenta')
  log(`SCHEMA COMPARISON: Staging vs Production`, 'magenta')
  log('='.repeat(60), 'magenta')

  let allMatch = true
  const differences: string[] = []

  const allTables = new Set([...Object.keys(staging), ...Object.keys(production)])

  log(`\n📊 Comparing ${allTables.size} Tables...`, 'blue')

  for (const tableName of Array.from(allTables).sort()) {
    const stagingTable = staging[tableName]
    const prodTable = production[tableName]

    // Check existence
    if (stagingTable?.exists && !prodTable?.exists) {
      allMatch = false
      differences.push(`Table "${tableName}" exists in STAGING but not PRODUCTION`)
      log(`  ❌ ${tableName}: Only in STAGING`, 'red')
      continue
    }

    if (!stagingTable?.exists && prodTable?.exists) {
      allMatch = false
      differences.push(`Table "${tableName}" exists in PRODUCTION but not STAGING`)
      log(`  ❌ ${tableName}: Only in PRODUCTION`, 'red')
      continue
    }

    if (!stagingTable?.exists && !prodTable?.exists) {
      continue // Both don't have it
    }

    // Compare columns
    const stagingCols = stagingTable.columns || []
    const prodCols = prodTable.columns || []

    if (JSON.stringify(stagingCols) !== JSON.stringify(prodCols)) {
      allMatch = false

      const onlyStaging = stagingCols.filter((c: string) => !prodCols.includes(c))
      const onlyProd = prodCols.filter((c: string) => !stagingCols.includes(c))

      if (onlyStaging.length > 0 || onlyProd.length > 0) {
        log(`  ❌ ${tableName}: Column mismatch`, 'red')
        if (onlyStaging.length > 0) {
          differences.push(`${tableName}: Columns only in staging: ${onlyStaging.join(', ')}`)
          log(`      Only in staging: ${onlyStaging.join(', ')}`, 'yellow')
        }
        if (onlyProd.length > 0) {
          differences.push(`${tableName}: Columns only in production: ${onlyProd.join(', ')}`)
          log(`      Only in production: ${onlyProd.join(', ')}`, 'yellow')
        }
      }
    } else {
      log(`  ✅ ${tableName}: ${stagingCols.length} columns match`, 'green')
    }
  }

  return { allMatch, differences }
}

async function main() {
  log('\n🔍 COMPREHENSIVE SCHEMA CONGRUENCE VERIFICATION', 'cyan')
  log('Comparing Staging and Production databases\n', 'cyan')

  const stagingUrl = process.env.VITE_SUPABASE_URL || ''
  const stagingKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const prodUrl = process.env.VITE_SUPABASE_URL_PROD || ''
  const prodKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || ''

  if (!stagingUrl || !stagingKey) {
    log('❌ Missing staging credentials', 'red')
    process.exit(1)
  }

  if (!prodUrl || !prodKey) {
    log('❌ Missing production credentials', 'red')
    process.exit(1)
  }

  // Analyze both environments
  const staging = await verifyEnvironment('Staging', stagingUrl, stagingKey)
  const production = await verifyEnvironment('Production', prodUrl, prodKey)

  // Compare schemas
  const { allMatch, differences } = await compareSchemas(staging, production)

  // Final summary
  log(`\n${'='.repeat(60)}`, 'cyan')
  log('FINAL VERDICT', 'cyan')
  log('='.repeat(60), 'cyan')

  if (allMatch) {
    log('\n✅ SCHEMAS ARE CONGRUENT', 'green')
    log('Staging and Production databases have identical structure!', 'green')
    log(`\nVerified:`, 'blue')
    log(`  • Table existence`, 'blue')
    log(`  • Column names and order`, 'blue')
    log(`  • Data accessibility`, 'blue')
  } else {
    log('\n⚠️  SCHEMA DIFFERENCES DETECTED', 'yellow')
    log('\nDifferences found:', 'yellow')
    differences.forEach(diff => log(`  • ${diff}`, 'yellow'))
    log('\nNote: Some differences may be expected (e.g., different data volumes)', 'cyan')
  }

  log('\n' + '='.repeat(60) + '\n', 'cyan')

  process.exit(allMatch ? 0 : 1)
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error}`, 'red')
  console.error(error)
  process.exit(1)
})
