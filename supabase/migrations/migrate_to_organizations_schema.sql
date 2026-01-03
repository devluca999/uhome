-- Comprehensive migration to organizations/workspaces schema
-- Run this in Supabase SQL Editor
-- IMPORTANT: Run this entire script in one go
-- This migration is idempotent and safe to run multiple times

-- ============================================================================
-- STEP 1: CREATE NEW TABLES
-- ============================================================================

-- 1.1 Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 Memberships table
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'collaborator', 'tenant')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 1.3 Households table
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.4 Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan TEXT CHECK (plan IN ('free', 'pro')) NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired')) DEFAULT 'active',
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- ============================================================================
-- STEP 2: ADD NEW COLUMNS TO EXISTING TABLES
-- ============================================================================

-- 2.1 Add organization_id to properties (nullable for migration)
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2.2 Add household_id to tenants (nullable for migration)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON public.organizations(created_at);

-- Memberships indexes
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON public.memberships(role);
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON public.memberships(organization_id, user_id);

-- Households indexes
CREATE INDEX IF NOT EXISTS idx_households_property_id ON public.households(property_id);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Properties indexes (for organization_id)
CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON public.properties(organization_id) WHERE organization_id IS NOT NULL;

-- Tenants indexes (for household_id)
CREATE INDEX IF NOT EXISTS idx_tenants_household_id ON public.tenants(household_id) WHERE household_id IS NOT NULL;

-- ============================================================================
-- STEP 5: CREATE TRIGGERS
-- ============================================================================

-- Updated_at triggers for new tables
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function: Get organization by owner user_id
CREATE OR REPLACE FUNCTION public.get_organization_by_owner(owner_user_id UUID)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.memberships
  WHERE user_id = owner_user_id
    AND role = 'owner'
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Ensure landlord has organization (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_landlord_organization(owner_user_id UUID, org_name TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  existing_org_id UUID;
  new_org_id UUID;
  final_org_name TEXT;
BEGIN
  -- Check if organization already exists
  SELECT get_organization_by_owner(owner_user_id) INTO existing_org_id;
  
  IF existing_org_id IS NOT NULL THEN
    RETURN existing_org_id;
  END IF;
  
  -- Set default name if not provided
  IF org_name IS NULL OR org_name = '' THEN
    final_org_name := 'My Properties';
  ELSE
    final_org_name := org_name;
  END IF;
  
  -- Create organization
  INSERT INTO public.organizations (name)
  VALUES (final_org_name)
  RETURNING id INTO new_org_id;
  
  -- Create owner membership
  INSERT INTO public.memberships (organization_id, user_id, role)
  VALUES (new_org_id, owner_user_id, 'owner');
  
  -- Create default free subscription
  INSERT INTO public.subscriptions (organization_id, plan, status)
  VALUES (new_org_id, 'free', 'active');
  
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get all organizations for a user
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_id_param UUID, role_filter TEXT DEFAULT NULL)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.organization_id,
    o.name,
    m.role,
    m.created_at
  FROM public.memberships m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.user_id = user_id_param
    AND (role_filter IS NULL OR m.role = role_filter)
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Count landlord-side users in organization
CREATE OR REPLACE FUNCTION public.get_organization_landlord_count(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
  landlord_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO landlord_count
  FROM public.memberships
  WHERE organization_id = org_id
    AND role IN ('owner', 'collaborator');
  
  RETURN landlord_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if organization can add collaborator
CREATE OR REPLACE FUNCTION public.can_add_collaborator(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_plan TEXT;
  landlord_count INTEGER;
BEGIN
  -- Check subscription plan
  SELECT plan INTO sub_plan
  FROM public.subscriptions
  WHERE organization_id = org_id
    AND status = 'active';
  
  -- Must be Pro plan
  IF sub_plan != 'pro' THEN
    RETURN FALSE;
  END IF;
  
  -- Check current landlord count
  SELECT get_organization_landlord_count(org_id) INTO landlord_count;
  
  -- Hard cap: 2 landlord-side users (owner + 1 collaborator)
  RETURN landlord_count < 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their organizations"
  ON public.organizations FOR DELETE
  USING (
    id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Memberships policies
CREATE POLICY "Users can view memberships in their organizations"
  ON public.memberships FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create memberships"
  ON public.memberships FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update memberships"
  ON public.memberships FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete memberships"
  ON public.memberships FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Users can delete their own membership"
  ON public.memberships FOR DELETE
  USING (user_id = auth.uid());

-- Households policies
CREATE POLICY "Landlords can view households for their properties"
  ON public.households FOR SELECT
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view their households"
  ON public.households FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM public.tenants
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    )
  );

CREATE POLICY "Landlords can create households"
  ON public.households FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update households"
  ON public.households FOR UPDATE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can delete households"
  ON public.households FOR DELETE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Subscriptions policies
CREATE POLICY "Owners can view subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can create subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete subscriptions"
  ON public.subscriptions FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================================
-- STEP 8: UPDATE EXISTING RLS POLICIES
-- ============================================================================

-- Drop and recreate properties policies with organization support
DROP POLICY IF EXISTS "Landlords can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Landlords can create own properties" ON public.properties;
DROP POLICY IF EXISTS "Landlords can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Landlords can delete own properties" ON public.properties;

CREATE POLICY "Landlords can view properties in their organizations"
  ON public.properties FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'collaborator')
    )
    OR owner_id = auth.uid()
    OR id IN (
      SELECT h.property_id FROM public.households h
      JOIN public.tenants t ON t.household_id = h.id
      WHERE t.user_id = auth.uid()
    )
    OR id IN (
      SELECT property_id FROM public.tenants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can create properties in their organizations"
  ON public.properties FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'collaborator')
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY "Landlords can update properties in their organizations"
  ON public.properties FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'collaborator')
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY "Landlords can delete properties in their organizations"
  ON public.properties FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'collaborator')
    )
    OR owner_id = auth.uid()
  );

