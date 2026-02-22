-- Add status field and draft support to leases table
-- This migration enables draft leases for tenant invites and enforces lease lifecycle

-- Step 1: Add status column
ALTER TABLE public.leases
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'active', 'ended')) NOT NULL DEFAULT 'draft';

-- Step 2: Make tenant_id nullable (draft leases exist before tenant accepts)
ALTER TABLE public.leases
ALTER COLUMN tenant_id DROP NOT NULL;

-- Step 3: Make lease_start_date nullable (drafts don't have start dates yet)
ALTER TABLE public.leases
ALTER COLUMN lease_start_date DROP NOT NULL;

-- Step 4: Make rent_amount nullable (drafts don't require rent amount)
ALTER TABLE public.leases
ALTER COLUMN rent_amount DROP NOT NULL;

-- Step 5: Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);

-- Step 6: Create index on status + tenant_id for tenant queries
CREATE INDEX IF NOT EXISTS idx_leases_status_tenant_id ON public.leases(status, tenant_id) WHERE tenant_id IS NOT NULL;

-- Step 7: Update existing leases to have appropriate status
-- Set status based on lease_end_date
UPDATE public.leases
SET status = CASE
  WHEN lease_end_date IS NOT NULL AND lease_end_date < CURRENT_DATE THEN 'ended'
  WHEN lease_start_date IS NOT NULL AND lease_start_date <= CURRENT_DATE THEN 'active'
  ELSE 'draft'
END
WHERE status = 'draft'; -- Only update if still draft (default)

-- Step 8: Add constraint to prevent invalid status transitions (enforced at application level)
-- Note: Database-level status transition enforcement is handled by triggers

-- Step 9: Update RLS policies to support draft leases without tenant_id
-- Landlords can view draft leases for their properties (even without tenant_id)
DROP POLICY IF EXISTS "Landlords can view leases for their properties" ON public.leases;
CREATE POLICY "Landlords can view leases for their properties"
  ON public.leases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = leases.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Tenants can view leases where they are the tenant_id (draft, active, or ended)
DROP POLICY IF EXISTS "Tenants can view leases for their properties" ON public.leases;
CREATE POLICY "Tenants can view their leases"
  ON public.leases
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants
      WHERE user_id = auth.uid()
    )
  );

-- Step 10: Update insert policy to allow draft leases without tenant_id
DROP POLICY IF EXISTS "Landlords can insert leases for their properties" ON public.leases;
CREATE POLICY "Landlords can insert leases for their properties"
  ON public.leases
  FOR INSERT
  WITH CHECK (
    status = 'draft' AND -- Only allow draft leases to be created without tenant_id
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = leases.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Step 11: Update update policy (immutability will be enforced by trigger)
DROP POLICY IF EXISTS "Landlords can update leases for their properties" ON public.leases;
CREATE POLICY "Landlords can update leases for their properties"
  ON public.leases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = leases.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Step 12: Add comment
COMMENT ON COLUMN public.leases.status IS 'Lease lifecycle status: draft (created via invite), active (tenant joined), ended (immutable, terminal)';
COMMENT ON COLUMN public.leases.tenant_id IS 'Nullable for draft leases. Set when tenant accepts invite.';

