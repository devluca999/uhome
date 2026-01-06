-- Add lease_id to documents table
-- This migration makes documents lease-scoped
-- Note: Property-level documents can still exist (lease_id nullable)

-- Step 1: Add lease_id column (nullable - allows both lease-scoped and property-scoped documents)
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_documents_lease_id ON public.documents(lease_id);

-- Step 3: Backfill lease_id from existing property_id where possible
-- Only backfill if we can match a lease for the property
-- Note: Documents uploaded before leases existed may remain property-scoped
UPDATE public.documents d
SET lease_id = (
  SELECT l.id
  FROM public.leases l
  WHERE l.property_id = d.property_id
    AND (l.lease_end_date IS NULL OR l.lease_end_date > CURRENT_DATE)
  ORDER BY l.lease_start_date DESC
  LIMIT 1
)
WHERE d.lease_id IS NULL
  AND d.property_id IS NOT NULL;

-- Step 4: Make property_id nullable (but keep it for property-level documents)
-- Note: We keep property_id NOT NULL for now to maintain backward compatibility
-- Documents can be either lease-scoped (lease_id set) or property-scoped (property_id only)

-- Step 5: Drop old RLS policies (we'll recreate them below)
DROP POLICY IF EXISTS "Landlords and tenants can view documents for their properties" ON public.documents;
DROP POLICY IF EXISTS "Landlords can upload documents to own properties" ON public.documents;
DROP POLICY IF EXISTS "Landlords can delete documents from own properties" ON public.documents;

-- Step 6: Create new RLS policies based on lease access
-- Tenants can view documents for their leases OR their properties
CREATE POLICY "Tenants can view documents for their leases and properties"
  ON public.documents
  FOR SELECT
  USING (
    (
      lease_id IN (
        SELECT id FROM public.leases
        WHERE tenant_id IN (
          SELECT id FROM public.tenants
          WHERE user_id = auth.uid()
        )
      )
    )
    OR (
      property_id IN (
        SELECT property_id FROM public.tenants
        WHERE user_id = auth.uid()
      )
    )
  );

-- Landlords can view documents for leases on their properties OR their properties directly
CREATE POLICY "Landlords can view documents for their property leases and properties"
  ON public.documents
  FOR SELECT
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

-- Landlords can upload documents to leases on their properties OR their properties directly
CREATE POLICY "Landlords can upload documents to their property leases and properties"
  ON public.documents
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

-- Landlords can delete documents from leases on their properties OR their properties directly
CREATE POLICY "Landlords can delete documents from their property leases and properties"
  ON public.documents
  FOR DELETE
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
COMMENT ON COLUMN public.documents.lease_id IS 'Lease-scoped document (optional). Documents can be either lease-scoped (lease_id set) or property-scoped (property_id only, lease_id NULL).';

