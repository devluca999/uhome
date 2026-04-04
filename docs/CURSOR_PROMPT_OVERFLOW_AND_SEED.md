# Cursor Session: Mobile Overflow Fix + Rich Demo Seed

Two tasks. Complete both fully before finishing.

---

## TASK 1: MOBILE HORIZONTAL OVERFLOW FIX

### Problem
On mobile (<768px), three pages overflow horizontally because filter bars
contain `min-w-[100px]` to `min-w-[140px]` select dropdowns that cannot
shrink below their minimum width on a 390px screen.

Affected pages:
- `src/pages/landlord/properties.tsx` — 5 min-w selects at lines ~334–401
- `src/pages/landlord/operations.tsx` — 5 min-w selects at lines ~504–578
- `src/pages/landlord/tenants.tsx` — 2 min-w selects at lines ~366–380

### Fix Pattern (apply to all three pages)

**Step 1:** Add `overflow-x-hidden` to the outermost page container div.

**Step 2:** Wrap the entire filter bar Card/div in `hidden md:block` so it only
renders on desktop. Do NOT delete it — just hide it on mobile.

**Step 3:** Add a mobile filter button directly below the search input
(or at the top of the page on mobile). Use this exact pattern:

```tsx
import { SlidersHorizontal } from 'lucide-react'
// Add to state:
const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

// Mobile filter button (visible only on mobile, above the list):
<Button
  variant="outline"
  size="sm"
  className="flex md:hidden w-full gap-2 mb-3"
  onClick={() => setMobileFiltersOpen(true)}
>
  <SlidersHorizontal className="w-4 h-4" />
  Filters & Sort
</Button>

// Mobile filter drawer (bottom sheet):
<Drawer open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
  <DrawerContent>
    <div className="p-4 space-y-4">
      <h3 className="font-medium text-sm">Filters & Sort</h3>
      {/* Move ALL the select elements here, each as full-width */}
      {/* Example: */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Status</label>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      {/* ... repeat for all other filters ... */}
      <Button
        className="w-full mt-2"
        onClick={() => setMobileFiltersOpen(false)}
      >
        Apply
      </Button>
    </div>
  </DrawerContent>
</Drawer>
```

**Step 4:** Also add `overflow-x-hidden` to the layout wrappers:
- In `src/components/layout/landlord-layout.tsx`: add `overflow-x-hidden` to
  the outermost `<div className="min-h-screen bg-background ...">` 
- In `src/components/layout/tenant-layout.tsx`: same

### Also fix: Desktop header nav rendering on mobile pages

In `src/components/layout/landlord-layout.tsx`, the desktop header nav at
line ~156 has `flex-shrink-0` and `whitespace-nowrap` which can push content
off-screen on narrow screens. Ensure the header itself has `overflow-hidden`
on the nav container so it never causes horizontal overflow even if isMobile
detection fires late.

---

## TASK 2: RICH DEMO SEED DATA — COMPLETE REWRITE

### Goal
Rewrite the DATA ARRAYS ONLY in `scripts/seed-production-demo.ts`.
Keep all helper functions unchanged (createAndConfirmDemoUser, etc.).
Replace the property/tenant/rent/expense/workorder data to create a rich
18-month dataset that makes every dashboard chart show realistic curves.

### Target volumes
- 8 properties (varied types, realistic Chicago-area addresses)
- 10 tenants across those properties
- ~220 rent records spanning 18 months
- ~72 expenses spanning 18 months with seasonal variation
- 18 work orders at varied statuses
- realistic financial fluctuation pattern (see below)

### Implementation

Replace the existing data seeding section with this complete implementation:

