/**
 * Deterministic Mock Data for Visual UAT
 *
 * All data is static and identical on every run:
 * - Fixed UUIDs
 * - Fixed dates (not relative to today)
 * - Fixed amounts
 * - Fixed statuses
 *
 * This ensures visual tests produce identical screenshots every run.
 */

// Fixed UUIDs for deterministic data
export const MOCK_LANDLORD_ID = '00000000-0000-0000-0000-000000000001'
export const MOCK_TENANT_1_ID = '00000000-0000-0000-0000-000000000002'
export const MOCK_TENANT_2_ID = '00000000-0000-0000-0000-000000000003'
export const MOCK_TENANT_3_ID = '00000000-0000-0000-0000-000000000004'

export const MOCK_PROPERTY_1_ID = '10000000-0000-0000-0000-000000000001'
export const MOCK_PROPERTY_2_ID = '10000000-0000-0000-0000-000000000002'
export const MOCK_PROPERTY_3_ID = '10000000-0000-0000-0000-000000000003'

export const MOCK_TENANT_ASSIGNMENT_1_ID = '20000000-0000-0000-0000-000000000001'
export const MOCK_TENANT_ASSIGNMENT_2_ID = '20000000-0000-0000-0000-000000000002'
export const MOCK_TENANT_ASSIGNMENT_3_ID = '20000000-0000-0000-0000-000000000003'

// Fixed dates (deterministic, not relative to today)
const BASE_DATE = '2024-01-01' // Base date for calculations
const FIXED_DATES = {
  // Property dates
  PROPERTY_1_CREATED: '2023-06-15T00:00:00Z',
  PROPERTY_2_CREATED: '2023-07-20T00:00:00Z',
  PROPERTY_3_CREATED: '2023-08-10T00:00:00Z',

  // Tenant move-in dates
  TENANT_1_MOVE_IN: '2024-01-15',
  TENANT_2_MOVE_IN: '2024-02-01',
  TENANT_3_MOVE_IN: '2024-03-01',

  // Lease end dates
  TENANT_1_LEASE_END: '2025-01-14',
  TENANT_2_LEASE_END: '2025-01-31',
  TENANT_3_LEASE_END: null,
}

