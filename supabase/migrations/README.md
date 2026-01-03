# Database Migrations

## Overview

This directory contains SQL migration files for the uhome database schema. Migrations are applied in order and should be run on both main and staging databases.

## Migration to Organizations Schema

### Main Migration File

**`migrate_to_organizations_schema.sql`** - Comprehensive migration that:

1. Creates new tables:
   - `organizations` - Landlord workspaces
   - `memberships` - User-organization relationships with roles
   - `households` - Tenant grouping
   - `subscriptions` - Organization-level subscriptions

2. Adds new columns:
   - `properties.organization_id` - Links properties to organizations
   - `tenants.household_id` - Links tenants to households

3. Creates helper functions:
   - `get_organization_by_owner()` - Lookup organization by owner
   - `ensure_landlord_organization()` - Auto-create organization (idempotent)
   - `get_user_organizations()` - Get all orgs for a user
   - `get_organization_landlord_count()` - Count landlord-side users
   - `can_add_collaborator()` - Check Pro plan collaborator limit

4. Creates RLS policies for all new tables

5. Updates existing RLS policies for properties and tenants

### Individual Migration Files

For reference, the main migration is broken down into:

- `create_organizations_table.sql` - Organizations table
- `create_memberships_table.sql` - Memberships table
- `create_households_table.sql` - Households table
- `create_subscriptions_table.sql` - Subscriptions table
- `add_organization_to_properties.sql` - Add organization_id to properties
- `add_household_to_tenants.sql` - Add household_id to tenants
- `create_organization_helpers.sql` - Helper functions
- `create_organization_rls_policies.sql` - RLS policies for new tables
- `update_properties_tenants_rls_for_organizations.sql` - Updated RLS policies

## Running Migrations

### On Main Database

1. Open Supabase Dashboard → SQL Editor
2. Run `migrate_to_organizations_schema.sql` in one go
3. Verify all tables and functions created successfully

### On Staging Database

1. Open Supabase Dashboard → SQL Editor (staging project)
2. Run `migrate_to_organizations_schema.sql` in one go
3. Verify all tables and functions created successfully

### Verification

After running the migration, verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'memberships', 'households', 'subscriptions');

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_organization_by_owner', 'ensure_landlord_organization', 'can_add_collaborator');

-- Check columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'properties' AND column_name = 'organization_id';
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tenants' AND column_name = 'household_id';
```

## Auto-Creation Behavior

### Organizations

Organizations are **auto-created** on first landlord access:

- Trigger: User login or first request to `/dashboard`, `/properties`, etc.
- Function: `ensure_landlord_organization(user_id, org_name)`
- Idempotent: Safe to call multiple times, won't create duplicates
- Creates:
  - Organization with default name "My Properties" (or custom name)
  - Owner membership
  - Default free subscription

### Application-Level Migration

The migration script creates the schema, but **data migration is lazy**:

1. Organizations created on first landlord access
2. Properties migrated to organizations as they're accessed
3. Households created for tenants as they're accessed
4. All migration is transparent to users

## Lazy Migration Strategy

### Why Lazy Migration?

- **No downtime** - Users can continue using the app
- **Transparent** - Users never see migration messages
- **Gradual** - Data migrated as it's accessed
- **Safe** - Backward compatible during transition

### Migration Steps (Application Code)

```typescript
// On landlord login or first dashboard access
async function ensureLandlordOrganization(userId: string) {
  // Check if org exists
  const existing = await getOrganizationByOwner(userId);
  if (existing) return existing;
  
  // Create org (idempotent)
  const org = await ensure_landlord_organization(userId, orgName);
  
  // Migrate properties (lazy, can be background job)
  await migratePropertiesToOrganization(userId, org.id);
  
  return org;
}
```

### Property Migration

When a property is accessed:

1. Check if `organization_id` is set
2. If not, get owner's organization
3. Set `organization_id` on property
4. Property now accessible via organization membership

### Household Migration

When a tenant is accessed:

1. Check if `household_id` is set
2. If not, create household for tenant
3. Link household to property
4. Set `household_id` on tenant
5. Tenant now accessible via household

## Backward Compatibility

### During Migration Period

The schema maintains backward compatibility:

- `properties.owner_id` - Still used for legacy access
- `tenants.property_id` - Still used for legacy access
- RLS policies check both new and old relationships

### After Migration Complete

Once all data is migrated:

- `owner_id` can be kept for reference
- `property_id` on tenants can be derived from household
- RLS policies can be simplified (future optimization)

## Key Design Decisions

1. **Nullable columns** - New columns are nullable to allow gradual migration
2. **Idempotent functions** - Safe to call multiple times
3. **RLS first** - All access controlled via RLS policies
4. **Application guards** - Pro plan limits enforced in application code
5. **Future-proof** - Schema supports multi-org later without breaking changes

## Troubleshooting

### Migration Fails

If migration fails partway through:

1. Check error message in Supabase SQL Editor
2. Fix the issue (usually syntax or constraint violation)
3. Re-run the migration (idempotent, safe to re-run)

### Missing Organizations

If organizations aren't auto-creating:

1. Check `ensure_landlord_organization()` function exists
2. Verify function has `SECURITY DEFINER` privilege
3. Check application code is calling the function
4. Verify user has `landlord` role in `users` table

### RLS Policy Issues

If users can't access data:

1. Check RLS policies are created
2. Verify policies allow both organization and owner_id access
3. Check user has membership in organization
4. Verify organization_id is set on properties

## Future Migrations

When adding new features:

1. Create new migration file with descriptive name
2. Include rollback instructions if needed
3. Test on staging first
4. Document in this README
5. Update main `schema.sql` file

