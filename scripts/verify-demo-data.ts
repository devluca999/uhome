// Diagnostic script to verify demo data was created correctly
// Run with: npm run verify:demo

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyDemoData() {
  console.log('🔍 Verifying demo data...\n')

  // Check demo landlord
  const { data: landlord, error: landlordError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', 'demo-landlord@uhome.internal')
    .single()

  if (landlordError || !landlord) {
    console.error('❌ Demo landlord not found:', landlordError?.message)
    return
  }

  console.log(`✅ Demo landlord found: ${landlord.email}`)

  // Check properties
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('id, name, owner_id')
    .eq('owner_id', landlord.id)

  if (propertiesError) {
    console.error('❌ Error fetching properties:', propertiesError.message)
    return
  }

  console.log(`✅ Found ${properties?.length || 0} properties`)

  if (!properties || properties.length === 0) {
    console.error('❌ No properties found for demo landlord')
    return
  }

  const propertyIds = properties.map(p => p.id)

  // Check units
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id, property_id, unit_name, rent_amount')
    .in('property_id', propertyIds)

  console.log(`✅ Found ${units?.length || 0} units`)

  // Check leases
  const { data: leases, error: leasesError } = await supabase
    .from('leases')
    .select('id, property_id, unit_id, tenant_id, rent_amount, status')
    .in('property_id', propertyIds)

  console.log(`✅ Found ${leases?.length || 0} leases`)

  if (leases && leases.length > 0) {
    const leasesWithValidRent = leases.filter(l => l.rent_amount && l.rent_amount > 0)
    console.log(`   ${leasesWithValidRent.length} leases with valid rent_amount`)

    const leasesWithoutRent = leases.filter(l => !l.rent_amount || l.rent_amount === 0)
    if (leasesWithoutRent.length > 0) {
      console.warn(`   ⚠️  ${leasesWithoutRent.length} leases with invalid rent_amount`)
    }
  }

  // Check tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, user_id, property_id, lease_id')
    .in('property_id', propertyIds)

  console.log(`✅ Found ${tenants?.length || 0} tenants`)

  // Check rent records
  const { data: rentRecords, error: rentError } = await supabase
    .from('rent_records')
    .select('id, property_id, lease_id, amount, status, paid_date, due_date')
    .in('property_id', propertyIds)

  if (rentError) {
    console.error('❌ Error fetching rent records:', rentError.message)
  } else {
    console.log(`✅ Found ${rentRecords?.length || 0} rent records`)

    if (rentRecords && rentRecords.length > 0) {
      const paidRecords = rentRecords.filter(r => r.status === 'paid')
      const paidWithDate = paidRecords.filter(r => r.paid_date)
      const currentMonth = new Date()
      const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const currentMonthPaid = paidWithDate.filter(r => {
        if (!r.paid_date) return false
        const paidDate = new Date(r.paid_date)
        return paidDate >= currentMonthStart && paidDate <= currentMonthEnd
      })

      console.log(`   ${paidRecords.length} paid records`)
      console.log(`   ${paidWithDate.length} paid records with paid_date`)
      console.log(`   ${currentMonthPaid.length} paid records in current month`)

      // Check date range
      const dates = rentRecords
        .map(r => r.due_date)
        .filter(Boolean)
        .map(d => new Date(d!))
        .sort((a, b) => a.getTime() - b.getTime())

      if (dates.length > 0) {
        const oldest = dates[0]
        const newest = dates[dates.length - 1]
        const monthsDiff =
          (newest.getFullYear() - oldest.getFullYear()) * 12 +
          (newest.getMonth() - oldest.getMonth()) +
          1
        console.log(
          `   Date range: ${oldest.toISOString().split('T')[0]} to ${newest.toISOString().split('T')[0]} (${monthsDiff} months)`
        )
      }

      // Check for records without lease_id
      const recordsWithoutLease = rentRecords.filter(r => !r.lease_id)
      if (recordsWithoutLease.length > 0) {
        console.warn(`   ⚠️  ${recordsWithoutLease.length} rent records missing lease_id`)
      }
    } else {
      console.error('❌ No rent records found!')
    }
  }

  // Check expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('id, property_id, amount, date')
    .in('property_id', propertyIds)

  if (expensesError) {
    console.error('❌ Error fetching expenses:', expensesError.message)
  } else {
    console.log(`✅ Found ${expenses?.length || 0} expenses`)

    if (expenses && expenses.length > 0) {
      const dates = expenses
        .map(e => e.date)
        .filter(Boolean)
        .map(d => new Date(d!))
        .sort((a, b) => a.getTime() - b.getTime())

      if (dates.length > 0) {
        const oldest = dates[0]
        const newest = dates[dates.length - 1]
        const monthsDiff =
          (newest.getFullYear() - oldest.getFullYear()) * 12 +
          (newest.getMonth() - oldest.getMonth()) +
          1
        console.log(
          `   Date range: ${oldest.toISOString().split('T')[0]} to ${newest.toISOString().split('T')[0]} (${monthsDiff} months)`
        )
      }
    }
  }

  console.log('\n✅ Verification complete!')
}

verifyDemoData().catch(console.error)
