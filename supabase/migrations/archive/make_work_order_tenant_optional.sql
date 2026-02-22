-- Make tenant_id nullable in maintenance_requests to allow landlord-created work orders
-- Add created_by field to track who created the work order

-- Make tenant_id nullable
ALTER TABLE public.maintenance_requests
  ALTER COLUMN tenant_id DROP NOT NULL;

-- Add created_by field if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'maintenance_requests'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.maintenance_requests
      ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE CASCADE;
    
    -- Set created_by to tenant_id's user_id for existing records
    UPDATE public.maintenance_requests mr
    SET created_by = (
      SELECT user_id FROM public.tenants WHERE id = mr.tenant_id
    )
    WHERE tenant_id IS NOT NULL;
  END IF;
END $$;

-- Update RLS policies to allow landlord-created work orders
-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Landlords can view maintenance requests for their properties" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can view their own maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Landlords can create maintenance requests for their properties" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Landlords can update maintenance requests for their properties" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can update their own maintenance requests" ON public.maintenance_requests;

-- Landlords can view all maintenance requests for their properties (with or without tenant)
CREATE POLICY "Landlords can view maintenance requests for their properties"
  ON public.maintenance_requests FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties
      WHERE owner_id = auth.uid()
        OR organization_id IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
        )
    )
  );

-- Tenants can view maintenance requests where they are the tenant OR for their property
CREATE POLICY "Tenants can view maintenance requests for their properties"
  ON public.maintenance_requests FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
    OR
    property_id IN (
      SELECT property_id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

-- Landlords can create maintenance requests for their properties (tenant optional)
CREATE POLICY "Landlords can create maintenance requests for their properties"
  ON public.maintenance_requests FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties
      WHERE owner_id = auth.uid()
        OR organization_id IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
        )
    )
    AND (
      tenant_id IS NULL
      OR tenant_id IN (
        SELECT id FROM public.tenants
        WHERE property_id = maintenance_requests.property_id
      )
    )
  );

-- Landlords can update maintenance requests for their properties
CREATE POLICY "Landlords can update maintenance requests for their properties"
  ON public.maintenance_requests FOR UPDATE
  USING (
    property_id IN (
      SELECT id FROM public.properties
      WHERE owner_id = auth.uid()
        OR organization_id IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
        )
    )
  );

-- Tenants can update their own maintenance requests
CREATE POLICY "Tenants can update their own maintenance requests"
  ON public.maintenance_requests FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

