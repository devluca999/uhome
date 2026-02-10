import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

const FALLBACK_RENT = 1000

async function run() {
  const { data: leases, error: leaseError } = await supabase
    .from('leases')
    .select('id, property_id, rent_amount, security_deposit')
    .or('rent_amount.is.null,rent_amount.eq.0')

  if (leaseError) {
    throw new Error(`Failed to load leases: ${leaseError.message}`)
  }

  if (!leases || leases.length === 0) {
    console.log('✅ No leases with invalid rent_amount found')
    return
  }

  const propertyIds = Array.from(new Set(leases.map(l => l.property_id)))
  const { data: properties, error: propertyError } = await supabase
    .from('properties')
    .select('id, rent_amount')
    .in('id', propertyIds)

  if (propertyError) {
    throw new Error(`Failed to load properties: ${propertyError.message}`)
  }

  const propertyRentById = new Map(
    (properties || []).map(p => [p.id, Number(p.rent_amount) || 0])
  )

  let updated = 0
  for (const lease of leases) {
    const propertyRent = propertyRentById.get(lease.property_id) || 0
    const rentAmount = propertyRent > 0 ? propertyRent : FALLBACK_RENT
    const securityDeposit =
      lease.security_deposit && lease.security_deposit > 0 ? lease.security_deposit : rentAmount

    const { error: updateError } = await supabase
      .from('leases')
      .update({
        rent_amount: rentAmount,
        security_deposit: securityDeposit,
      })
      .eq('id', lease.id)

    if (updateError) {
      console.warn(`⚠️  Failed to update lease ${lease.id}: ${updateError.message}`)
      continue
    }

    updated += 1
    console.log(
      `✅ Updated lease ${lease.id} rent_amount=${rentAmount} security_deposit=${securityDeposit}`
    )
  }

  console.log(`\n✅ Updated ${updated} lease(s) with valid rent_amount`)
}

run().catch(error => {
  console.error('❌ Failed to fix leases:', error)
  process.exit(1)
})
