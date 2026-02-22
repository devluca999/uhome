-- Fix infinite recursion in RLS policies
-- The issue: memberships policies were checking memberships table, creating circular dependencies
-- Solution: Use direct user_id checks and avoid nested membership queries

-- ============================================================================
-- CREATE HELPER FUNCTION TO CHECK MEMBERSHIP (BYPASSES RLS)
-- ============================================================================

-- Drop any existing functions with conflicting signatures (CASCADE removes all variants)
DROP FUNCTION IF EXISTS public.user_has_membership_in_org CASCADE;
DROP FUNCTION IF EXISTS public.user_is_owner_of_org CASCADE;
DROP FUNCTION IF EXISTS public.user_is_landlord_in_org CASCADE;
DROP FUNCTION IF EXISTS public.get_property_organization_id CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_property CASCADE;
DROP FUNCTION IF EXISTS public.user_is_tenant_in_household CASCADE;

-- Create a SECURITY DEFINER function to check if user has membership in an org
-- This bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.user_has_membership_in_org(p_organization_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = p_organization_id
      AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a SECURITY DEFINER function to check if user is owner of an org
CREATE OR REPLACE FUNCTION public.user_is_owner_of_org(p_organization_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = p_organization_id
      AND user_id = p_user_id
      AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a SECURITY DEFINER function to check if user is owner or collaborator
CREATE OR REPLACE FUNCTION public.user_is_landlord_in_org(p_organization_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = p_organization_id
      AND user_id = p_user_id
      AND role IN ('owner', 'collaborator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get property organization_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_property_organization_id(p_property_id UUID)
RETURNS UUID AS $$
DECLARE
  v_organization_id UUID;
BEGIN
  SELECT organization_id INTO v_organization_id
  FROM public.properties
  WHERE id = p_property_id;
  RETURN v_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access a property (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_can_access_property(p_property_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_organization_id UUID;
  v_owner_id UUID;
BEGIN
  -- Get property details (bypasses RLS due to SECURITY DEFINER)
  SELECT organization_id, owner_id INTO v_organization_id, v_owner_id
  FROM public.properties
  WHERE id = p_property_id;
  
  -- Check organization-based access
  IF v_organization_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.memberships
      WHERE organization_id = v_organization_id
        AND user_id = p_user_id
        AND role IN ('owner', 'collaborator')
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Check owner_id access (backward compatibility)
  IF v_owner_id = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if tenant belongs to household (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_tenant_in_household(p_household_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenants
    WHERE household_id = p_household_id
      AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX MEMBERSHIPS RLS POLICIES
-- ============================================================================

-- Drop existing recursive policies
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON public.memberships;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.memberships;
DROP POLICY IF EXISTS "Users can view memberships in same organization" ON public.memberships;
DROP POLICY IF EXISTS "Owners can create memberships" ON public.memberships;
DROP POLICY IF EXISTS "Owners can update memberships" ON public.memberships;
DROP POLICY IF EXISTS "Owners can delete memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can delete their own membership" ON public.memberships;

-- Users can view their own membership directly (no recursion)
CREATE POLICY "Users can view their own membership"
  ON public.memberships FOR SELECT
  USING (user_id = auth.uid());

-- Users can view other memberships in organizations where they have a membership
-- Use helper function to avoid recursion
CREATE POLICY "Users can view memberships in same organization"
  ON public.memberships FOR SELECT
  USING (public.user_has_membership_in_org(organization_id));

-- Owners can create memberships in their organizations
-- Use helper function to avoid recursion
CREATE POLICY "Owners can create memberships"
  ON public.memberships FOR INSERT
  WITH CHECK (public.user_is_owner_of_org(organization_id));

-- Owners can update memberships in their organizations
CREATE POLICY "Owners can update memberships"
  ON public.memberships FOR UPDATE
  USING (public.user_is_owner_of_org(organization_id));

-- Owners can delete memberships in their organizations
CREATE POLICY "Owners can delete memberships"
  ON public.memberships FOR DELETE
  USING (public.user_is_owner_of_org(organization_id));

-- Users can delete their own membership (leave organization)
CREATE POLICY "Users can delete their own membership"
  ON public.memberships FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- FIX ORGANIZATIONS RLS POLICIES (to avoid recursion)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;

-- Users can view organizations where they have a membership
-- Use helper function to avoid recursion
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (public.user_has_membership_in_org(id));

-- Owners can update their organizations
CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING (public.user_is_owner_of_org(id));

-- Owners can delete their organizations
CREATE POLICY "Owners can delete their organizations"
  ON public.organizations FOR DELETE
  USING (public.user_is_owner_of_org(id));

-- ============================================================================
-- FIX SUBSCRIPTIONS RLS POLICIES (to avoid recursion)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can view subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Owners can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Owners can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Owners can delete subscriptions" ON public.subscriptions;

-- Owners can view subscriptions for their organizations
CREATE POLICY "Owners can view subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.user_is_owner_of_org(organization_id));

-- Owners can create subscriptions for their organizations
CREATE POLICY "Owners can create subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (public.user_is_owner_of_org(organization_id));

-- Owners can update subscriptions for their organizations
CREATE POLICY "Owners can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (public.user_is_owner_of_org(organization_id));

-- Owners can delete subscriptions for their organizations
CREATE POLICY "Owners can delete subscriptions"
  ON public.subscriptions FOR DELETE
  USING (public.user_is_owner_of_org(organization_id));

-- ============================================================================
-- FIX PROPERTIES RLS POLICIES (to avoid recursion via memberships)
-- ============================================================================

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Landlords can view properties in their organizations" ON public.properties;
DROP POLICY IF EXISTS "Landlords can create properties in their organizations" ON public.properties;
DROP POLICY IF EXISTS "Landlords can update properties in their organizations" ON public.properties;
DROP POLICY IF EXISTS "Landlords can delete properties in their organizations" ON public.properties;

-- Landlords can view properties in their organizations
-- Use helper function to avoid recursion
CREATE POLICY "Landlords can view properties in their organizations"
  ON public.properties FOR SELECT
  USING (
    -- Organization-based access (new)
    public.user_is_landlord_in_org(organization_id)
    OR
    -- Backward compatibility: owner_id access (during migration)
    owner_id = auth.uid()
    OR
    -- Tenant access (via household -> property)
    id IN (
      SELECT h.property_id FROM public.households h
      JOIN public.tenants t ON t.household_id = h.id
      WHERE t.user_id = auth.uid()
    )
    OR
    -- Legacy tenant access (via direct property link during migration)
    id IN (
      SELECT property_id FROM public.tenants
      WHERE user_id = auth.uid()
    )
  );

-- Landlords can create properties in their organizations
CREATE POLICY "Landlords can create properties in their organizations"
  ON public.properties FOR INSERT
  WITH CHECK (
    -- Organization-based access (new)
    public.user_is_landlord_in_org(organization_id)
    OR
    -- Backward compatibility: owner_id access (during migration)
    owner_id = auth.uid()
  );

-- Landlords can update properties in their organizations
CREATE POLICY "Landlords can update properties in their organizations"
  ON public.properties FOR UPDATE
  USING (
    -- Organization-based access (new)
    public.user_is_landlord_in_org(organization_id)
    OR
    -- Backward compatibility: owner_id access (during migration)
    owner_id = auth.uid()
  );

-- Landlords can delete properties in their organizations
CREATE POLICY "Landlords can delete properties in their organizations"
  ON public.properties FOR DELETE
  USING (
    -- Organization-based access (new)
    public.user_is_landlord_in_org(organization_id)
    OR
    -- Backward compatibility: owner_id access (during migration)
    owner_id = auth.uid()
  );

-- ============================================================================
-- FIX TENANTS RLS POLICIES (to avoid recursion via memberships)
-- ============================================================================

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Landlords can view tenants in their properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can create tenants in their properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can update tenants in their properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can delete tenants in their properties" ON public.tenants;

-- Landlords can view tenants in their organization's properties
-- Use helper function to avoid recursion
CREATE POLICY "Landlords can view tenants in their properties"
  ON public.tenants FOR SELECT
  USING (
    -- Organization-based access via household -> property (using helper to bypass RLS)
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = tenants.household_id
        AND public.user_can_access_property(h.property_id::UUID)
    ))
    OR
    -- Backward compatibility: direct property link
    (property_id IS NOT NULL AND public.user_can_access_property(property_id::UUID))
    OR
    -- Tenant can view their own tenant record
    user_id = auth.uid()
  );

-- Landlords can create tenants in their organization's properties
CREATE POLICY "Landlords can create tenants in their properties"
  ON public.tenants FOR INSERT
  WITH CHECK (
    -- Organization-based access via household -> property
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = tenants.household_id
        AND public.user_can_access_property(h.property_id)
    ))
    OR
    -- Backward compatibility: direct property link
    (property_id IS NOT NULL AND public.user_can_access_property(property_id))
  );

-- Landlords can update tenants in their organization's properties
CREATE POLICY "Landlords can update tenants in their properties"
  ON public.tenants FOR UPDATE
  USING (
    -- Organization-based access via household -> property
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = tenants.household_id
        AND public.user_can_access_property(h.property_id)
    ))
    OR
    -- Backward compatibility: direct property link
    (property_id IS NOT NULL AND public.user_can_access_property(property_id))
  );

-- Landlords can delete tenants in their organization's properties
CREATE POLICY "Landlords can delete tenants in their properties"
  ON public.tenants FOR DELETE
  USING (
    -- Organization-based access via household -> property
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = tenants.household_id
        AND public.user_can_access_property(h.property_id)
    ))
    OR
    -- Backward compatibility: direct property link
    (property_id IS NOT NULL AND public.user_can_access_property(property_id))
  );

