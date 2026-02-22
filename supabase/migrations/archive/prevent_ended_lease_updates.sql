-- Additional RLS policy to prevent UPDATE/DELETE on ended leases
-- This complements the trigger-based immutability enforcement

-- Step 1: Update RLS policies to prevent UPDATE on ended leases
DROP POLICY IF EXISTS "Landlords can update leases for their properties" ON public.leases;
CREATE POLICY "Landlords can update leases for their properties"
  ON public.leases
  FOR UPDATE
  USING (
    status != 'ended' AND -- Prevent updates to ended leases
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = leases.property_id
      AND properties.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    status != 'ended' AND -- Prevent status changes to ended
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = leases.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Step 2: Ensure no DELETE policy exists (ended leases cannot be deleted)
-- This is already handled by not having a DELETE policy, but we document it here

-- Step 3: Update tenant update policy (tenants should not be able to update leases)
-- Tenants can only view their leases, not update them
DROP POLICY IF EXISTS "Tenants can update their leases" ON public.leases;
-- No UPDATE policy for tenants - they can only view

-- Step 4: Add comment
COMMENT ON POLICY "Landlords can update leases for their properties" ON public.leases IS 
  'Allows landlords to update leases, but prevents updates to ended leases. Ended leases are immutable.';

