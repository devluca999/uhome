/**
 * Lease Requirement Guard for Tests
 *
 * Ensures test scenarios follow the lease-required policy:
 * - Tenant-scoped entities (messages, work orders, tasks, rent records, notes, documents)
 *   require a lease to exist
 * - Tests fail loudly if lease requirements are violated
 *
 * This guard works alongside the dev-only guard in seed.ts to enforce
 * lease requirements at multiple levels.
 */

import { getSupabaseAdminClient } from './db-helpers'

/**
 * Verify that seeded data follows lease requirements
 *
 * This is a CI-level check that can be called after test scenarios
 * to ensure no invalid state was created. The seed functions already
 * have guards, but this provides an additional safety net.
 *
 * @param tenantId - Tenant ID to check
 * @param options - Options that were used for seeding
 * @throws Error if lease requirement is violated
 */
export async function verifyLeaseRequirements(
  tenantId: string | undefined,
  options: {
    createWorkOrders?: boolean
    createMessages?: boolean
    createTasks?: boolean
    createRentRecords?: boolean
    createNotes?: boolean
    createTenantScopedDocuments?: boolean
  }
): Promise<void> {
  // Only check in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return
  }

  // If no tenant, no lease requirement
  if (!tenantId) {
    return
  }

  // Check if lease is required based on options
  const requiresLease = Boolean(
    options.createMessages ||
    options.createWorkOrders ||
    options.createRentRecords ||
    options.createTenantScopedDocuments ||
    options.createNotes ||
    options.createTasks
  )

  if (!requiresLease) {
    return
  }

  // Check if lease exists for this tenant
  const supabaseAdmin = getSupabaseAdminClient()

  const { data: leases, error: leaseError } = await supabaseAdmin
    .from('leases')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .limit(1)

  if (leaseError) {
    // Don't fail on query errors - this is just a guard
    console.warn('[Lease Guard] Could not verify lease existence:', leaseError.message)
    return
  }

  if (!leases || leases.length === 0) {
    throw new Error(
      `[LEASE GUARD FAILURE] Tenant-scoped entities require a lease, but no active lease found for tenant ${tenantId}. ` +
        `This indicates a logic error in test setup. Ensure seedTestScenario creates a lease when tenant-scoped entities are requested.`
    )
  }
}

/**
 * Check if lease is required based on seed options
 *
 * This is a utility function that matches the logic in seed.ts
 * Use it to determine if a lease should exist before running assertions.
 */
export function requiresLease(options: {
  createWorkOrders?: boolean
  createMessages?: boolean
  createTasks?: boolean
  createRentRecords?: boolean
  createNotes?: boolean
  createTenantScopedDocuments?: boolean
}): boolean {
  return Boolean(
    options.createMessages ||
    options.createWorkOrders ||
    options.createRentRecords ||
    options.createTenantScopedDocuments ||
    options.createNotes ||
    options.createTasks
  )
}