-- ============================================================================
-- FIX HOUSEHOLDS RLS POLICIES (to avoid recursion via memberships)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Landlords can view households for their properties" ON public.households;
DROP POLICY IF EXISTS "Tenants can view their households" ON public.households;
DROP POLICY IF EXISTS "Landlords can create households" ON public.households;
DROP POLICY IF EXISTS "Landlords can update households" ON public.households;
DROP POLICY IF EXISTS "Landlords can delete households" ON public.households;

-- Landlords can view households for their organization's properties
CREATE POLICY "Landlords can view households for their properties"
  ON public.households FOR SELECT
  USING (public.user_can_access_property(property_id::UUID));

-- Tenants can view households they're linked to
-- Use helper function to avoid querying tenants table (breaks circular dependency)
CREATE POLICY "Tenants can view their households"
  ON public.households FOR SELECT
  USING (public.user_is_tenant_in_household(id::UUID));

-- Landlords can create households for their properties
CREATE POLICY "Landlords can create households"
  ON public.households FOR INSERT
  WITH CHECK (public.user_can_access_property(property_id::UUID));

-- Landlords can update households for their properties
CREATE POLICY "Landlords can update households"
  ON public.households FOR UPDATE
  USING (public.user_can_access_property(property_id::UUID));

-- Landlords can delete households for their properties
CREATE POLICY "Landlords can delete households"
  ON public.households FOR DELETE
  USING (public.user_can_access_property(property_id::UUID));