// Mock Users
export const MOCK_USERS = [
  {
    id: MOCK_LANDLORD_ID,
    email: 'landlord@example.com',
    role: 'landlord',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: MOCK_TENANT_1_ID,
    email: 'tenant1@example.com',
    role: 'tenant',
    created_at: '2023-12-01T00:00:00Z',
    updated_at: '2023-12-01T00:00:00Z',
  },
  {
    id: MOCK_TENANT_2_ID,
    email: 'tenant2@example.com',
    role: 'tenant',
    created_at: '2023-12-15T00:00:00Z',
    updated_at: '2023-12-15T00:00:00Z',
  },
  {
    id: MOCK_TENANT_3_ID,
    email: 'tenant3@example.com',
    role: 'tenant',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// Mock Properties
export const MOCK_PROPERTIES = [
  {
    id: MOCK_PROPERTY_1_ID,
    owner_id: MOCK_LANDLORD_ID,
    name: '123 Oak Street',
    address: '123 Oak Street, San Francisco, CA 94102',
    rent_amount: 2800,
    rent_due_date: 1,
    rules: 'No smoking. Quiet hours after 10 PM. Pets allowed with deposit.',
    created_at: FIXED_DATES.PROPERTY_1_CREATED,
    updated_at: FIXED_DATES.PROPERTY_1_CREATED,
  },
  {
    id: MOCK_PROPERTY_2_ID,
    owner_id: MOCK_LANDLORD_ID,
    name: '456 Pine Avenue',
    address: '456 Pine Avenue, Apt 2B, San Francisco, CA 94103',
    rent_amount: 3200,
    rent_due_date: 5,
    rules: 'No pets. Street parking available. Building has laundry facilities.',
    created_at: FIXED_DATES.PROPERTY_2_CREATED,
    updated_at: FIXED_DATES.PROPERTY_2_CREATED,
  },
  {
    id: MOCK_PROPERTY_3_ID,
    owner_id: MOCK_LANDLORD_ID,
    name: '789 Elm Drive',
    address: '789 Elm Drive, Unit 5, San Francisco, CA 94104',
    rent_amount: 2400,
    rent_due_date: 15,
    rules: 'Garden access. Bicycle storage available. Tenant responsible for utilities.',
    created_at: FIXED_DATES.PROPERTY_3_CREATED,
    updated_at: FIXED_DATES.PROPERTY_3_CREATED,
  },
]

// Mock Tenant Assignments
export const MOCK_TENANTS = [
  {
    id: MOCK_TENANT_ASSIGNMENT_1_ID,
    user_id: MOCK_TENANT_1_ID,
    property_id: MOCK_PROPERTY_1_ID,
    move_in_date: FIXED_DATES.TENANT_1_MOVE_IN,
    lease_end_date: FIXED_DATES.TENANT_1_LEASE_END,
    created_at: '2023-12-15T00:00:00Z',
    updated_at: '2023-12-15T00:00:00Z',
  },
  {
    id: MOCK_TENANT_ASSIGNMENT_2_ID,
    user_id: MOCK_TENANT_2_ID,
    property_id: MOCK_PROPERTY_2_ID,
    move_in_date: FIXED_DATES.TENANT_2_MOVE_IN,
    lease_end_date: FIXED_DATES.TENANT_2_LEASE_END,
    created_at: '2023-12-20T00:00:00Z',
    updated_at: '2023-12-20T00:00:00Z',
  },
  {
    id: MOCK_TENANT_ASSIGNMENT_3_ID,
    user_id: MOCK_TENANT_3_ID,
    property_id: MOCK_PROPERTY_3_ID,
    move_in_date: FIXED_DATES.TENANT_3_MOVE_IN,
    lease_end_date: FIXED_DATES.TENANT_3_LEASE_END,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// Generate 15 months of rent records (deterministic)
// Starting from 2023-01-01, going forward 15 months
function generateRentRecords() {
  const records: any[] = []
  const paymentMethods = ['Zelle', 'Cash', 'Check', 'Venmo', 'Bank Transfer']

  // Fixed pattern for status distribution
  const statusPattern = [
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'paid',
    'pending',
    'paid',
  ]

  MOCK_PROPERTIES.forEach((property, propIndex) => {
    const tenant = MOCK_TENANTS[propIndex]
    if (!tenant) return

    const rentAmount = property.rent_amount
    const dueDay = property.rent_due_date || 1

    // Generate 15 months starting from 2023-01-01
    for (let monthOffset = 0; monthOffset < 15; monthOffset++) {
      const year = 2023 + Math.floor(monthOffset / 12)
      const month = (monthOffset % 12) + 1
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`

      const status = statusPattern[monthOffset] as 'paid' | 'pending' | 'overdue'
      let paidDate: string | null = null
      let paymentMethod: string | null = null

      if (status === 'paid') {
        // Fixed paid dates: 70% on time, 20% early, 10% late
        const paidVariation = monthOffset % 10
        if (paidVariation < 7) {
          // On time
          paidDate = dueDate
        } else if (paidVariation < 9) {
          // Early (1-2 days before)
          const dueDateObj = new Date(dueDate)
          dueDateObj.setDate(dueDateObj.getDate() - 1)
          paidDate = dueDateObj.toISOString().split('T')[0]
        } else {
          // Late (1-3 days after)
          const dueDateObj = new Date(dueDate)
          dueDateObj.setDate(dueDateObj.getDate() + 2)
          paidDate = dueDateObj.toISOString().split('T')[0]
        }
        paymentMethod = paymentMethods[monthOffset % paymentMethods.length]
      }

      records.push({
        id: `30000000-0000-0000-0000-${String(propIndex * 100 + monthOffset).padStart(12, '0')}`,
        property_id: property.id,
        tenant_id: tenant.id,
        amount: rentAmount,
        due_date: dueDate,
        status,
        paid_date: paidDate,
        payment_method_type: status === 'paid' ? 'external' : null,
        payment_method_label: paymentMethod,
        notes: monthOffset % 5 === 0 ? `Payment note for ${dueDate}` : null,
        created_at: `${dueDate}T00:00:00Z`,
        updated_at: paidDate ? `${paidDate}T00:00:00Z` : `${dueDate}T00:00:00Z`,
      })
    }
  })

  return records
}

export const MOCK_RENT_RECORDS = generateRentRecords()

// Generate 20 expense records (deterministic)
function generateExpenses() {
  const expenses: any[] = []
  const categories = [
    'maintenance',
    'utilities',
    'repairs',
    'insurance',
    'taxes',
    'landscaping',
    'cleaning',
  ]
  const descriptions = {
    maintenance: [
      'Monthly HVAC service',
      'Gutter cleaning',
      'Lawn mowing service',
      'Window cleaning',
    ],
    utilities: ['Water bill', 'Electricity bill', 'Gas bill', 'Trash collection'],
    repairs: [
      'Plumbing repair - kitchen sink',
      'Electrical repair - outlet replacement',
      'Roof leak repair',
      'Door lock replacement',
    ],
    insurance: ['Property insurance premium', 'Liability insurance'],
    taxes: ['Property tax payment', 'Quarterly tax payment'],
    landscaping: ['Tree trimming', 'Garden maintenance', 'Sprinkler system repair'],
    cleaning: ['Deep cleaning service', 'Carpet cleaning', 'Window washing'],
  }

  const amounts = {
    insurance: [450, 320],
    taxes: [600, 350],
    repairs: [280, 150, 420, 95],
    utilities: [120, 180, 90, 75],
    maintenance: [200, 150, 180, 120],
    landscaping: [250, 180, 220],
    cleaning: [300, 200, 180],
  }

  // Generate 20 expenses across 12 months (2023-01 to 2023-12)
  for (let i = 0; i < 20; i++) {
    const month = (i % 12) + 1
    const day = ((i * 3) % 28) + 1
    const date = `2023-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const category = categories[i % categories.length]
    const categoryDescriptions = descriptions[category as keyof typeof descriptions]
    const description = categoryDescriptions[i % categoryDescriptions.length]
    const categoryAmounts = amounts[category as keyof typeof amounts]
    const amount = categoryAmounts[i % categoryAmounts.length]

    const propertyIndex = i % MOCK_PROPERTIES.length
    const property = MOCK_PROPERTIES[propertyIndex]

    expenses.push({
      id: `40000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      property_id: property.id,
      user_id: MOCK_LANDLORD_ID,
      category,
      description,
      amount,
      date,
      is_recurring: category === 'utilities' && i % 2 === 0,
      created_at: `${date}T00:00:00Z`,
      updated_at: `${date}T00:00:00Z`,
    })
  }

  return expenses
}

export const MOCK_EXPENSES = generateExpenses()

// Mock Maintenance Requests
export const MOCK_MAINTENANCE_REQUESTS = [
  {
    id: '50000000-0000-0000-0000-000000000001',
    property_id: MOCK_PROPERTY_1_ID,
    tenant_id: MOCK_TENANT_ASSIGNMENT_1_ID,
    status: 'pending',
    category: 'Plumbing',
    description: 'Kitchen sink is leaking slowly. Dripping every few seconds.',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
  {
    id: '50000000-0000-0000-0000-000000000002',
    property_id: MOCK_PROPERTY_1_ID,
    tenant_id: MOCK_TENANT_ASSIGNMENT_1_ID,
    status: 'in_progress',
    category: 'HVAC',
    description: 'AC unit making loud noise in living room. Still works but very noisy.',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
  },
  {
    id: '50000000-0000-0000-0000-000000000003',
    property_id: MOCK_PROPERTY_1_ID,
    tenant_id: MOCK_TENANT_ASSIGNMENT_1_ID,
    status: 'completed',
    category: 'Electrical',
    description: 'Bedroom light switch not working properly. Fixed by electrician.',
    created_at: '2023-12-20T00:00:00Z',
    updated_at: '2023-12-22T00:00:00Z',
  },
  {
    id: '50000000-0000-0000-0000-000000000004',
    property_id: MOCK_PROPERTY_2_ID,
    tenant_id: MOCK_TENANT_ASSIGNMENT_2_ID,
    status: 'pending',
    category: 'General',
    description: 'Front door lock is sticky, hard to turn key.',
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
  },
  {
    id: '50000000-0000-0000-0000-000000000005',
    property_id: MOCK_PROPERTY_2_ID,
    tenant_id: MOCK_TENANT_ASSIGNMENT_2_ID,
    status: 'completed',
    category: 'Appliance',
    description: 'Dishwasher not draining properly. Fixed by replacing drain hose.',
    created_at: '2023-12-15T00:00:00Z',
    updated_at: '2023-12-18T00:00:00Z',
  },
]

// Mock Documents
export const MOCK_DOCUMENTS = [
  {
    id: '60000000-0000-0000-0000-000000000001',
    property_id: MOCK_PROPERTY_1_ID,
    uploaded_by: MOCK_LANDLORD_ID,
    file_url: 'https://via.placeholder.com/800x1000.pdf',
    file_name: 'Lease Agreement - 2024.pdf',
    file_type: 'application/pdf',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000002',
    property_id: MOCK_PROPERTY_1_ID,
    uploaded_by: MOCK_LANDLORD_ID,
    file_url: 'https://via.placeholder.com/800x600.pdf',
    file_name: 'Keys and Access Instructions.pdf',
    file_type: 'application/pdf',
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000003',
    property_id: MOCK_PROPERTY_2_ID,
    uploaded_by: MOCK_LANDLORD_ID,
    file_url: 'https://via.placeholder.com/800x800.pdf',
    file_name: 'Maintenance Guidelines.pdf',
    file_type: 'application/pdf',
    created_at: '2024-01-03T00:00:00Z',
  },
]

// Mock Notes (10+ notes)
export const MOCK_NOTES = [
  // Property notes
  {
    id: '70000000-0000-0000-0000-000000000001',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'property',
    entity_id: MOCK_PROPERTY_1_ID,
    content:
      '**Property Notes**\n\nThis property has been well-maintained. Tenant is responsive to communication.',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: '70000000-0000-0000-0000-000000000002',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'property',
    entity_id: MOCK_PROPERTY_1_ID,
    content:
      '**Maintenance Schedule**\n\n- HVAC service: Quarterly\n- Gutter cleaning: Bi-annually\n- Landscaping: Monthly',
    created_at: '2024-01-06T00:00:00Z',
    updated_at: '2024-01-06T00:00:00Z',
  },
  {
    id: '70000000-0000-0000-0000-000000000003',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'property',
    entity_id: MOCK_PROPERTY_2_ID,
    content: '**Property Notes**\n\nGood tenant relationship. Property in excellent condition.',
    created_at: '2024-01-07T00:00:00Z',
    updated_at: '2024-01-07T00:00:00Z',
  },
  {
    id: '70000000-0000-0000-0000-000000000004',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'property',
    entity_id: MOCK_PROPERTY_3_ID,
    content: '**Property Notes**\n\nNew tenant moved in recently. All systems working well.',
    created_at: '2024-01-08T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
  },
  // Rent record notes (20% of paid records)
  {
    id: '70000000-0000-0000-0000-000000000005',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'rent_record',
    entity_id: MOCK_RENT_RECORDS[0].id,
    content: '**Payment Note**\n\nReceived payment via Zelle. All good.',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '70000000-0000-0000-0000-000000000006',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'rent_record',
    entity_id: MOCK_RENT_RECORDS[5].id,
    content: '**Payment Note**\n\nReceived payment via Cash. Tenant requested receipt.',
    created_at: '2024-01-07T00:00:00Z',
    updated_at: '2024-01-07T00:00:00Z',
  },
  {
    id: '70000000-0000-0000-0000-000000000007',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'rent_record',
    entity_id: MOCK_RENT_RECORDS[10].id,
    content: '**Payment Note**\n\nReceived payment via Venmo. On time payment.',
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
  },
  // Expense notes (30% of expenses)
  {
    id: '70000000-0000-0000-0000-000000000008',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'expense',
    entity_id: MOCK_EXPENSES[0].id,
    content: '**Expense Note**\n\nMonthly HVAC service - Vendor invoice on file.',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: '70000000-0000-0000-0000-000000000009',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'expense',
    entity_id: MOCK_EXPENSES[5].id,
    content: '**Expense Note**\n\nPlumbing repair - kitchen sink - Completed by ABC Plumbing.',
    created_at: '2024-01-08T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
  },
  {
    id: '70000000-0000-0000-0000-000000000010',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'expense',
    entity_id: MOCK_EXPENSES[10].id,
    content: '**Expense Note**\n\nProperty insurance premium - Annual payment processed.',
    created_at: '2024-01-13T00:00:00Z',
    updated_at: '2024-01-13T00:00:00Z',
  },
  {
    id: '70000000-0000-0000-0000-000000000011',
    user_id: MOCK_LANDLORD_ID,
    entity_type: 'expense',
    entity_id: MOCK_EXPENSES[15].id,
    content: '**Expense Note**\n\nTree trimming - Scheduled maintenance completed.',
    created_at: '2024-01-18T00:00:00Z',
    updated_at: '2024-01-18T00:00:00Z',
  },
]

// Mock Tasks (for operations page)
export const MOCK_TASKS = [
  {
    id: '80000000-0000-0000-0000-000000000001',
    created_by: MOCK_LANDLORD_ID,
    linked_context_type: 'work_order',
    linked_context_id: MOCK_MAINTENANCE_REQUESTS[0].id,
    title: 'Fix kitchen sink leak',
    description: 'Schedule plumber to repair kitchen sink leak',
    status: 'pending',
    assigned_to_type: 'landlord',
    assigned_to_id: MOCK_LANDLORD_ID,
    checklist_items: [],
    image_urls: [],
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
  {
    id: '80000000-0000-0000-0000-000000000002',
    created_by: MOCK_LANDLORD_ID,
    linked_context_type: 'work_order',
    linked_context_id: MOCK_MAINTENANCE_REQUESTS[1].id,
    title: 'Inspect AC unit noise',
    description: 'Check AC unit for unusual noise',
    status: 'in_progress',
    assigned_to_type: 'landlord',
    assigned_to_id: MOCK_LANDLORD_ID,
    checklist_items: [
      { id: '1', text: 'Check AC filters', completed: true },
      { id: '2', text: 'Inspect compressor', completed: false },
    ],
    image_urls: [],
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
  },
]
