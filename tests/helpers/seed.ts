/**
 * Test Seeding Helpers
 *
 * Provides deterministic seeding for E2E tests against staging database.
 * All seeded data is tagged with is_test = true for easy cleanup.
 */

import { getSupabaseClient, getSupabaseAdminClient } from './db-helpers'
import { generateTestEmail, createAndConfirmUser } from './auth-helpers'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SeedOptions {
  landlordEmail?: string
  tenantEmail?: string
  propertyName?: string
  createWorkOrders?: boolean
  createMessages?: boolean
  createTasks?: boolean
  createRentRecords?: boolean
  createNotes?: boolean
  createTenantScopedDocuments?: boolean
  workOrderInitiator?: 'tenant' | 'landlord'
}

export interface SeededData {
  landlord: {
    userId: string
    email: string
  }
  tenant?: {
    userId: string
    email: string
    tenantId: string
  }
  property?: {
    id: string
    name: string
  }
  household?: {
    id: string
  }
  workOrders?: Array<{ id: string }>
  lease?: {
    id: string
  }
}

/**
 * Determine if lease creation is required based on seed options
 * Lease is required for tenant-scoped entities: messages, work orders, tasks, rent records, notes, tenant-scoped documents
 */
function requiresLease(options: SeedOptions): boolean {
  return Boolean(
    options.createMessages ||
    options.createWorkOrders ||
    options.createRentRecords ||
    options.createTenantScopedDocuments ||
    options.createNotes ||
    options.createTasks
  )
}

/**
 * Seed a complete test scenario with landlord, tenant, property, and relationships
 */
