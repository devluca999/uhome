-- Add lease_id to rent_records table
-- This migration makes rent records lease-scoped

-- Step 1: Add lease_id column (nullable initially for data migration)
ALTER TABLE public.rent_records
ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_rent_records_lease_id ON public.rent_records(lease_id);

-- Step 3: Backfill lease_id from existing property_id + tenant_id pairs
-- This finds the most recent active lease matching the property and tenant
UPDATE public.rent_records rr
SET lease_id = (
  SELECT l.id
  FROM public.leases l
  WHERE l.property_id = rr.property_id
    AND l.tenant_id = rr.tenant_id
    AND (l.lease_end_date IS NULL OR l.lease_end_date > CURRENT_DATE)
  ORDER BY l.lease_start_date DESC
  LIMIT 1
)
WHERE rr.lease_id IS NULL;

-- For records with no active lease, try to find any matching lease
UPDATE public.rent_records rr
SET lease_id = (
  SELECT l.id
  FROM public.leases l
  WHERE l.property_id = rr.property_id
    AND l.tenant_id = rr.tenant_id
  ORDER BY l.lease_start_date DESC
  LIMIT 1
)
WHERE rr.lease_id IS NULL;

-- Step 4: Make property_id and tenant_id nullable for backward compatibility
ALTER TABLE public.rent_records
ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.rent_records
ALTER COLUMN tenant_id DROP NOT NULL;

-- Step 5: Drop old RLS policies (we'll recreate them below)
DROP POLICY IF EXISTS "Tenants can view their own rent records" ON public.rent_records;
DROP POLICY IF EXISTS "Landlords can view rent records for their properties" ON public.rent_records;
DROP POLICY IF EXISTS "Landlords can create rent records for their properties" ON public.rent_records;
DROP POLICY IF EXISTS "Landlords can update rent records for their properties" ON public.rent_records;

-- Step 6: Create new RLS policies based on lease access
-- Tenants can view rent records for their leases
CREATE POLICY "Tenants can view rent records for their leases"
  ON public.rent_records
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

-- Landlords can view rent records for leases on their properties
CREATE POLICY "Landlords can view rent records for their property leases"
  ON public.rent_records
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

-- Landlords can create rent records for leases on their properties
CREATE POLICY "Landlords can create rent records for their property leases"
  ON public.rent_records
  FOR INSERT
  WITH CHECK (
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

-- Landlords can update rent records for leases on their properties
CREATE POLICY "Landlords can update rent records for their property leases"
  ON public.rent_records
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
COMMENT ON COLUMN public.rent_records.lease_id IS 'Lease-scoped rent record. Required for new records. Property/tenant_id kept for backward compatibility during migration.';

