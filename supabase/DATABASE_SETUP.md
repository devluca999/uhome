# Database Setup Guide

This guide explains how to set up and synchronize database schemas between staging and production environments.

## Overview

The uhome database uses a base schema (`schema.sql`) plus incremental migrations (`supabase/migrations/*.sql`). Staging and production databases must have identical schemas for tests to work correctly.

## Two-Environment Model

- **STAGING** - All development, dev mode, E2E tests, visual UAT, demos
- **PRODUCTION** - Real users only

Both environments must have identical schemas. Tests assume production schema.

## Schema Files

1. **`schema.sql`** - Base schema with core tables (users, properties, tenants, etc.)
2. **`schema-unified.sql`** - Reference file showing final state of key tables after migrations
3. **`migrations/apply-all-migrations.sql`** - Guide listing all migrations in dependency order
4. **`migrations/*.sql`** - Individual migration files

## Setting Up a Fresh Database

### Option 1: Base Schema + Migrations (Recommended)

1. Run `schema.sql` to create base tables
2. Run migrations in order (see `migrations/apply-all-migrations.sql`)
3. Verify schema matches production

### Option 2: Use Unified Schema Reference

1. Run `schema.sql` for base tables
2. Use `schema-unified.sql` as reference for key table structures
3. Run migrations to add indexes, RLS policies, triggers, functions

## Setting Up Staging Database

Staging database is missing several critical migrations. Run these in order:

### Critical Migrations (Required for Tests)

1. **`create_leases_table.sql`** - Creates leases table
2. **`add_lease_status_and_draft_support.sql`** - Adds `status` column to leases
3. **`make_work_order_tenant_optional.sql`** - Adds `created_by` to maintenance_requests
4. **`refactor_work_order_status_system.sql`** - Adds `created_by_role`, `scheduled_date`, `visibility_to_tenants`, `internal_notes`, `public_description` to maintenance_requests
5. **`add_lease_id_to_maintenance_requests.sql`** - Adds `lease_id` to maintenance_requests
6. **`create_tasks_table.sql`** - Creates tasks table

### Complete Migration List

See `migrations/apply-all-migrations.sql` for the complete list of migrations in dependency order.

## Running Migrations in Supabase SQL Editor

1. Open Supabase Dashboard → SQL Editor
2. For each migration file listed in `apply-all-migrations.sql`:
   - Open the migration file from `supabase/migrations/`
   - Copy its entire contents
   - Paste into SQL Editor
   - Click "Run" or press Ctrl+Enter
   - Wait for completion before proceeding
3. Run files in the exact order listed
4. Verify no errors occurred

## Verifying Schema Synchronization

After running migrations, verify schemas match:

```sql
-- Check leases table has status column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leases' AND column_name = 'status';
-- Should return: status | text | NO

-- Check maintenance_requests has created_by_role
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'maintenance_requests' AND column_name = 'created_by_role';
-- Should return: created_by_role | text | NO

-- Check maintenance_requests has lease_id
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'maintenance_requests' AND column_name = 'lease_id';
-- Should return: lease_id | uuid | YES

-- Check tasks table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'tasks';
-- Should return: tasks
```

## Key Schema Differences

### Leases Table

- **Added**: `status` column (CHECK: 'draft', 'active', 'ended')
- **Changed**: `tenant_id`, `lease_start_date`, `rent_amount` are now nullable (for drafts)

### Maintenance Requests Table

- **Added**: 
  - `lease_id` (nullable, lease-scoped)
  - `created_by` (user who created)
  - `created_by_role` (NOT NULL, 'landlord' or 'tenant')
  - `scheduled_date` (when scheduled)
  - `visibility_to_tenants` (boolean, default true)
  - `internal_notes` (landlord-only)
  - `public_description` (visible to tenants)
- **Changed**: 
  - `status` CHECK constraint: ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed')
  - `property_id` and `tenant_id` are now nullable (lease-scoped)

### Tasks Table

- **New table** - Does not exist in base schema.sql
- Must be created via `create_tasks_table.sql` migration

## Migration Dependencies

Critical dependency order:

1. **Leases table** must exist before:
   - Lease status migrations
   - Lease_id migrations
   - Messages/notifications tables

2. **Organizations** must exist before:
   - Organization_id migrations

3. **Work order tenant optional** must run before:
   - Work order status refactoring

4. **Work order status refactor** must run before:
   - Lease_id migration (because it sets created_by_role)

## Troubleshooting

### Migration Fails with "column does not exist"

- Check migration dependencies
- Ensure base schema.sql has been run
- Run migrations in order listed in `apply-all-migrations.sql`

### Migration Fails with "constraint violation"

- Check if migration has already been run
- Migrations use `IF NOT EXISTS` but constraints may conflict
- Drop conflicting constraints manually if needed

### Schema Mismatch Between Staging and Production

1. Compare column lists:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'maintenance_requests' 
   ORDER BY ordinal_position;
   ```
2. Run missing migrations on the outdated database
3. Verify with schema verification queries

## Test Requirements

Tests assume production schema. Key requirements:

- `leases.status` column exists
- `maintenance_requests.created_by_role` exists and is NOT NULL
- `maintenance_requests.lease_id` exists (nullable)
- `tasks` table exists

If tests fail with schema errors, ensure these migrations have been run on staging.

## Related Documentation

- `migrations/README.md` - Migration overview
- `migrations/MESSAGING_MIGRATION.md` - Messaging system migrations
- `migrations/LEASE_NORMALIZATION_MIGRATION.md` - Lease normalization guide
- `schema-unified.sql` - Reference for final table states
- `migrations/apply-all-migrations.sql` - Complete migration list

