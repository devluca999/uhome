-- Add lease_id to maintenance_requests table
-- This migration makes maintenance requests lease-scoped

-- Step 1: Add lease_id column (nullable initially for data migration)
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_lease_id ON public.maintenance_requests(lease_id);

-- Step 3: Backfill lease_id from existing property_id + tenant_id pairs
-- This finds the most recent active lease matching the property and tenant
UPDATE public.maintenance_requests mr
SET lease_id = (
  SELECT l.id
  FROM public.leases l
  WHERE l.property_id = mr.property_id
    AND l.tenant_id = mr.tenant_id
    AND (l.lease_end_date IS NULL OR l.lease_end_date > CURRENT_DATE)
  ORDER BY l.lease_start_date DESC
  LIMIT 1
)
WHERE mr.lease_id IS NULL;

-- For records with no active lease, try to find any matching lease
UPDATE public.maintenance_requests mr
SET lease_id = (
  SELECT l.id
  FROM public.leases l
  WHERE l.property_id = mr.property_id
    AND l.tenant_id = mr.tenant_id
  ORDER BY l.lease_start_date DESC
  LIMIT 1
)
WHERE mr.lease_id IS NULL;

-- Step 4: Make property_id and tenant_id nullable for backward compatibility
-- Keep them for now but they're no longer required
ALTER TABLE public.maintenance_requests
ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.maintenance_requests
ALTER COLUMN tenant_id DROP NOT NULL;

-- Step 5: Drop old RLS policies (we'll recreate them below)
DROP POLICY IF EXISTS "Landlords can view requests for own properties" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create requests for own properties" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Landlords can update requests for own properties" ON public.maintenance_requests;

-- Step 6: Create new RLS policies based on lease access
-- Tenants can view requests for their leases
CREATE POLICY "Tenants can view maintenance requests for their leases"
  ON public.maintenance_requests
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE tenant_id IN (
        SELECT id FROM public.tenants
        WHERE user_id = auth.uid()
      )
    )
    OR tenant_id IN (
      SELECT id FROM public.tenants
      WHERE user_id = auth.uid()
    )
  );

-- Landlords can view requests for leases on their properties
CREATE POLICY "Landlords can view maintenance requests for their property leases"
  ON public.maintenance_requests
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE property_id IN (
        SELECT id FROM public.properties
        WHERE owner_id = auth.uid()
          OR organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
          )
      )
    )
    OR property_id IN (
      SELECT id FROM public.properties
      WHERE owner_id = auth.uid()
        OR organization_id IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
        )
    )
  );

-- Tenants can create requests for their active leases
CREATE POLICY "Tenants can create maintenance requests for their active leases"
  ON public.maintenance_requests
  FOR INSERT
  WITH CHECK (
    (
      lease_id IN (
        SELECT id FROM public.leases
        WHERE tenant_id IN (
          SELECT id FROM public.tenants
          WHERE user_id = auth.uid()
        )
        AND (lease_end_date IS NULL OR lease_end_date > CURRENT_DATE)
      )
    )
    OR (
      tenant_id IN (
        SELECT id FROM public.tenants
        WHERE user_id = auth.uid()
      )
    )
  );

-- Landlords can update requests for leases on their properties
CREATE POLICY "Landlords can update maintenance requests for their property leases"
  ON public.maintenance_requests
  FOR UPDATE
  USING (
    (
      lease_id IN (
        SELECT id FROM public.leases
        WHERE property_id IN (
          SELECT id FROM public.properties
          WHERE owner_id = auth.uid()
            OR organization_id IN (
              SELECT organization_id FROM public.memberships
              WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
            )
        )
      )
    )
    OR (
      property_id IN (
        SELECT id FROM public.properties
        WHERE owner_id = auth.uid()
          OR organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
          )
      )
    )
  );

-- Add comment
COMMENT ON COLUMN public.maintenance_requests.lease_id IS 'Lease-scoped maintenance request. Required for new requests. Property/tenant_id kept for backward compatibility during migration.';

