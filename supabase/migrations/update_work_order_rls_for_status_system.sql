-- Update RLS policies for work order status system
-- Enforces property-scoped visibility and role-based permissions

-- Drop existing policies
DROP POLICY IF EXISTS "Landlords can view maintenance requests for their properties" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can view maintenance requests for their properties" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Landlords can create maintenance requests for their properties" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Landlords can update maintenance requests for their properties" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can update their own maintenance requests" ON public.maintenance_requests;

-- Landlords can view all maintenance requests for their properties
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

-- Tenants can view work orders where:
-- 1. property_id matches their property AND
-- 2. visibility_to_tenants = true
CREATE POLICY "Tenants can view visible maintenance requests for their properties"
  ON public.maintenance_requests FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM public.tenants WHERE user_id = auth.uid()
    )
    AND visibility_to_tenants = true
  );

-- Landlords can create maintenance requests for their properties
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

-- Tenants can create maintenance requests for their property
CREATE POLICY "Tenants can create maintenance requests for their property"
  ON public.maintenance_requests FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT property_id FROM public.tenants WHERE user_id = auth.uid()
    )
    AND (
      tenant_id IS NULL
      OR tenant_id IN (
        SELECT id FROM public.tenants WHERE user_id = auth.uid()
      )
    )
    AND created_by_role = 'tenant'
    AND status = 'submitted'
  );

-- Landlords can update any field for their properties' work orders
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

-- Tenants can only update status from 'resolved' to 'closed' (confirmation)
-- This is enforced at the application level, but we add a policy for safety
CREATE POLICY "Tenants can confirm resolution"
  ON public.maintenance_requests FOR UPDATE
  USING (
    property_id IN (
      SELECT property_id FROM public.tenants WHERE user_id = auth.uid()
    )
    AND status = 'resolved'
  )
  WITH CHECK (
    status = 'closed'
  );

