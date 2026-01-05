import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n')

  // Test 1: Basic connection
  console.log('1. Testing basic connection...')
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) {
      console.log(`   ⚠️  Connection works but got error: ${error.code} - ${error.message}`)
      if (error.message.includes('infinite recursion')) {
        console.log('   ❌ RLS RECURSION ERROR DETECTED - fix_rls_recursion.sql needs to be run!')
      }
    } else {
      console.log('   ✅ Connection successful')
    }
  } catch (err) {
    console.log(`   ❌ Connection failed: ${err}`)
  }

  // Test 2: Check if helper functions exist (from fix_rls_recursion.sql)
  console.log('\n2. Checking if RLS fix was applied (helper functions)...')
  try {
    // Try to query using the helper function - if it exists, the fix was applied
    const { data, error } = await supabase.rpc('user_owns_property', {
      property_uuid: '00000000-0000-0000-0000-000000000000',
    })
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('   ❌ Helper functions NOT FOUND - fix_rls_recursion.sql was NOT run!')
        console.log('   📝 Please run fix_rls_recursion.sql in Supabase SQL Editor')
      } else {
        console.log(
          `   ✅ Helper function exists (error is expected for test UUID): ${error.message}`
        )
      }
    } else {
      console.log('   ✅ Helper function exists and works')
    }
  } catch (err) {
    console.log(`   ⚠️  Could not test helper function: ${err}`)
  }

  // Test 3: Check data exists
  console.log('\n3. Checking if data exists...')
  try {
    // Sign in as the test landlord
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'landlord@example.com',
      password: 'password123',
    })

    if (authError) {
      console.log(`   ⚠️  Could not authenticate: ${authError.message}`)
      console.log("   📝 This is OK if you haven't run the seed script")
    } else {
      console.log('   ✅ Authenticated successfully')

      // Try to fetch properties
      const { data: props, error: propsError } = await supabase
        .from('properties')
        .select('*')
        .limit(5)

      if (propsError) {
        console.log(`   ❌ Error fetching properties: ${propsError.code} - ${propsError.message}`)
        if (propsError.message.includes('infinite recursion')) {
          console.log('   ❌ RLS RECURSION ERROR - fix_rls_recursion.sql MUST be run!')
        }
      } else {
        console.log(`   ✅ Found ${props?.length || 0} properties`)
        if (props && props.length > 0) {
          console.log(`   📦 Sample property: ${props[0].name}`)
        }
      }

      // Sign out
      await supabase.auth.signOut()
    }
  } catch (err) {
    console.log(`   ⚠️  Error during data check: ${err}`)
  }

  console.log('\n✅ Connection test complete')
}

testConnection().catch(console.error)
