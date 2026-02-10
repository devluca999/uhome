/**
 * Seed Current Month Data
 *
 * Fills in rent records and expenses for the current calendar month
 * so the dashboard and finances pages show live data.
 *
 * Run with: npx tsx scripts/seed-current-month.ts
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function run() {
  console.log('🌱 Seeding current-month data...\n')

  // ── 1. Find the demo landlord ──────────────────────────────────────
  const { data: landlord, error: landlordErr } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'demo-landlord@uhome.internal')
    .single()

  if (landlordErr || !landlord) {
    throw new Error(`Demo landlord not found: ${landlordErr?.message}`)
  }
  console.log(`✅ Landlord: ${landlord.id}`)

  // ── 2. Get properties ──────────────────────────────────────────────
  const { data: properties, error: propErr } = await supabase
    .from('properties')
    .select('id, name, rent_amount, rent_due_date')
    .eq('owner_id', landlord.id)

  if (propErr || !properties?.length) {
    throw new Error(`No properties found: ${propErr?.message}`)
  }
  console.log(`✅ Found ${properties.length} properties`)

  // ── 3. Get tenants with their property assignments ─────────────────
  const propertyIds = properties.map(p => p.id)
  const { data: tenants, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, property_id')
    .in('property_id', propertyIds)

  if (tenantErr) throw new Error(`Tenants query failed: ${tenantErr.message}`)

  // Map property → first tenant
  const tenantByProperty = new Map<string, string>()
  for (const t of tenants || []) {
    if (t.property_id && !tenantByProperty.has(t.property_id)) {
      tenantByProperty.set(t.property_id, t.id)
    }
  }
  console.log(`✅ Mapped tenants for ${tenantByProperty.size} properties`)

  // ── 4. Get leases to derive rent amounts when property.rent_amount is 0
  const { data: leases } = await supabase
    .from('leases')
    .select('id, property_id, rent_amount')
    .in('property_id', propertyIds)
    .eq('status', 'active')

  const leaseRentByProperty = new Map<string, number>()
  for (const l of leases || []) {
    if (l.property_id && l.rent_amount && l.rent_amount > 0) {
      leaseRentByProperty.set(l.property_id, l.rent_amount)
    }
  }

  // ── 5. Current month boundaries ────────────────────────────────────
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()  // 0-based
  const monthStart = new Date(year, month, 1)
  const todayStr = now.toISOString().split('T')[0]

  const dueDateDay = (d: number | null) => {
    const day = d || 1
    return new Date(year, month, day).toISOString().split('T')[0]
  }

  const fmtDate = (d: Date) => d.toISOString().split('T')[0]

  console.log(`\n📅 Current month: ${fmtDate(monthStart)} → ${todayStr}\n`)

  // ── 6. Check for existing current-month rent records ───────────────
  const { data: existingRecords } = await supabase
    .from('rent_records')
    .select('id, property_id')
    .in('property_id', propertyIds)
    .gte('due_date', fmtDate(monthStart))
    .lte('due_date', todayStr)

  if (existingRecords && existingRecords.length > 0) {
    console.log(`⚠️  Found ${existingRecords.length} existing current-month rent records`)
    console.log('   Skipping rent record creation to avoid duplicates')
  } else {
    // ── 7. Create rent records for each property ─────────────────────
    const rentRecords: Array<{
      property_id: string
      tenant_id: string
      amount: number
      due_date: string
      status: 'paid' | 'pending' | 'overdue'
      paid_date: string | null
    }> = []

    for (const property of properties) {
      const tenantId = tenantByProperty.get(property.id)
      if (!tenantId) {
        console.log(`   ⚠️  No tenant for ${property.name}, skipping rent record`)
        continue
      }

      // Use property rent_amount, fallback to lease rent, fallback to 1500
      let rentAmount = property.rent_amount
      if (!rentAmount || rentAmount <= 0) {
        rentAmount = leaseRentByProperty.get(property.id) || 1500
      }

      const dueDate = dueDateDay(property.rent_due_date)
      const dueDateObj = new Date(dueDate)
      const isPastDue = dueDateObj <= now

      // 80% chance it's paid if past due, otherwise pending
      const isPaid = isPastDue && Math.random() < 0.8
      const status: 'paid' | 'pending' | 'overdue' = isPaid
        ? 'paid'
        : isPastDue
          ? 'overdue'
          : 'pending'

      let paidDate: string | null = null
      if (status === 'paid') {
        // Paid 0-3 days after due date
        const daysAfter = Math.floor(Math.random() * 4)
        const pd = new Date(dueDateObj)
        pd.setDate(pd.getDate() + daysAfter)
        // Don't set paid_date in the future
        if (pd <= now) {
          paidDate = fmtDate(pd)
        } else {
          paidDate = todayStr
        }
      }

      rentRecords.push({
        property_id: property.id,
        tenant_id: tenantId,
        amount: rentAmount,
        due_date: dueDate,
        status,
        paid_date: paidDate,
      })
    }

    if (rentRecords.length > 0) {
      const { error: insertErr } = await supabase.from('rent_records').insert(rentRecords)
      if (insertErr) {
        console.error('❌ Failed to insert rent records:', insertErr.message)
      } else {
        const paidCount = rentRecords.filter(r => r.status === 'paid').length
        const pendingCount = rentRecords.filter(r => r.status === 'pending').length
        const overdueCount = rentRecords.filter(r => r.status === 'overdue').length
        console.log(`✅ Created ${rentRecords.length} rent records (${paidCount} paid, ${pendingCount} pending, ${overdueCount} overdue)`)
      }
    }
  }

  // ── 8. Check for existing current-month expenses ───────────────────
  const { data: existingExpenses } = await supabase
    .from('expenses')
    .select('id')
    .in('property_id', propertyIds)
    .gte('date', fmtDate(monthStart))
    .lte('date', todayStr)

  if (existingExpenses && existingExpenses.length > 0) {
    console.log(`⚠️  Found ${existingExpenses.length} existing current-month expenses`)
    console.log('   Skipping expense creation to avoid duplicates')
  } else {
    // ── 9. Create 2-3 expenses per property for the current month ────
    const expenseRecords: Array<{
      property_id: string
      name: string
      amount: number
      date: string
      category: 'maintenance' | 'utilities' | 'repairs'
    }> = []

    const expenseTemplates = [
      { name: 'Water & Sewer', category: 'utilities' as const, min: 40, max: 120 },
      { name: 'Electricity', category: 'utilities' as const, min: 60, max: 200 },
      { name: 'Trash Collection', category: 'utilities' as const, min: 25, max: 60 },
      { name: 'Lawn Maintenance', category: 'maintenance' as const, min: 75, max: 180 },
      { name: 'Plumbing Repair', category: 'repairs' as const, min: 100, max: 450 },
      { name: 'HVAC Service', category: 'maintenance' as const, min: 80, max: 300 },
      { name: 'Pest Control', category: 'maintenance' as const, min: 50, max: 120 },
    ]

    for (const property of properties) {
      // 2-3 expenses per property
      const count = 2 + Math.floor(Math.random() * 2)
      const shuffled = [...expenseTemplates].sort(() => Math.random() - 0.5)

      for (let i = 0; i < count; i++) {
        const template = shuffled[i]
        const amount = Math.round(template.min + Math.random() * (template.max - template.min))
        // Random date in current month up to today
        const maxDay = now.getDate()
        const day = 1 + Math.floor(Math.random() * maxDay)
        const expenseDate = new Date(year, month, day)

        expenseRecords.push({
          property_id: property.id,
          name: template.name,
          amount,
          date: fmtDate(expenseDate),
          category: template.category,
        })
      }
    }

    if (expenseRecords.length > 0) {
      const { error: insertErr } = await supabase.from('expenses').insert(expenseRecords)
      if (insertErr) {
        console.error('❌ Failed to insert expenses:', insertErr.message)
      } else {
        const total = expenseRecords.reduce((s, e) => s + e.amount, 0)
        console.log(`✅ Created ${expenseRecords.length} expenses (total: $${total.toLocaleString()})`)
      }
    }
  }

  // ── 10. Verify ─────────────────────────────────────────────────────
  console.log('\n📊 Verification:')

  const { data: verifyRent } = await supabase
    .from('rent_records')
    .select('id, status, amount, paid_date')
    .in('property_id', propertyIds)
    .gte('due_date', fmtDate(monthStart))

  const paidRecords = (verifyRent || []).filter(r => r.status === 'paid')
  const paidTotal = paidRecords.reduce((s, r) => s + Number(r.amount), 0)
  const paidWithDate = paidRecords.filter(r => r.paid_date).length

  console.log(`   Rent records this month: ${verifyRent?.length || 0}`)
  console.log(`   Paid: ${paidRecords.length} (total: $${paidTotal.toLocaleString()})`)
  console.log(`   Paid with paid_date: ${paidWithDate}`)

  const { data: verifyExpenses } = await supabase
    .from('expenses')
    .select('id, amount')
    .in('property_id', propertyIds)
    .gte('date', fmtDate(monthStart))

  const expenseTotal = (verifyExpenses || []).reduce((s, e) => s + Number(e.amount), 0)
  console.log(`   Expenses this month: ${verifyExpenses?.length || 0} (total: $${expenseTotal.toLocaleString()})`)
  console.log(`   Expected Net Income: $${(paidTotal - expenseTotal).toLocaleString()}`)

  console.log('\n✅ Done!')
}

run().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
