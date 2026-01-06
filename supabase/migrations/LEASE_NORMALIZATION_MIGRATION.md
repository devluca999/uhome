# Lease Normalization Migration Guide

## Overview

This guide covers the database migrations required to normalize the lease architecture. These migrations add `lease_id` columns to maintenance_requests, rent_records, and documents tables, making them lease-scoped instead of property/tenant-scoped.

## Migration Files

Run these migrations in order on both **main** and **staging** databases:

1. `add_lease_id_to_maintenance_requests.sql` - Makes maintenance requests lease-scoped
2. `add_lease_id_to_rent_records.sql` - Makes rent records lease-scoped
3. `add_lease_id_to_documents.sql` - Makes documents lease-scoped (optional, can be property-scoped)

## Execution Order

Run migrations in this exact order:

```sql
-- 1. Maintenance Requests
-- Run: add_lease_id_to_maintenance_requests.sql

-- 2. Rent Records
-- Run: add_lease_id_to_rent_records.sql

-- 3. Documents
-- Run: add_lease_id_to_documents.sql
```

## Running Migrations

### On Main Database

1. Open Supabase Dashboard → SQL Editor (your main project)
2. Run each migration file in order (copy/paste the contents)
3. Verify each migration completes successfully

### On Staging Database

1. Open Supabase Dashboard → SQL Editor (your staging project)
2. Run each migration file in the same order
3. Verify each migration completes successfully

## What Each Migration Does

### 1. Maintenance Requests

- Adds `lease_id` column
- Backfills `lease_id` from existing `property_id + tenant_id` pairs
- Makes `property_id` and `tenant_id` nullable (backward compatibility)
- Updates RLS policies to check lease access
- Creates new indexes

### 2. Rent Records

- Adds `lease_id` column
- Backfills `lease_id` from existing `property_id + tenant_id` pairs
- Makes `property_id` and `tenant_id` nullable (backward compatibility)
- Updates RLS policies to check lease access
- Creates new indexes

### 3. Documents

- Adds `lease_id` column (nullable - documents can be lease or property-scoped)
- Backfills `lease_id` where possible
- Updates RLS policies to support both lease and property access
- Creates new indexes

## Data Migration Strategy

### Backfilling `lease_id`

For existing records, migrations automatically backfill `lease_id` by:

1. Finding matching lease for `property_id + tenant_id` combination
2. Preferring active leases (no end date or end date in future)
3. If multiple leases exist, using most recent by start date
4. If no lease exists, leaving `lease_id` NULL (backward compatibility)

### Backward Compatibility

During and after migration:

- `property_id` and `tenant_id` remain nullable
- RLS policies support both old and new query patterns
- Application code gradually migrates to use `lease_id` only
- Old records without `lease_id` still accessible via `property_id`/`tenant_id`

## Verification

After running all migrations, verify they were applied:

```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('maintenance_requests', 'rent_records', 'documents')
AND column_name = 'lease_id';

-- Check indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('maintenance_requests', 'rent_records', 'documents')
AND indexname LIKE '%lease_id%';

-- Check backfill success (should show 0 or very few NULLs if leases exist)
SELECT 
  COUNT(*) as total,
  COUNT(lease_id) as with_lease_id,
  COUNT(*) - COUNT(lease_id) as without_lease_id
FROM maintenance_requests;

SELECT 
  COUNT(*) as total,
  COUNT(lease_id) as with_lease_id,
  COUNT(*) - COUNT(lease_id) as without_lease_id
FROM rent_records;

-- Check RLS policies
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('maintenance_requests', 'rent_records', 'documents')
ORDER BY tablename, policyname;
```

## Troubleshooting

### Migration Fails

**Error: "relation does not exist"**
- Ensure `leases` table exists (run `create_leases_table.sql` first)
- Ensure `properties` and `tenants` tables exist

**Error: "duplicate key value"**
- Check for duplicate leases with same property_id + tenant_id
- Migration handles this, but may need manual review

**Error: "foreign key constraint"**
- Ensure all referenced leases exist
- Check that property_id and tenant_id values are valid

### Data Issues

**Many records without `lease_id`**
- This is expected if leases don't exist for those property/tenant pairs
- Application code should handle NULL `lease_id` gracefully
- Consider creating leases for orphaned records

**Wrong `lease_id` assigned**
- Review backfill logic in migration files
- Manually update incorrect assignments if needed
- Check lease dates match record dates

### RLS Policy Issues

**Users can't see their data**
- Verify RLS policies were created (see verification queries)
- Check user roles match policy requirements
- Verify lease relationships (property ownership, tenant assignment)

**Permission denied errors**
- Check that policies allow both lease_id and legacy property_id/tenant_id patterns
- Verify `auth.uid()` is available in policy context

## Rollback Plan

If you need to rollback:

1. **Remove `lease_id` columns** (data will be lost):
   ```sql
   ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS lease_id;
   ALTER TABLE rent_records DROP COLUMN IF EXISTS lease_id;
   ALTER TABLE documents DROP COLUMN IF EXISTS lease_id;
   ```

2. **Restore NOT NULL constraints** (only if you have data for all records):
   ```sql
   ALTER TABLE maintenance_requests ALTER COLUMN property_id SET NOT NULL;
   ALTER TABLE maintenance_requests ALTER COLUMN tenant_id SET NOT NULL;
   -- Repeat for rent_records
   ```

3. **Restore old RLS policies** (refer to previous schema backups)

**Note:** Rollback is destructive. Only rollback if absolutely necessary and you have backups.

## Post-Migration

After migrations complete:

1. **Update application code** to use `lease_id` instead of `property_id`/`tenant_id`
2. **Test thoroughly** - verify tenants and landlords can access their data
3. **Monitor** - watch for any access control issues
4. **Gradually migrate** - old code paths will continue working during transition

## Related Documentation

- [Lease Model Architecture](../../docs/architecture/lease-model.md)
- [Messaging Architecture](../../docs/architecture/messaging.md)
- [Supabase Schema](../../docs/supabase_schema.md)

