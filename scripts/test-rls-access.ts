// Test RLS access for logged-in user
// This simulates what the frontend queries would return

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

// Use anon key to simulate frontend queries (respects RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRLSAccess() {
  console.log('🔍 Testing RLS access (simulating frontend queries)\n')
  console.log('⚠️  This requires authentication. Please provide demo landlord credentials.\n')

  // Sign in as demo landlord
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'demo-landlord@uhome.internal',
    password: 'DemoLandlord2024!',
  })

  if (authError || !authData.user) {
    console.error('❌ Authentication failed:', authError?.message)
    console.error('   Make sure the demo landlord account exists and password is correct.')
    process.exit(1)
  }

  console.log(`✅ Authenticated as: ${authData.user.email}`)
  console.log(`   User ID: ${authData.user.id}\n`)

  // Test properties query (what useProperties does)
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (propertiesError) {
    console.error('❌ Properties query error:', propertiesError.message)
  } else {
    console.log(`📊 Properties (via RLS):`)
    console.log(`   Count: ${properties?.length || 0}`)
    if (properties && properties.length > 0) {
      properties.forEach(p => {
        console.log(`   - ${p.name} (${p.id.substring(0, 8)}...) - active: ${p.is_active !== false}`)
      })
    }
    console.log()
  }

  let rentRecords: Array<{ status: string }> | null = null
  let expenses: Array<{ property_id: string }> | null = null

  // Test rent records query (what useLandlordRentRecords does)
  if (properties && properties.length > 0) {
    const activePropertyIds = properties
      .filter(p => p.is_active !== false)
      .map(p => p.id)

    const { data, error: rentError } = await supabase
      .from('rent_records')
      .select(`
        *,
        property:properties(id, name, address),
        tenant:tenants(
          id,
          user:users(email)
        )
      `)
      .in('property_id', activePropertyIds)

    if (rentError) {
      console.error('❌ Rent records query error:', rentError.message)
    } else {
      rentRecords = data
      console.log(`💰 Rent Records (via RLS, active properties only):`)
      console.log(`   Active properties: ${activePropertyIds.length}`)
      console.log(`   Rent records count: ${rentRecords?.length || 0}`)
      if (rentRecords && rentRecords.length > 0) {
        const byStatus = rentRecords.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        console.log(`   By status:`, byStatus)
      }
      console.log()
    }
  }

  // Test expenses query (what useExpenses does)
  const { data: expensesData, error: expensesError } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })

  if (expensesError) {
    console.error('❌ Expenses query error:', expensesError.message)
  } else {
    expenses = expensesData
    console.log(`💸 Expenses (via RLS):`)
    console.log(`   Count: ${expenses?.length || 0}`)
    if (expenses && expenses.length > 0) {
      const byProperty = expenses.reduce((acc, e) => {
        acc[e.property_id] = (acc[e.property_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log(`   By property: ${Object.keys(byProperty).length} properties`)
      console.log(`   Sample property counts:`, Object.entries(byProperty).slice(0, 3))
    }
    console.log()
  }

  // Compare with service role (what should exist)
  const supabaseService = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  )

  const { data: allProperties } = await supabaseService
    .from('properties')
    .select('id, name, owner_id')
    .eq('owner_id', authData.user.id)

  const { data: allRentRecords } = allProperties && allProperties.length > 0
    ? await supabaseService
        .from('rent_records')
        .select('id, property_id')
        .in('property_id', allProperties.map(p => p.id))
    : { data: null }

  const { data: allExpenses } = allProperties && allProperties.length > 0
    ? await supabaseService
        .from('expenses')
        .select('id, property_id')
        .in('property_id', allProperties.map(p => p.id))
    : { data: null }

  const rentRecordsCount = rentRecords?.length || 0
  const expensesCount = expenses?.length || 0

  console.log('\n📊 Comparison (Service Role vs RLS):')
  console.log(`   Properties: ${allProperties?.length || 0} (service) vs ${properties?.length || 0} (RLS)`)
  console.log(`   Rent Records: ${allRentRecords?.length || 0} (service) vs ${rentRecordsCount} (RLS)`)
  console.log(`   Expenses: ${allExpenses?.length || 0} (service) vs ${expensesCount} (RLS)`)

  if (
    (allProperties?.length || 0) !== (properties?.length || 0) ||
    (allRentRecords?.length || 0) !== rentRecordsCount ||
    (allExpenses?.length || 0) !== expensesCount
  ) {
    console.log('\n⚠️  MISMATCH DETECTED! RLS policies may be blocking some data.')
    console.log('   This indicates an RLS policy issue.')
  } else {
    console.log('\n✅ All counts match! RLS is working correctly.')
  }

  await supabase.auth.signOut()
}

testRLSAccess().catch(console.error)
