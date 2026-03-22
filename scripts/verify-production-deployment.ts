#!/usr/bin/env tsx
/**
 * Post-Production Deployment Verification
 * 
 * Automated checks after deploying to production:
 * 1. Verify production environment variables
 * 2. Check demo features are excluded
 * 3. Validate critical endpoints
 * 4. Monitor for errors
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

// Production configuration
const PROD_URL = process.env.VITE_SUPABASE_URL || ''
const PROD_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const ENVIRONMENT = process.env.VITE_ENVIRONMENT || 'unknown'

interface CheckResult {
  check: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: any
}

const results: CheckResult[] = []

function logCheck(check: string, status: CheckResult['status'], message: string, details?: any) {
  results.push({ check, status, message, details })
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'
  console.log(`${icon} ${check}`)
  console.log(`   ${message}`)
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`)
  }
  console.log()
}

async function verifyEnvironment() {
  console.log('🔍 Environment Configuration')
  console.log('=' .repeat(60))
  console.log()

  // Check environment is set to production
  logCheck(
    'Environment variable',
    ENVIRONMENT === 'production' ? 'PASS' : 'FAIL',
    `VITE_ENVIRONMENT=${ENVIRONMENT}`,
    { expected: 'production', actual: ENVIRONMENT }
  )

  // Check Supabase URL is cloud
  const isCloudUrl = PROD_URL.includes('supabase.co') && !PROD_URL.includes('127.0.0.1')
  logCheck(
    'Supabase URL',
    isCloudUrl ? 'PASS' : 'FAIL',
    isCloudUrl ? 'Using cloud Supabase' : 'Not using cloud URL',
    { url: PROD_URL }
  )

  // Check demo mode vars are NOT present
  const tenantDevMode = process.env.VITE_TENANT_DEV_MODE_ENABLED
  const landlordDevMode = process.env.VITE_LANDLORD_DEV_MODE_ENABLED
  
  logCheck(
    'Demo features excluded',
    !tenantDevMode && !landlordDevMode ? 'PASS' : 'FAIL',
    !tenantDevMode && !landlordDevMode ? 'No dev mode variables' : 'Dev mode found in production!',
    { VITE_TENANT_DEV_MODE_ENABLED: tenantDevMode, VITE_LANDLORD_DEV_MODE_ENABLED: landlordDevMode }
  )
}

async function verifyDatabaseScoping() {
  console.log('🔒 Database Scoping Verification')
  console.log('=' .repeat(60))
  console.log()

  if (!PROD_URL || !PROD_ANON_KEY) {
    logCheck('Database connection', 'FAIL', 'Missing Supabase credentials')
    return
  }

  const supabase = createClient<Database>(PROD_URL, PROD_ANON_KEY)

  // Test 1: Unauthenticated access should be blocked
  const { data: unauthProps, error: propError } = await supabase
    .from('properties')
    .select('count')
  
  logCheck(
    'Property access control',
    propError !== null ? 'PASS' : 'WARN',
    propError ? 'Unauthenticated access blocked' : 'May need RLS policies',
    { error: propError?.message }
  )

  const { data: unauthTenants, error: tenantError } = await supabase
    .from('tenants')
    .select('count')
  
  logCheck(
    'Tenant access control',
    tenantError !== null ? 'PASS' : 'WARN',
    tenantError ? 'Unauthenticated access blocked' : 'May need RLS policies',
    { error: tenantError?.message }
  )

  const { data: unauthExpenses, error: expenseError } = await supabase
    .from('expenses')
    .select('count')
  
  logCheck(
    'Expense access control',
    expenseError !== null ? 'PASS' : 'WARN',
    expenseError ? 'Unauthenticated access blocked' : 'May need RLS policies',
    { error: expenseError?.message }
  )
}

async function verifyDeployedCode() {
  console.log('📦 Deployed Code Verification')
  console.log('=' .repeat(60))
  console.log()

  // Check critical files exist
  const fs = await import('fs')
  const path = await import('path')
  
  const criticalFiles = [
    'src/lib/data/property-service.ts',
    'src/lib/data/tenant-service.ts',
    'src/hooks/use-tenants.ts',
    'src/hooks/use-expenses.ts'
  ]

  for (const file of criticalFiles) {
    const exists = fs.existsSync(path.join(process.cwd(), file))
    logCheck(
      `File: ${file}`,
      exists ? 'PASS' : 'FAIL',
      exists ? 'Exists' : 'Missing'
    )
  }
}

async function main() {
  console.log('🚀 Production Deployment Verification')
  console.log('=' .repeat(80))
  console.log()
  console.log(`Environment: ${ENVIRONMENT}`)
  console.log(`Supabase URL: ${PROD_URL}`)
  console.log()

  try {
    await verifyEnvironment()
    await verifyDatabaseScoping()
    await verifyDeployedCode()

    console.log('=' .repeat(80))
    console.log('📊 Verification Summary')
    console.log('=' .repeat(80))
    console.log()

    const passed = results.filter(r => r.status === 'PASS').length
    const failed = results.filter(r => r.status === 'FAIL').length
    const warned = results.filter(r => r.status === 'WARN').length
    const total = results.length

    console.log(`✅ Passed: ${passed}/${total}`)
    console.log(`❌ Failed: ${failed}/${total}`)
    console.log(`⚠️  Warnings: ${warned}/${total}`)
    console.log()

    if (failed > 0) {
      console.log('❌ CRITICAL ISSUES FOUND - Manual intervention required!')
      console.log()
      console.log('Failed checks:')
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.check}: ${r.message}`)
      })
      console.log()
      console.log('🔄 Consider rolling back:')
      console.log('   git revert HEAD && git push origin main')
      process.exit(1)
    }

    if (warned > 0) {
      console.log('⚠️  Some warnings detected - review recommended')
      console.log()
      results.filter(r => r.status === 'WARN').forEach(r => {
        console.log(`  - ${r.check}: ${r.message}`)
      })
    }

    console.log()
    console.log('✅ Production deployment verification complete!')
    console.log()
    console.log('📋 Manual testing checklist:')
    console.log('   1. Login as real landlord')
    console.log('   2. Verify Dashboard shows scoped data')
    console.log('   3. Verify Finances shows scoped data')
    console.log('   4. Compare Dashboard vs Finances (both yearly)')
    console.log('   5. Test CRUD operations')
    console.log('   6. Check for console errors')
    console.log()

    process.exit(0)
  } catch (error) {
    console.error('💥 Fatal error during verification:', error)
    process.exit(1)
  }
}

main()