-- Drop and recreate tenants policies with household support
DROP POLICY IF EXISTS "Landlords can view tenants in own properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can create tenants in own properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can update tenants in own properties" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can delete tenants in own properties" ON public.tenants;

CREATE POLICY "Landlords can view tenants in their properties"
  ON public.tenants FOR SELECT
  USING (
    household_id IN (
      SELECT h.id FROM public.households h
      JOIN public.properties p ON p.id = h.property_id
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Landlords can create tenants in their properties"
  ON public.tenants FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT h.id FROM public.households h
      JOIN public.properties p ON p.id = h.property_id
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update tenants in their properties"
  ON public.tenants FOR UPDATE
  USING (
    household_id IN (
      SELECT h.id FROM public.households h
      JOIN public.properties p ON p.id = h.property_id
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can delete tenants in their properties"
  ON public.tenants FOR DELETE
  USING (
    household_id IN (
      SELECT h.id FROM public.households h
      JOIN public.properties p ON p.id = h.property_id
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 9: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.organizations IS 'Landlord workspaces. Each organization represents a landlord account/workspace that owns properties and subscriptions. Organizations are auto-created on first landlord access.';
COMMENT ON TABLE public.memberships IS 'User-organization relationships with roles. Roles: owner (full access), collaborator (Pro plan only, limited access), tenant (read-only access to linked properties).';
COMMENT ON TABLE public.households IS 'Tenant grouping. Multiple tenant users can belong to one household (e.g., spouses, roommates). Households are linked to properties. Tenant accounts persist even after move-out (household unlinked from property).';
COMMENT ON TABLE public.subscriptions IS 'Organization-level subscriptions. Each organization has one subscription. Pro plan enables collaborator invites (hard cap of 2 landlord-side users: owner + 1 collaborator).';
COMMENT ON COLUMN public.properties.organization_id IS 'Organization that owns this property. Properties belong to organizations, not individual users. Migrated from owner_id during lazy migration.';
COMMENT ON COLUMN public.tenants.household_id IS 'Household this tenant belongs to. Multiple tenant users can belong to one household. Migrated from direct property link during lazy migration.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- Next steps (application-level, not in this migration):
-- 1. Call ensure_landlord_organization() on first landlord login/access
-- 2. Migrate properties to organizations as they're accessed
-- 3. Create households for tenants as they're accessed
-- 4. All migration is lazy and transparent to users
--

