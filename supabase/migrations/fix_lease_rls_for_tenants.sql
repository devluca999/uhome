-- Fix lease RLS policies to ensure tenants can access their leases
-- This resolves 406 errors when tenants try to view their leases

-- Step 1: Drop existing tenant lease SELECT policy
DROP POLICY IF EXISTS "Tenants can view their leases" ON public.leases;

-- Step 2: Create a more permissive tenant lease SELECT policy
-- Tenants can view leases where they are the tenant (via tenant_id)
CREATE POLICY "Tenants can view their leases"
ON public.leases
FOR SELECT
USING (
  -- Check if current user has a tenant record whose ID matches this lease's tenant_id
  tenant_id IN (
    SELECT id 
    FROM public.tenants 
    WHERE user_id = auth.uid()
  )
  OR
  -- Also allow if the lease is in the tenant's property (for multi-tenant households)
  property_id IN (
    SELECT property_id
    FROM public.tenants
    WHERE user_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON POLICY "Tenants can view their leases" ON public.leases IS 
'Allows tenants to view leases where they are listed as the tenant, or leases in their assigned property. This supports both single-tenant and multi-tenant scenarios.';

