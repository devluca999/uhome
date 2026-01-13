-- Abuse Guard Triggers
-- Database-level enforcement for ownership rules and relationship integrity
-- Run this in Supabase SQL Editor

-- ============================================================================
-- FUNCTION: Validate Property Ownership
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_property_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user owns the property they're trying to modify
  -- This is a backup check - RLS should already enforce this
  -- But this provides an additional layer of security
  
  IF NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = NEW.property_id
      AND (
        owner_id = auth.uid()
        OR organization_id IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
        )
      )
  ) THEN
    RAISE EXCEPTION 'You do not have permission to modify this property';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Validate Tenant Assignment
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_tenant_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure tenant is being assigned to a property the user owns
  IF NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = NEW.property_id
      AND (
        owner_id = auth.uid()
        OR organization_id IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
        )
      )
  ) THEN
    RAISE EXCEPTION 'You do not have permission to assign tenants to this property';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Validate Work Order Ownership
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_work_order_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure work order is for a property the user owns (if created by landlord)
  -- Or ensure tenant can only create work orders for their own property
  IF NEW.created_by_role = 'landlord' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = NEW.property_id
        AND (
          owner_id = auth.uid()
          OR organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
          )
        )
    ) THEN
      RAISE EXCEPTION 'You do not have permission to create work orders for this property';
    END IF;
  ELSIF NEW.created_by_role = 'tenant' THEN
    -- Tenant can only create work orders for properties they're assigned to
    IF NOT EXISTS (
      SELECT 1 FROM public.tenants
      WHERE user_id = auth.uid()
        AND property_id = NEW.property_id
    ) THEN
      RAISE EXCEPTION 'You can only create work orders for properties you are assigned to';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Validate Message Access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_message_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user has access to the lease they're messaging about
  IF NOT EXISTS (
    SELECT 1 FROM public.leases l
    WHERE l.id = NEW.lease_id
      AND (
        -- Landlord owns the property
        l.property_id IN (
          SELECT id FROM public.properties WHERE owner_id = auth.uid()
        )
        OR
        -- Tenant is assigned to the lease
        l.tenant_id IN (
          SELECT id FROM public.tenants WHERE user_id = auth.uid()
        )
      )
  ) THEN
    RAISE EXCEPTION 'You do not have access to this lease';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Note: These triggers are backup enforcement
-- RLS policies are the primary security layer
-- These triggers provide additional validation for edge cases

-- Trigger for property modifications (if needed)
-- Most property modifications are already protected by RLS

-- Trigger for tenant assignments
DROP TRIGGER IF EXISTS validate_tenant_assignment_trigger ON public.tenants;
CREATE TRIGGER validate_tenant_assignment_trigger
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_assignment();

-- Trigger for work order creation
DROP TRIGGER IF EXISTS validate_work_order_ownership_trigger ON public.maintenance_requests;
CREATE TRIGGER validate_work_order_ownership_trigger
  BEFORE INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_work_order_ownership();

-- Trigger for message creation
DROP TRIGGER IF EXISTS validate_message_access_trigger ON public.messages;
CREATE TRIGGER validate_message_access_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_message_access();

-- Add comments
COMMENT ON FUNCTION public.validate_property_ownership() IS 'Validates property ownership before modifications. Backup to RLS.';
COMMENT ON FUNCTION public.validate_tenant_assignment() IS 'Validates tenant assignment permissions. Backup to RLS.';
COMMENT ON FUNCTION public.validate_work_order_ownership() IS 'Validates work order creation permissions. Backup to RLS.';
COMMENT ON FUNCTION public.validate_message_access() IS 'Validates message access permissions. Backup to RLS.';

