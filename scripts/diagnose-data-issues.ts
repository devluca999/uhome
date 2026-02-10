// Diagnostic script to identify data inconsistencies
// Run with: npx tsx scripts/diagnose-data-issues.ts

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseDataIssues() {
  console.log('🔍 Diagnosing data issues for demo-landlord@uhome.internal\n')

  // Get the demo landlord user
  const { data: landlordUser, error: userError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', 'demo-landlord@uhome.internal')
    .single()

  if (userError || !landlordUser) {
    console.error('❌ Could not find demo landlord user:', userError?.message)
    process.exit(1)
  }

  console.log(`✅ Found demo landlord:`)
  console.log(`   ID: ${landlordUser.id}`)
  console.log(`   Email: ${landlordUser.email}`)
  console.log(`   Role: ${landlordUser.role}\n`)

  // Check properties
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('id, name, owner_id, is_active')
    .eq('owner_id', landlordUser.id)

  if (propertiesError) {
    console.error('❌ Error fetching properties:', propertiesError.message)
  } else {
    console.log(`📊 Properties (owner_id = ${landlordUser.id}):`)
    console.log(`   Count: ${properties?.length || 0}`)
    if (properties && properties.length > 0) {
      properties.forEach(p => {
        console.log(`   - ${p.name} (${p.id}) - active: ${p.is_active !== false}`)
      })
    }
    console.log()
  }

  // Check rent records
  const propertyIds = properties?.map(p => p.id) || []
  if (propertyIds.length > 0) {
    const { data: rentRecords, error: rentError } = await supabase
      .from('rent_records')
      .select('id, property_id, tenant_id, amount, status, due_date, paid_date')
      .in('property_id', propertyIds)

    if (rentError) {
      console.error('❌ Error fetching rent records:', rentError.message)
    } else {
      console.log(`💰 Rent Records (property_id IN [${propertyIds.length} properties]):`)
      console.log(`   Count: ${rentRecords?.length || 0}`)
      if (rentRecords && rentRecords.length > 0) {
        const byStatus = rentRecords.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        console.log(`   By status:`, byStatus)
        console.log(`   Sample (first 3):`)
        rentRecords.slice(0, 3).forEach(r => {
          console.log(`   - ${r.id.substring(0, 8)}... - $${r.amount} - ${r.status} - property: ${r.property_id.substring(0, 8)}...`)
        })
      }
      console.log()
    }
  } else {
    console.log('⚠️  No properties found, skipping rent records check\n')
  }

  // Check expenses
  if (propertyIds.length > 0) {
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, property_id, amount, date, category')
      .in('property_id', propertyIds)

    if (expensesError) {
      console.error('❌ Error fetching expenses:', expensesError.message)
    } else {
      console.log(`💸 Expenses (property_id IN [${propertyIds.length} properties]):`)
      console.log(`   Count: ${expenses?.length || 0}`)
      if (expenses && expenses.length > 0) {
        console.log(`   Sample (first 3):`)
        expenses.slice(0, 3).forEach(e => {
          console.log(`   - ${e.id.substring(0, 8)}... - $${e.amount} - ${e.category} - property: ${e.property_id.substring(0, 8)}...`)
        })
      }
      console.log()
    }
  } else {
    console.log('⚠️  No properties found, skipping expenses check\n')
  }

  // Check tenants
  if (propertyIds.length > 0) {
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, user_id, property_id')
      .in('property_id', propertyIds)

    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError.message)
    } else {
      console.log(`👥 Tenants (property_id IN [${propertyIds.length} properties]):`)
      console.log(`   Count: ${tenants?.length || 0}`)
      if (tenants && tenants.length > 0) {
        tenants.forEach(t => {
          console.log(`   - ${t.id.substring(0, 8)}... - user: ${t.user_id.substring(0, 8)}... - property: ${t.property_id.substring(0, 8)}...`)
        })
      }
      console.log()
    }
  } else {
    console.log('⚠️  No properties found, skipping tenants check\n')
  }

  // Check leases
  if (propertyIds.length > 0) {
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, property_id, tenant_id, rent_amount')
      .in('property_id', propertyIds)

    if (leasesError) {
      console.error('❌ Error fetching leases:', leasesError.message)
    } else {
      console.log(`📄 Leases (property_id IN [${propertyIds.length} properties]):`)
      console.log(`   Count: ${leases?.length || 0}`)
      if (leases && leases.length > 0) {
        leases.forEach(l => {
          console.log(`   - ${l.id.substring(0, 8)}... - property: ${l.property_id.substring(0, 8)}... - tenant: ${l.tenant_id.substring(0, 8)}... - rent: $${l.rent_amount}`)
        })
      }
      console.log()
    }
  } else {
    console.log('⚠️  No properties found, skipping leases check\n')
  }

  console.log('\n📋 Summary:')
  console.log(`   Properties: ${properties?.length || 0}`)
  console.log(`   Rent Records: ${propertyIds.length > 0 ? 'See above' : 'N/A (no properties)'}`)
  console.log(`   Expenses: ${propertyIds.length > 0 ? 'See above' : 'N/A (no properties)'}`)
  console.log(`   Tenants: ${propertyIds.length > 0 ? 'See above' : 'N/A (no properties)'}`)
  console.log(`   Leases: ${propertyIds.length > 0 ? 'See above' : 'N/A (no properties)'}`)
  console.log('\n💡 If counts are 0, the seed script may not have run successfully.')
  console.log('💡 If some counts are > 0 but others are 0, there may be an RLS policy issue.')
}

diagnoseDataIssues().catch(console.error)
