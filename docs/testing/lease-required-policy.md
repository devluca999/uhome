# Lease-Required Test Policy

## Definition

A lease MUST exist in any test scenario where a tenant performs or receives any scoped interaction.

**Rationale**: In the uhome architecture, leases are first-class entities that scope tenant-landlord interactions. Tenant-scoped entities (messages, work orders, rent records, etc.) are tied to leases, not directly to properties or tenants. This ensures:

- Time-bound access (leases have start/end dates)
- Clear contractual relationships
- Support for lease history (multiple leases per property over time)
- Future multi-tenant lease support (roommates, co-signers)

## Tenant-Scoped Entities (Lease Required)

These entities **REQUIRE** a lease to exist in test scenarios:

1. **Messages** (`messages` table)
   - All messaging is lease-scoped (one thread per lease)
   - `lease_id` is NOT NULL
   - Tenant-landlord communication requires a lease contract

2. **Work Orders** (`maintenance_requests` table)
   - Maintenance requests are lease-scoped
   - `lease_id` is required (can be nullable for backward compatibility, but should be set in tests)
   - Work orders represent tenant-landlord interactions during a lease period

3. **Rent Records** (`rent_records` table)
   - Rent payments are tracked per lease
   - `lease_id` is required
   - Rent records track financial obligations tied to lease contracts

4. **Tasks** (`tasks` table)
   - Tasks assigned to tenants are lease-scoped
   - Tasks can be linked to leases via `linked_context_type='lease'`
   - Move-in checklists and tenant-specific tasks require a lease

5. **Notes** (`notes` table)
   - Notes attached to leases via `entity_type='lease'`
   - Lease-specific notes require a lease to exist
   - Property-level notes do NOT require a lease

6. **Tenant-Scoped Documents** (`documents` table)
   - Documents linked to leases via `lease_id`
   - Lease agreements, addendums, and tenant-specific documents require a lease
   - Property-level documents do NOT require a lease

## Property-Only Entities (Lease Optional)

These entities do NOT require a lease:

1. **Property-level Documents**
   - General property documents (permits, insurance, etc.)
   - Linked via `property_id` only, `lease_id` is NULL

2. **Property Settings**
   - Property configuration and settings
   - House rules, utilities, amenities
   - Not tied to specific leases

3. **Property Notes**
   - Notes attached to properties via `entity_type='property'`
   - Property management notes, maintenance history
   - Not tenant-specific

## Enforcement Rules

### Test Seed Helpers

The `seedTestScenario` function in `tests/helpers/seed.ts` enforces lease requirements:

1. **Centralized Lease Creation**: 
   - Helper function `requiresLease(options)` determines if a lease is needed
   - Lease is created automatically when any tenant-scoped entity is requested
   - Single source of truth for lease creation logic

2. **Dev-Only Guard**:
   ```typescript
   if (
     process.env.NODE_ENV !== 'production' &&
     seeded.tenant &&
     requiresLease(options) &&
     !seeded.lease
   ) {
     throw new Error(
       '[SEED ERROR] Tenant-scoped entities require a lease but none was created.'
     )
   }
   ```
   - Fails loudly in non-production environments
   - Prevents silent invalid states
   - Ensures tests fail fast if logic error exists

3. **Lease Usage in Seed Data**:
   - Work orders use `seeded.lease?.id` for `lease_id`
   - Messages require lease (created automatically)
   - Tasks can link to lease via `linked_context_type`
   - All tenant-scoped entities reference the centralized lease

### RLS Policy Enforcement

Row Level Security (RLS) policies enforce lease requirements at the database level:

1. **Tenant Access**: Tenants can only access lease-scoped data for leases they are part of
2. **Landlord Access**: Landlords can access lease-scoped data for leases on their properties
3. **Lease-Scoped Queries**: RLS policies check `lease_id` to determine access

See [RLS Policies](../security/rls.md) for detailed policy definitions.

## Test Scenario Examples

### ✅ Valid: Work Orders with Lease

```typescript
const seeded = await seedTestScenario({
  propertyName: 'Test Property',
  createWorkOrders: true, // Lease created automatically
  createMessages: true,
})
// ✅ Lease exists, work orders have lease_id set
```

### ✅ Valid: Property-Only Entities (No Lease Required)

```typescript
const seeded = await seedTestScenario({
  propertyName: 'Test Property',
  // No tenant-scoped entities, no lease needed
})
// ✅ Valid: Property exists without lease
```

### ❌ Invalid: Work Orders without Lease

```typescript
// This would fail the dev guard:
const seeded = await seedTestScenario({
  propertyName: 'Test Property',
  tenantEmail: 'test@example.com',
  createWorkOrders: true,
  // Missing: lease creation logic
})
// ❌ ERROR: Tenant-scoped entities require a lease but none was created
```

## Implementation Details

### Lease Creation Logic

Leases are created with the following defaults in test scenarios:

- `status: 'active'` - Active lease (not draft)
- `lease_type: 'long-term'` - Long-term lease
- `lease_start_date: new Date()` - Current date
- `rent_amount: 1500` - Default rent
- `rent_frequency: 'monthly'` - Monthly rent

### Lease-Scoped Entity Creation

When creating tenant-scoped entities:

1. Check if lease exists (via `requiresLease()`)
2. Create lease if needed (centralized logic)
3. Use `seeded.lease?.id` for `lease_id` fields
4. Ensure all tenant-scoped entities reference the same lease

## Related Documentation

- [Lease Model Architecture](../architecture/lease-model.md) - Comprehensive lease model documentation
- [RLS Policies](../security/rls.md) - Row Level Security enforcement
- [Database Setup](../../supabase/DATABASE_SETUP.md) - Database schema and migrations
- [E2E Test Scenarios](./e2e-scenarios.md) - End-to-end test examples

