# Critical RLS Policy Fixes Needed

## Summary of Issues

The console errors you're seeing are caused by three main issues:

### 1. **Conflicting RLS Policies on `users` Table** (500 errors)
- Multiple migrations created overlapping SELECT policies
- These policies have complex subqueries causing infinite loops and timeouts
- **Impact**: Queries to users table fail with 500 errors

### 2. **Restrictive Lease RLS Policies** (406 errors)  
- Tenant lease SELECT policy was too restrictive
- Only checked exact tenant_id match, not property_id
- 406 = "Not Acceptable" indicates RLS is blocking access
- **Impact**: Tenants cannot access their leases

### 3. **Wrong Foreign Key Name in Documents Query** (400 errors) ✅ FIXED
- Frontend was using `uploaded_by_user:users(email)`
- Correct column name is `uploaded_by` 
- **Impact**: Documents queries failed with 400 errors
- **Status**: ✅ Fixed in frontend code

## Required Fixes

### Fix #1: Apply RLS Policy Consolidation Migration

**File Created**: `supabase/migrations/consolidate_users_rls_policies.sql`

**What it does**:
- Drops all conflicting SELECT policies on users table
- Creates a single, optimized policy that covers all use cases
- Prevents policy recursion and timeouts

**How to apply**:
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste the contents of `supabase/migrations/consolidate_users_rls_policies.sql`
3. Run the migration
4. Verify it completes without errors

### Fix #2: Fix Lease RLS Policies for Tenants

**File Created**: `supabase/migrations/fix_lease_rls_for_tenants.sql`

**What it does**:
- Updates tenant lease SELECT policy to be more permissive
- Allows tenants to view leases in their assigned property
- Supports both single-tenant and multi-tenant scenarios

**How to apply**:
1. Open Supabase Dashboard → SQL Editor  
2. Copy/paste the contents of `supabase/migrations/fix_lease_rls_for_tenants.sql`
3. Run the migration
4. Verify it completes without errors

### Fix #3: Frontend Fixes ✅ ALREADY APPLIED

**Files Changed**:
- `src/hooks/use-documents.ts` - Fixed foreign key syntax for uploader relationship
- `src/components/ui/document-card.tsx` - Updated property reference
- `src/pages/tenant/documents.tsx` - Updated property reference
- `src/hooks/use-maintenance-requests.ts` - Changed partial column selects to full row selects

**Status**: ✅ These changes are already applied in your codebase

## Testing After Fixes

After applying the RLS migration:

1. **Refresh the browser** - Clear any cached queries
2. **Test Landlord Dashboard** - Should load without 500 errors
3. **Test Tenant Dashboard** - Should load lease data
4. **Test Messages** - Both landlord and tenant should see messages
5. **Test Documents** - Should load without 400 errors

## Why These Errors Happened

1. **Multiple migrations** modified the same policies without properly cleaning up
2. **Complex subqueries** in RLS policies can cause performance issues
3. **Foreign key syntax** in Supabase PostgREST requires exact column names

## Next Steps

**PRIORITY 1**: Apply BOTH RLS migrations in Supabase SQL Editor:
  1. `consolidate_users_rls_policies.sql`
  2. `fix_lease_rls_for_tenants.sql`

**PRIORITY 2**: Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

**PRIORITY 3**: Test all pages after migrations

**PRIORITY 4**: If issues persist, check Supabase logs for specific policy violations

## Expected Results After Fixes

- ✅ No more 500 errors on users queries
- ✅ No more 406 errors on leases queries  
- ✅ No more 400 errors on documents queries
- ✅ Dashboard loads all data correctly
- ✅ Messages work bidirectionally
- ✅ Performance improved (no timeouts)

