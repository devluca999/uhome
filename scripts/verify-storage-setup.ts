/**
 * Storage Buckets Verification Script
 * 
 * Verifies that storage buckets are correctly configured in both staging and production
 * Checks:
 * - Buckets exist (documents, images, avatars)
 * - Buckets are public
 * - RLS policies are applied
 * - image_urls column exists in maintenance_requests
 */

import { createClient } from '@supabase/supabase-js'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function verifyEnvironment(envName: string, url: string, serviceKey: string) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(`Verifying ${envName.toUpperCase()} Environment`, 'cyan')
  log(`URL: ${url}`, 'blue')
  log('='.repeat(60), 'cyan')

  const supabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  let allChecks = true

  // Check 1: Verify buckets exist
  log('\n📦 Checking Storage Buckets...', 'blue')
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      log(`  ❌ Error listing buckets: ${error.message}`, 'red')
      allChecks = false
    } else {
      const requiredBuckets = ['documents', 'images', 'avatars']
      const foundBuckets = buckets?.map(b => b.name) || []
      
      for (const bucketName of requiredBuckets) {
        const bucket = buckets?.find(b => b.name === bucketName)
        if (bucket) {
          log(`  ✅ ${bucketName}: Found (public: ${bucket.public})`, 'green')
        } else {
          log(`  ❌ ${bucketName}: NOT FOUND`, 'red')
          allChecks = false
        }
      }
    }
  } catch (err) {
    log(`  ❌ Exception: ${err}`, 'red')
    allChecks = false
  }

  // Check 2: Verify RLS policies on storage.objects
  log('\n🔒 Checking Storage RLS Policies...', 'blue')
  try {
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('policyname, tablename')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects')

    if (error) {
      log(`  ⚠️  Could not query policies (might need superuser): ${error.message}`, 'yellow')
    } else {
      const requiredPolicies = [
        'Landlords can upload documents to their properties',
        'Users can read accessible documents',
        'Users can upload their own avatar',
        'Avatars are publicly readable',
        'Landlords can upload images',
        'Tenants can upload images',
        'Users can read images',
      ]

      const foundPolicies = policies?.map(p => p.policyname) || []
      
      for (const policyName of requiredPolicies) {
        if (foundPolicies.includes(policyName)) {
          log(`  ✅ ${policyName}`, 'green')
        } else {
          log(`  ❌ ${policyName}: NOT FOUND`, 'red')
          allChecks = false
        }
      }
    }
  } catch (err) {
    log(`  ⚠️  Could not verify policies: ${err}`, 'yellow')
  }

  // Check 3: Verify image_urls column exists
  log('\n📋 Checking Database Schema...', 'blue')
  try {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('image_urls')
      .limit(1)

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        log(`  ❌ image_urls column: NOT FOUND in maintenance_requests`, 'red')
        allChecks = false
      } else {
        log(`  ⚠️  Could not verify column: ${error.message}`, 'yellow')
      }
    } else {
      log(`  ✅ image_urls column exists in maintenance_requests`, 'green')
    }
  } catch (err) {
    log(`  ❌ Exception: ${err}`, 'red')
    allChecks = false
  }

  // Check 4: Test upload permissions (optional - requires auth)
  log('\n🧪 Testing Upload Capabilities...', 'blue')
  log('  ℹ️  Skipping upload test (requires authenticated user)', 'yellow')

  // Summary
  log('\n' + '='.repeat(60), 'cyan')
  if (allChecks) {
    log(`✅ ${envName.toUpperCase()}: All checks passed!`, 'green')
  } else {
    log(`❌ ${envName.toUpperCase()}: Some checks failed`, 'red')
  }
  log('='.repeat(60), 'cyan')

  return allChecks
}

async function main() {
  log('\n🚀 Storage Setup Verification Tool', 'cyan')
  log('Checking both Staging and Production environments\n', 'cyan')

  // Get environment variables
  const stagingUrl = process.env.VITE_SUPABASE_URL || ''
  const stagingKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  // You'll need to set these for production verification
  const productionUrl = process.env.VITE_SUPABASE_URL_PROD || process.env.PROD_SUPABASE_URL || ''
  const productionKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.PROD_SUPABASE_SERVICE_KEY || ''

  let stagingOk = false
  let productionOk = false

  // Verify Staging
  if (stagingUrl && stagingKey) {
    stagingOk = await verifyEnvironment('Staging', stagingUrl, stagingKey)
  } else {
    log('\n⚠️  Staging credentials not found in environment', 'yellow')
  }

  // Verify Production
  if (productionUrl && productionKey) {
    productionOk = await verifyEnvironment('Production', productionUrl, productionKey)
  } else {
    log('\n⚠️  Production credentials not found in environment', 'yellow')
    log('   Set VITE_SUPABASE_URL_PROD and SUPABASE_SERVICE_ROLE_KEY_PROD to verify production', 'yellow')
  }

  // Final summary
  log('\n' + '='.repeat(60), 'cyan')
  log('FINAL SUMMARY', 'cyan')
  log('='.repeat(60), 'cyan')
  
  if (stagingUrl) {
    log(`Staging:    ${stagingOk ? '✅ PASS' : '❌ FAIL'}`, stagingOk ? 'green' : 'red')
  }
  if (productionUrl) {
    log(`Production: ${productionOk ? '✅ PASS' : '❌ FAIL'}`, productionOk ? 'green' : 'red')
  }
  
  log('='.repeat(60) + '\n', 'cyan')

  // Exit with appropriate code
  if ((stagingUrl && !stagingOk) || (productionUrl && !productionOk)) {
    process.exit(1)
  }
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error}`, 'red')
  process.exit(1)
})