```typescript
// ─── PROPERTIES ────────────────────────────────────────────────────────────
const PROPERTIES = [
  {
    name: 'Maple Court 2B',
    address: '142 N Maple Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60614',
    property_type: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    rent_amount: 1850,
    description: 'Bright 2-bed unit in Lincoln Park. Hardwood floors, updated kitchen.',
    is_active: true,
  },
  {
    name: 'Elm Drive House',
    address: '2847 W Elm Dr',
    city: 'Chicago',
    state: 'IL',
    zip: '60647',
    property_type: 'house',
    bedrooms: 3,
    bathrooms: 2,
    rent_amount: 2600,
    description: 'Single-family home in Logan Square. Fenced yard, garage, basement.',
    is_active: true,
  },
  {
    name: 'Cedar Lane Studios',
    address: '501 E Cedar Ln, Unit 4',
    city: 'Evanston',
    state: 'IL',
    zip: '60201',
    property_type: 'studio',
    bedrooms: 0,
    bathrooms: 1,
    rent_amount: 1100,
    description: 'Efficient studio near Northwestern campus. Utilities included.',
    is_active: true,
  },
  {
    name: 'Riverside Condo 7A',
    address: '320 S Riverside Plaza, #7A',
    city: 'Chicago',
    state: 'IL',
    zip: '60606',
    property_type: 'condo',
    bedrooms: 1,
    bathrooms: 1,
    rent_amount: 2100,
    description: 'High-rise 1-bed with river views. Doorman, gym, rooftop access.',
    is_active: true,
  },
  {
    name: 'Oak Street Townhouse',
    address: '1034 W Oak St',
    city: 'Chicago',
    state: 'IL',
    zip: '60622',
    property_type: 'townhouse',
    bedrooms: 3,
    bathrooms: 2,
    rent_amount: 3200,
    description: 'Wicker Park 3-story townhouse. Private roof deck, 2-car parking.',
    is_active: true,
  },
  {
    name: 'Lakeview 1BD #12',
    address: '3211 N Broadway, #12',
    city: 'Chicago',
    state: 'IL',
    zip: '60657',
    property_type: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    rent_amount: 1650,
    description: 'Cozy 1-bed in Lakeview. Walk to Lake, transit, dining.',
    is_active: true,
  },
  {
    name: 'Pilsen Flat 2F',
    address: '1856 S Blue Island Ave, #2F',
    city: 'Chicago',
    state: 'IL',
    zip: '60608',
    property_type: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    rent_amount: 1450,
    description: 'Spacious vintage 2-bed in Pilsen arts district. High ceilings.',
    is_active: true,
  },
  {
    name: 'Hyde Park 2BD Suite',
    address: '5432 S Woodlawn Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60615',
    property_type: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    rent_amount: 2000,
    description: 'Near U of C campus. Renovated kitchen/baths, in-unit laundry.',
    is_active: true,
  },
]

// ─── TENANTS ────────────────────────────────────────────────────────────────
// Assign tenants to properties (some properties share tenants / roommates)
const TENANTS = [
  { name: 'Marcus Webb',    email: 'marcus.webb@demo.uhome.app',    propertyIndex: 0 },
  { name: 'Priya Sharma',   email: 'priya.sharma@demo.uhome.app',   propertyIndex: 1 },
  { name: 'Devon Carter',   email: 'devon.carter@demo.uhome.app',   propertyIndex: 1 }, // roommate
  { name: 'Sofia Reyes',    email: 'sofia.reyes@demo.uhome.app',    propertyIndex: 2 },
  { name: 'Jordan Kim',     email: 'jordan.kim@demo.uhome.app',     propertyIndex: 3 },
  { name: 'Aaliyah Brooks', email: 'aaliyah.brooks@demo.uhome.app', propertyIndex: 4 },
  { name: 'Ethan Park',     email: 'ethan.park@demo.uhome.app',     propertyIndex: 5 },
  { name: 'Chloe Martin',   email: 'chloe.martin@demo.uhome.app',   propertyIndex: 6 },
  { name: 'Tobias Nguyen',  email: 'tobias.nguyen@demo.uhome.app',  propertyIndex: 7 },
  { name: 'Imani Hassan',   email: 'imani.hassan@demo.uhome.app',   propertyIndex: 7 }, // roommate
]

// ─── RENT RECORD GENERATION ─────────────────────────────────────────────────
// Generate 18 months of rent records per property with realistic patterns:
//
// Month 1-3 back   (recent):     95%+ collection, low expenses
// Month 4-6 back:                one expensive repair month, normal collection
// Month 7-9 back:                slight overdue cluster (1-2 properties)
// Month 10-12 back:              vacancy gap on prop index 2 (studio between tenants)
// Month 13-18 back:              only 6 of 8 properties active (portfolio growing)
//
// Per record: status = paid (85%), overdue (8%), pending (7%) based on month age
// Late payments: paid_date = due_date + random(1..28) days for "late" payers

function generateRentRecords(properties: any[], landlordId: string) {
  const records = []
  const now = new Date()

  for (let monthsBack = 0; monthsBack <= 17; monthsBack++) {
    const dueDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)

    // Only 6 properties active in months 13-18 (simulate portfolio growth)
    const activeProps = monthsBack >= 13
      ? properties.slice(0, 6)
      : monthsBack >= 10 && monthsBack <= 12
        ? properties.filter((_, i) => i !== 2) // studio vacant months 10-12
        : properties

    for (const prop of activeProps) {
      // Determine payment status based on age and property
      let status: 'paid' | 'pending' | 'overdue'
      let paidDate: string | null = null

      if (monthsBack === 0) {
        // Current month: mix of pending and paid
        status = Math.random() > 0.3 ? 'paid' : 'pending'
      } else if (monthsBack <= 2) {
        // Last 2 months: mostly paid, some overdue
        const r = Math.random()
        if (r < 0.88) status = 'paid'
        else if (r < 0.94) status = 'overdue'
        else status = 'pending'
      } else if (monthsBack >= 7 && monthsBack <= 9) {
        // Overdue cluster months 7-9
        const r = Math.random()
        if (r < 0.78) status = 'paid'
        else if (r < 0.92) status = 'overdue'
        else status = 'pending'
      } else {
        // Normal historical months
        const r = Math.random()
        if (r < 0.91) status = 'paid'
        else if (r < 0.97) status = 'overdue'
        else status = 'pending'
      }

      // Calculate paid_date for paid records
      if (status === 'paid') {
        // Most tenants pay on time (1-5 days after due), some late (10-28 days)
        const isLate = Math.random() < 0.15
        const daysAfter = isLate
          ? Math.floor(Math.random() * 18) + 10
          : Math.floor(Math.random() * 5) + 1
        const pd = new Date(dueDate)
        pd.setDate(pd.getDate() + daysAfter)
        paidDate = pd.toISOString().split('T')[0]
      }

      // Slight rent amount variation (±$50 for partial payments on some overdue)
      const baseAmount = prop.rent_amount
      const amount = status === 'overdue' && Math.random() < 0.2
        ? baseAmount - 200 // partial payment
        : baseAmount

      records.push({
        property_id: prop.id,
        landlord_id: landlordId,
        amount,
        due_date: dueDate.toISOString().split('T')[0],
        paid_date: paidDate,
        status,
        payment_method: status === 'paid'
          ? ['bank_transfer', 'check', 'zelle', 'venmo'][Math.floor(Math.random() * 4)]
          : null,
        notes: status === 'overdue' && Math.random() < 0.3
          ? 'Tenant notified. Payment arrangement in progress.'
          : null,
      })
    }
  }
  return records
}

// ─── EXPENSE GENERATION ──────────────────────────────────────────────────────
function generateExpenses(properties: any[], landlordId: string) {
  const expenses = []
  const now = new Date()

  // Monthly recurring: insurance + management fee (split across all props)
  for (let monthsBack = 0; monthsBack <= 17; monthsBack++) {
    const expDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 5)
    const dateStr = expDate.toISOString().split('T')[0]
    const activeProps = monthsBack >= 13 ? properties.slice(0, 6) : properties

    // Insurance (monthly, per property)
    for (const prop of activeProps.slice(0, 4)) { // 4 props have insurance tracked
      expenses.push({
        property_id: prop.id,
        landlord_id: landlordId,
        amount: Math.floor(80 + Math.random() * 40),
        category: 'insurance',
        description: 'Monthly property insurance premium',
        date: dateStr,
      })
    }

    // Seasonal: higher utilities in winter (Dec=11, Jan=0, Feb=1)
    const month = expDate.getMonth()
    const isWinter = month === 11 || month === 0 || month === 1
    if (isWinter) {
      const prop = properties[Math.floor(Math.random() * 4)]
      expenses.push({
        property_id: prop.id,
        landlord_id: landlordId,
        amount: Math.floor(180 + Math.random() * 120),
        category: 'utilities',
        description: 'Common area heating — winter surcharge',
        date: dateStr,
      })
    }
  }

  // One-off repairs and improvements (irregular, realistic)
  const irregularExpenses = [
    { monthsBack: 1,  propIdx: 1, amount: 1250, category: 'maintenance', description: 'HVAC full service + refrigerant recharge' },
    { monthsBack: 2,  propIdx: 4, amount: 480,  category: 'repairs',     description: 'Roof shingle repair after wind storm' },
    { monthsBack: 3,  propIdx: 0, amount: 320,  category: 'repairs',     description: 'Kitchen faucet and shutoff valve replacement' },
    { monthsBack: 4,  propIdx: 7, amount: 3400, category: 'improvements',description: 'Full bathroom renovation — tile, fixtures, vanity' },
    { monthsBack: 4,  propIdx: 3, amount: 890,  category: 'repairs',     description: 'Washer/dryer unit replacement' },
    { monthsBack: 5,  propIdx: 1, amount: 1800, category: 'improvements',description: 'Interior paint — full unit refresh between tenants' },
    { monthsBack: 6,  propIdx: 0, amount: 2200, category: 'maintenance', description: 'Boiler inspection + zone valve replacement' },
    { monthsBack: 6,  propIdx: 5, amount: 450,  category: 'repairs',     description: 'Window seal repair — 3 units' },
    { monthsBack: 7,  propIdx: 2, amount: 680,  category: 'repairs',     description: 'Exterior door lock and intercom replacement' },
    { monthsBack: 8,  propIdx: 4, amount: 5200, category: 'improvements',description: 'Deck rebuild + waterproofing (roof deck)' },
    { monthsBack: 9,  propIdx: 3, amount: 340,  category: 'repairs',     description: 'Dishwasher pump motor replacement' },
    { monthsBack: 10, propIdx: 6, amount: 760,  category: 'maintenance', description: 'Pest control — full building treatment' },
    { monthsBack: 11, propIdx: 1, amount: 420,  category: 'repairs',     description: 'Garage door spring and opener repair' },
    { monthsBack: 12, propIdx: 7, amount: 1100, category: 'maintenance', description: 'HVAC preventative maintenance — 2 units' },
    { monthsBack: 13, propIdx: 0, amount: 290,  category: 'repairs',     description: 'Toilet flapper and fill valve — 2 bathrooms' },
    { monthsBack: 14, propIdx: 5, amount: 6800, category: 'improvements',description: 'Kitchen remodel — cabinets, counters, appliances' },
    { monthsBack: 15, propIdx: 4, amount: 380,  category: 'repairs',     description: 'Sump pump replacement — basement' },
    { monthsBack: 16, propIdx: 2, amount: 940,  category: 'maintenance', description: 'Tuckpointing — exterior brick repointing' },
    { monthsBack: 17, propIdx: 0, amount: 2800, category: 'improvements',description: 'Hardwood floor refinishing — entire unit' },
  ]

  for (const exp of irregularExpenses) {
    if (exp.propIdx >= properties.length) continue
    const d = new Date(now.getFullYear(), now.getMonth() - exp.monthsBack, Math.floor(Math.random() * 25) + 1)
    expenses.push({
      property_id: properties[exp.propIdx].id,
      landlord_id: landlordId,
      amount: exp.amount,
      category: exp.category,
      description: exp.description,
      date: d.toISOString().split('T')[0],
    })
  }

  // Quarterly landscaping (4 props)
  for (let q = 0; q < 6; q++) { // 6 quarters = 18 months
    const monthsBack = q * 3 + 1
    const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 15)
    const prop = properties[q % 4]
    expenses.push({
      property_id: prop.id,
      landlord_id: landlordId,
      amount: Math.floor(220 + Math.random() * 80),
      category: 'maintenance',
      description: 'Landscaping and lawn care — seasonal',
      date: d.toISOString().split('T')[0],
    })
  }

  return expenses
}

// ─── WORK ORDERS ─────────────────────────────────────────────────────────────
function generateWorkOrders(properties: any[], tenants: any[]) {
  const now = new Date()
  const ago = (days: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    return d.toISOString()
  }

  return [
    // Open / active
    {
      property_id: properties[1].id,
      tenant_id: tenants[1]?.id,
      title: 'HVAC not heating — bedroom zone',
      description: 'Bedroom is not getting heat. Living room is fine. Started 3 days ago.',
      status: 'in_progress',
      priority: 'high',
      created_at: ago(4),
      updated_at: ago(1),
    },
    {
      property_id: properties[0].id,
      tenant_id: tenants[0]?.id,
      title: 'Kitchen faucet dripping constantly',
      description: 'Hot water faucet won\'t fully shut off. Dripping at ~1 drop/sec.',
      status: 'submitted',
      priority: 'medium',
      created_at: ago(2),
      updated_at: ago(2),
    },
    {
      property_id: properties[4].id,
      tenant_id: tenants[5]?.id,
      title: 'Bathroom exhaust fan making grinding noise',
      description: 'Started 1 week ago, getting louder. Vibrates the ceiling.',
      status: 'submitted',
      priority: 'low',
      created_at: ago(7),
      updated_at: ago(7),
    },
    {
      property_id: properties[6].id,
      tenant_id: tenants[7]?.id,
      title: 'Bedroom window latch broken — won\'t lock',
      description: 'Latch snapped off. Window can be opened from outside.',
      status: 'in_progress',
      priority: 'high',
      created_at: ago(3),
      updated_at: ago(1),
    },
    // Resolved recently
    {
      property_id: properties[3].id,
      tenant_id: tenants[4]?.id,
      title: 'Dishwasher not draining',
      description: 'Standing water after cycle. Checked filter — still backed up.',
      status: 'resolved',
      priority: 'medium',
      created_at: ago(18),
      updated_at: ago(10),
    },
    {
      property_id: properties[7].id,
      tenant_id: tenants[8]?.id,
      title: 'Mold spots in bathroom corner',
      description: 'Small mold growth near shower grout. Ventilation may be issue.',
      status: 'resolved',
      priority: 'high',
      created_at: ago(22),
      updated_at: ago(14),
    },
    {
      property_id: properties[2].id,
      tenant_id: tenants[3]?.id,
      title: 'Front door buzzer not working',
      description: 'Intercom buzzes but door release doesn\'t open. Has been like this for a week.',
      status: 'resolved',
      priority: 'high',
      created_at: ago(30),
      updated_at: ago(20),
    },
    {
      property_id: properties[5].id,
      tenant_id: tenants[6]?.id,
      title: 'Dryer takes 2+ cycles to dry clothes',
      description: 'Heating element seems weak. Clothes still damp after full cycle.',
      status: 'resolved',
      priority: 'medium',
      created_at: ago(35),
      updated_at: ago(25),
    },
    // Closed (older)
    {
      property_id: properties[1].id,
      tenant_id: tenants[1]?.id,
      title: 'Parking spot dispute with neighbor',
      description: 'Upstairs neighbor using assigned parking spot #4. Need resolution.',
      status: 'closed',
      priority: 'low',
      created_at: ago(60),
      updated_at: ago(52),
    },
    {
      property_id: properties[4].id,
      tenant_id: tenants[5]?.id,
      title: 'Roof deck furniture missing — 2 chairs',
      description: 'Two outdoor chairs from roof deck storage are gone. Unsure if moved or stolen.',
      status: 'closed',
      priority: 'low',
      created_at: ago(75),
      updated_at: ago(68),
    },
    {
      property_id: properties[0].id,
      tenant_id: tenants[0]?.id,
      title: 'Hot water intermittent — shower goes cold',
      description: 'Water heater cycling. Hot water lasts ~8 mins in morning rush.',
      status: 'closed',
      priority: 'high',
      created_at: ago(90),
      updated_at: ago(82),
    },
    {
      property_id: properties[7].id,
      tenant_id: tenants[9]?.id,
      title: 'Pest issue — ants in kitchen',
      description: 'Trail of ants near sink and cabinet corners. Appeared after rain.',
      status: 'closed',
      priority: 'medium',
      created_at: ago(110),
      updated_at: ago(100),
    },
    {
      property_id: properties[3].id,
      tenant_id: tenants[4]?.id,
      title: 'AC unit not cooling below 78°F',
      description: 'Window AC runs constantly but won\'t get below 78. Filters cleaned.',
      status: 'closed',
      priority: 'high',
      created_at: ago(130),
      updated_at: ago(118),
    },
    {
      property_id: properties[6].id,
      tenant_id: tenants[7]?.id,
      title: 'Garbage disposal jammed',
      description: 'Humming but not spinning. Reset button pressed — still jammed.',
      status: 'closed',
      priority: 'medium',
      created_at: ago(145),
      updated_at: ago(138),
    },
    {
      property_id: properties[2].id,
      tenant_id: tenants[3]?.id,
      title: 'Light fixture flickering in hallway',
      description: 'Overhead hallway light flickers when on for more than 5 minutes.',
      status: 'closed',
      priority: 'low',
      created_at: ago(160),
      updated_at: ago(153),
    },
    {
      property_id: properties[5].id,
      tenant_id: tenants[6]?.id,
      title: 'Bathroom tiles cracked near tub edge',
      description: '3 tiles along tub edge cracked. Worried about water getting behind.',
      status: 'closed',
      priority: 'medium',
      created_at: ago(180),
      updated_at: ago(170),
    },
    {
      property_id: properties[1].id,
      tenant_id: tenants[2]?.id,
      title: 'Back door deadbolt stiff — hard to lock',
      description: 'Deadbolt requires a lot of force. Key gets stuck occasionally.',
      status: 'closed',
      priority: 'medium',
      created_at: ago(200),
      updated_at: ago(192),
    },
    {
      property_id: properties[0].id,
      tenant_id: tenants[0]?.id,
      title: 'Radiator making banging sounds',
      description: 'Loud banging from bedroom radiator when heat first kicks on in morning.',
      status: 'closed',
      priority: 'low',
      created_at: ago(220),
      updated_at: ago(210),
    },
  ]
}
```

After defining these data generators, update the main seeding function to:
1. Create the 8 properties using PROPERTIES array
2. Create 10 tenants using TENANTS array (sign up + confirm each)
3. Call generateRentRecords(createdProperties, landlordId) and insert all records
4. Call generateExpenses(createdProperties, landlordId) and insert all records
5. Call generateWorkOrders(createdProperties, createdTenants) and insert all records
6. Log counts at end: "Seeded: X properties, Y tenants, Z rent records, W expenses, V work orders"

### Validation
After rewriting, run: `npx tsc --noEmit`
Fix any TypeScript errors before finishing.
Do NOT run the seed script — that is done manually by the user.
