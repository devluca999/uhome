-- Create RLS policies for organizations, memberships, households, and subscriptions
-- Run this in Supabase SQL Editor

-- ============================================================================
-- ORGANIZATIONS RLS POLICIES
-- ============================================================================

-- Users can view organizations where they have membership
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

-- Only owners can update organizations
CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can delete organizations
CREATE POLICY "Owners can delete their organizations"
  ON public.organizations FOR DELETE
  USING (
    id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Allow system to create organizations (via ensure_landlord_organization function)
-- This is handled by SECURITY DEFINER functions, so no INSERT policy needed

-- ============================================================================
-- MEMBERSHIPS RLS POLICIES
-- ============================================================================

-- Users can view memberships in organizations they belong to
CREATE POLICY "Users can view memberships in their organizations"
  ON public.memberships FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

-- Only owners can create memberships (collaborator/tenant invites)
CREATE POLICY "Owners can create memberships"
  ON public.memberships FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can update memberships (e.g., change roles)
CREATE POLICY "Owners can update memberships"
  ON public.memberships FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can delete memberships (remove users from org)
CREATE POLICY "Owners can delete memberships"
  ON public.memberships FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Users can delete their own membership (leave organization)
-- Note: Owners cannot delete their own membership if they're the only owner
CREATE POLICY "Users can delete their own membership"
  ON public.memberships FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- HOUSEHOLDS RLS POLICIES
-- ============================================================================

-- Landlords can view households for their organization's properties
CREATE POLICY "Landlords can view households for their properties"
  ON public.households FOR SELECT
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
  );

-- Tenants can view households they're linked to
CREATE POLICY "Tenants can view their households"
  ON public.households FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM public.tenants
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    )
  );

-- Landlords can create households for their properties
CREATE POLICY "Landlords can create households"
  ON public.households FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
  );

-- Landlords can update households for their properties
CREATE POLICY "Landlords can update households"
  ON public.households FOR UPDATE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
  );

-- Landlords can delete households for their properties
CREATE POLICY "Landlords can delete households"
  ON public.households FOR DELETE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
  );

-- ============================================================================
-- SUBSCRIPTIONS RLS POLICIES
-- ============================================================================

-- Only owners can view subscriptions (billing access restricted)
CREATE POLICY "Owners can view subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can create subscriptions
CREATE POLICY "Owners can create subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can update subscriptions
CREATE POLICY "Owners can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can delete subscriptions
CREATE POLICY "Owners can delete subscriptions"
  ON public.subscriptions FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