export async function seedTestScenario(options: SeedOptions = {}): Promise<SeededData> {
  // Use admin client for user creation (requires service key)
  const supabaseAdmin = getSupabaseAdminClient()
  // Use regular client for data operations (respects RLS)
  const supabase = getSupabaseClient()

  const landlordEmail = options.landlordEmail || generateTestEmail('landlord')
  const tenantEmail = options.tenantEmail || generateTestEmail('tenant')

  // Create landlord user using signUp + confirm (proper password hashing)
  // DO NOT use admin.createUser for loginable users - it bypasses password hashing
  const { userId: landlordUserId } = await createAndConfirmUser(landlordEmail, 'TestPassword123!')

  // Create landlord in users table (use admin client to bypass RLS)
  const { error: landlordUserError } = await supabaseAdmin.from('users').upsert({
    id: landlordUserId,
    email: landlordEmail,
    role: 'landlord',
  })

  if (landlordUserError) throw landlordUserError

  const seeded: SeededData = {
    landlord: {
      userId: landlordUserId,
      email: landlordEmail,
    },
  }

  // Create property if requested (use admin client to bypass RLS)
  if (options.propertyName) {
    const propertyName = options.propertyName
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .insert({
        owner_id: landlordUserId,
        name: propertyName,
        address: '123 Test Street',
        rent_amount: 1500,
        rent_due_date: 1,
      })
      .select()
      .single()

    if (propertyError) throw propertyError
    seeded.property = { id: property.id, name: property.name }
  }

  // Create tenant if requested
  if (tenantEmail && seeded.property) {
    // Create tenant user using signUp + confirm (proper password hashing)
    // DO NOT use admin.createUser for loginable users - it bypasses password hashing
    const { userId: tenantUserId } = await createAndConfirmUser(tenantEmail, 'TestPassword123!')

    // Create tenant in users table (use admin client to bypass RLS)
    const { error: tenantUserError } = await supabaseAdmin.from('users').upsert({
      id: tenantUserId,
      email: tenantEmail,
      role: 'tenant',
    })

    if (tenantUserError) throw tenantUserError

    // Create household (use admin client to bypass RLS)
    const { data: household, error: householdError } = await supabaseAdmin
      .from('households')
      .insert({
        property_id: seeded.property.id,
        name: 'Test Household',
      })
      .select()
      .single()

    if (householdError) throw householdError
    seeded.household = { id: household.id }

    // Create tenant record (use admin client to bypass RLS)
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        user_id: tenantUserId,
        property_id: seeded.property.id,
        household_id: household.id,
        move_in_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (tenantError) throw tenantError
    seeded.tenant = {
      userId: tenantUserId,
      email: tenantEmail,
      tenantId: tenant.id,
    }

    // Create lease if needed for tenant-scoped entities (use admin client to bypass RLS)
    if (requiresLease(options)) {
      const { data: lease, error: leaseError } = await supabaseAdmin
        .from('leases')
        .insert({
          property_id: seeded.property.id,
          tenant_id: tenant.id,
          lease_start_date: new Date().toISOString().split('T')[0],
          lease_type: 'long-term',
          rent_amount: 1500,
          rent_frequency: 'monthly',
          status: 'active', // Required: status column from add_lease_status_and_draft_support.sql
        })
        .select()
        .single()

      if (leaseError) throw leaseError
      seeded.lease = { id: lease.id }
    }
  }

  // Create work orders if requested (use admin client to bypass RLS)
  // Production schema requires: created_by_role, lease_id (if lease exists), proper status values
  // Work orders are lease-scoped when a lease exists
  if (options.createWorkOrders && seeded.property && seeded.tenant) {
    const workOrders = []

    // Use lease_id from centralized lease creation (lease-scoped work orders)
    const leaseId = seeded.lease?.id || null

    // Determine creator role (default to tenant if not specified)
    const creatorRole = options.workOrderInitiator || 'tenant'
    const creatorId = creatorRole === 'tenant' ? seeded.tenant.userId : seeded.landlord.userId

    for (let i = 0; i < 3; i++) {
      // Use production schema: created_by_role is required, status uses canonical values
      // Status values: 'submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed'
      const workOrderData = {
        property_id: seeded.property.id,
        tenant_id: seeded.tenant.tenantId,
        lease_id: leaseId, // Lease-scoped (lease created via centralized logic)
        status: i === 0 ? 'submitted' : i === 1 ? 'in_progress' : 'resolved', // Canonical statuses
        description: `Test work order ${i + 1}`, // Kept for backward compatibility
        public_description: `Test work order ${i + 1}`, // Description visible to tenants
        created_by: creatorId, // Creator (tenant or landlord)
        created_by_role: creatorRole as 'tenant' | 'landlord', // Required: role of creator
        visibility_to_tenants: true, // Default: visible to tenants
      }

      const { data: workOrder, error: workOrderError } = await supabaseAdmin
        .from('maintenance_requests')
        .insert(workOrderData)
        .select()
        .single()

      if (workOrderError) throw workOrderError
      workOrders.push({ id: workOrder.id })
    }
    seeded.workOrders = workOrders
  }

  // Create a baseline expense for the property so finances and property-level
  // expenses views have consistent seed data (use admin client to bypass RLS).
  // This also ensures the Upcoming Expenses widget has at least one item.
  if (seeded.property) {
    const today = new Date()
    const expenseDate = today.toISOString().split('T')[0]
    const nextDue = new Date(today)
    nextDue.setDate(nextDue.getDate() + 7)
    const nextDueStr = nextDue.toISOString().split('T')[0]

    const { error: expenseError } = await supabaseAdmin.from('expenses').insert({
      property_id: seeded.property.id,
      amount: 120,
      category: 'maintenance',
      description: 'Seeded Test Expense',
      expense_date: expenseDate,
      type: 'one_time',
      status: 'planned',
      next_due_date: nextDueStr,
      title: 'Seeded Test Expense',
    })

    if (expenseError) throw expenseError
  }

  // Create tasks if requested (use admin client to bypass RLS)
  // Tasks table from create_tasks_table.sql (required for production schema)
  if (options.createTasks && seeded.tenant && seeded.property) {
    const { error: taskError } = await supabaseAdmin.from('tasks').insert({
      title: 'Test Task',
      assigned_to_type: 'tenant',
      assigned_to_id: seeded.tenant.tenantId,
      status: 'pending',
      linked_context_type: 'property',
      linked_context_id: seeded.property.id,
      created_by: seeded.landlord.userId,
      checklist_items: [
        { id: '1', text: 'Item 1', completed: false },
        { id: '2', text: 'Item 2', completed: false },
      ],
    })

    if (taskError) throw taskError
  }

  // Dev-only guard: Fail loudly if tenant context exists without lease when lease is required
  // This prevents silent invalid states in test scenarios
  if (
    process.env.NODE_ENV !== 'production' &&
    seeded.tenant &&
    requiresLease(options) &&
    !seeded.lease
  ) {
    throw new Error(
      '[SEED ERROR] Tenant-scoped entities require a lease but none was created. ' +
        'This indicates a logic error in seedTestScenario.'
    )
  }

  return seeded
}

/**
 * Seed a minimal test scenario (just landlord and property)
 */
export async function seedMinimalScenario(): Promise<SeededData> {
  return seedTestScenario({
    propertyName: 'Test Property',
  })
}

/**
 * Seed a full test scenario (landlord, tenant, property, work orders, messages)
 */
export async function seedFullScenario(): Promise<SeededData> {
  return seedTestScenario({
    propertyName: 'Test Property',
    createWorkOrders: true,
    createMessages: true,
    createTasks: true,
  })
}
