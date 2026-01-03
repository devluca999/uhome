-- uhome Database Schema
-- Run this in Supabase SQL Editor
-- IMPORTANT: Run this entire script in one go

-- ============================================================================
-- STEP 1: CREATE ALL TABLES (in dependency order)
-- ============================================================================

-- 1. USERS TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT CHECK (role IN ('landlord', 'tenant')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ORGANIZATIONS TABLE (landlord workspaces)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MEMBERSHIPS TABLE (user-organization relationships with roles)
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'collaborator', 'tenant')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 4. SUBSCRIPTIONS TABLE (organization-level subscriptions)
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

-- 5. PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  rent_amount NUMERIC(10, 2) NOT NULL,
  rent_due_date INTEGER CHECK (rent_due_date >= 1 AND rent_due_date <= 31),
  rules TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. HOUSEHOLDS TABLE (tenant grouping)
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TENANTS TABLE
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  move_in_date DATE NOT NULL,
  lease_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- 8. MAINTENANCE_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) NOT NULL DEFAULT 'pending',
  category TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. RENT_RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.rent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid', 'overdue')) NOT NULL DEFAULT 'pending',
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: CREATE RLS POLICIES (now that all tables exist)
-- ============================================================================

-- USERS POLICIES
CREATE POLICY "Users can read own data" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

-- ORGANIZATIONS POLICIES
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

-- MEMBERSHIPS POLICIES
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

-- SUBSCRIPTIONS POLICIES
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

-- PROPERTIES POLICIES (updated for organizations)
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

-- HOUSEHOLDS POLICIES
CREATE POLICY "Landlords can view households for their properties"
  ON public.households FOR SELECT
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.memberships m ON m.organization_id = p.organization_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'collaborator')
    )
    OR property_id IN (
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
    OR property_id IN (
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
    OR property_id IN (
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
    OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- TENANTS POLICIES (updated for households)
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

-- MAINTENANCE_REQUESTS POLICIES
CREATE POLICY "Landlords can view requests for own properties" 
  ON public.maintenance_requests FOR SELECT 
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    ) OR
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can create requests for own properties" 
  ON public.maintenance_requests FOR INSERT 
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update requests for own properties" 
  ON public.maintenance_requests FOR UPDATE 
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- DOCUMENTS POLICIES
CREATE POLICY "Landlords and tenants can view documents for their properties" 
  ON public.documents FOR SELECT 
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    ) OR
    property_id IN (
      SELECT property_id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can upload documents to own properties" 
  ON public.documents FOR INSERT 
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    ) AND
    uploaded_by = auth.uid()
  );

CREATE POLICY "Landlords can delete documents from own properties" 
  ON public.documents FOR DELETE 
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- RENT_RECORDS POLICIES
CREATE POLICY "Landlords can view rent records for own properties" 
  ON public.rent_records FOR SELECT 
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    ) OR
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can create rent records for own properties" 
  ON public.rent_records FOR INSERT 
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update rent records for own properties" 
  ON public.rent_records FOR UPDATE 
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can update own rent records status" 
  ON public.rent_records FOR UPDATE 
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON public.organizations(created_at);

-- Memberships indexes
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON public.memberships(role);
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON public.memberships(organization_id, user_id);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON public.properties(organization_id) WHERE organization_id IS NOT NULL;

-- Households indexes
CREATE INDEX IF NOT EXISTS idx_households_property_id ON public.households(property_id);

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON public.tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_household_id ON public.tenants(household_id) WHERE household_id IS NOT NULL;

-- Maintenance requests indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_id ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON public.documents(property_id);

-- Rent records indexes
CREATE INDEX IF NOT EXISTS idx_rent_records_property_id ON public.rent_records(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_records_tenant_id ON public.rent_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_records_status ON public.rent_records(status);

-- ============================================================================
-- STEP 5: CREATE TRIGGER FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'tenant') -- Default role, will be updated by signup flow
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rent_records_updated_at
  BEFORE UPDATE ON public.rent_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON public.households
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
