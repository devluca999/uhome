-- Consolidated migration: RLS recursion fixes, abuse validation triggers, tenants.property_id nullable
-- Drops permissive allow_all policies from initial_schema, applies proper RLS

-- Drop permissive allow_all policies only for tables we replace with proper RLS
-- (units, leases, tenant_invites, maintenance_requests, rent_records, expenses, messages, notifications, documents remain permissive for local dev)
DROP POLICY IF EXISTS "allow_all_users" ON public.users;
DROP POLICY IF EXISTS "allow_all_organizations" ON public.organizations;
DROP POLICY IF EXISTS "allow_all_memberships" ON public.memberships;
DROP POLICY IF EXISTS "allow_all_properties" ON public.properties;
DROP POLICY IF EXISTS "allow_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "allow_all_households" ON public.households;
DROP POLICY IF EXISTS "allow_all_subscriptions" ON public.subscriptions;

-- Fix RLS recursion: SECURITY DEFINER helper functions
DROP FUNCTION IF EXISTS public.user_has_membership_in_org CASCADE;
DROP FUNCTION IF EXISTS public.user_is_owner_of_org CASCADE;
DROP FUNCTION IF EXISTS public.user_is_landlord_in_org CASCADE;
DROP FUNCTION IF EXISTS public.get_property_organization_id CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_property CASCADE;
DROP FUNCTION IF EXISTS public.user_is_tenant_in_household CASCADE;

CREATE OR REPLACE FUNCTION public.user_has_membership_in_org(p_organization_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_organization_id AND user_id = p_user_id); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_is_owner_of_org(p_organization_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_organization_id AND user_id = p_user_id AND role = 'owner'); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_is_landlord_in_org(p_organization_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_organization_id AND user_id = p_user_id AND role IN ('owner', 'collaborator')); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_property_organization_id(p_property_id UUID)
RETURNS UUID AS $$ DECLARE v_organization_id UUID; BEGIN SELECT organization_id INTO v_organization_id FROM public.properties WHERE id = p_property_id; RETURN v_organization_id; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_can_access_property(p_property_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE v_organization_id UUID; v_owner_id UUID;
BEGIN
  SELECT organization_id, owner_id INTO v_organization_id, v_owner_id FROM public.properties WHERE id = p_property_id;
  IF v_organization_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = v_organization_id AND user_id = p_user_id AND role IN ('owner', 'collaborator')) THEN RETURN TRUE; END IF;
  IF v_owner_id = p_user_id THEN RETURN TRUE; END IF;
  RETURN FALSE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_is_tenant_in_household(p_household_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.tenants WHERE household_id = p_household_id AND user_id = p_user_id); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Memberships RLS
DROP POLICY IF EXISTS "Users can view their own membership" ON public.memberships;
CREATE POLICY "Users can view their own membership" ON public.memberships FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can view memberships in same organization" ON public.memberships;
CREATE POLICY "Users can view memberships in same organization" ON public.memberships FOR SELECT USING (public.user_has_membership_in_org(organization_id));
DROP POLICY IF EXISTS "Owners can create memberships" ON public.memberships;
CREATE POLICY "Owners can create memberships" ON public.memberships FOR INSERT WITH CHECK (public.user_is_owner_of_org(organization_id));
DROP POLICY IF EXISTS "Owners can update memberships" ON public.memberships;
CREATE POLICY "Owners can update memberships" ON public.memberships FOR UPDATE USING (public.user_is_owner_of_org(organization_id));
DROP POLICY IF EXISTS "Owners can delete memberships" ON public.memberships;
CREATE POLICY "Owners can delete memberships" ON public.memberships FOR DELETE USING (public.user_is_owner_of_org(organization_id));
DROP POLICY IF EXISTS "Users can delete their own membership" ON public.memberships;
CREATE POLICY "Users can delete their own membership" ON public.memberships FOR DELETE USING (user_id = auth.uid());

-- Organizations RLS
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
CREATE POLICY "Users can view organizations they belong to" ON public.organizations FOR SELECT USING (public.user_has_membership_in_org(id));
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
CREATE POLICY "Owners can update their organizations" ON public.organizations FOR UPDATE USING (public.user_is_owner_of_org(id));
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;
CREATE POLICY "Owners can delete their organizations" ON public.organizations FOR DELETE USING (public.user_is_owner_of_org(id));

-- Subscriptions RLS
DROP POLICY IF EXISTS "Owners can view subscriptions" ON public.subscriptions;
CREATE POLICY "Owners can view subscriptions" ON public.subscriptions FOR SELECT USING (public.user_is_owner_of_org(organization_id));
DROP POLICY IF EXISTS "Owners can create subscriptions" ON public.subscriptions;
CREATE POLICY "Owners can create subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (public.user_is_owner_of_org(organization_id));
DROP POLICY IF EXISTS "Owners can update subscriptions" ON public.subscriptions;
CREATE POLICY "Owners can update subscriptions" ON public.subscriptions FOR UPDATE USING (public.user_is_owner_of_org(organization_id));
DROP POLICY IF EXISTS "Owners can delete subscriptions" ON public.subscriptions;
CREATE POLICY "Owners can delete subscriptions" ON public.subscriptions FOR DELETE USING (public.user_is_owner_of_org(organization_id));

-- Properties RLS
DROP POLICY IF EXISTS "Landlords can view properties in their organizations" ON public.properties;
CREATE POLICY "Landlords can view properties in their organizations" ON public.properties FOR SELECT USING (
  public.user_is_landlord_in_org(organization_id) OR owner_id = auth.uid() OR
  id IN (SELECT h.property_id FROM public.households h JOIN public.tenants t ON t.household_id = h.id WHERE t.user_id = auth.uid()) OR
  id IN (SELECT property_id FROM public.tenants WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "Landlords can create properties in their organizations" ON public.properties;
CREATE POLICY "Landlords can create properties in their organizations" ON public.properties FOR INSERT WITH CHECK (public.user_is_landlord_in_org(organization_id) OR owner_id = auth.uid());
DROP POLICY IF EXISTS "Landlords can update properties in their organizations" ON public.properties;
CREATE POLICY "Landlords can update properties in their organizations" ON public.properties FOR UPDATE USING (public.user_is_landlord_in_org(organization_id) OR owner_id = auth.uid());
DROP POLICY IF EXISTS "Landlords can delete properties in their organizations" ON public.properties;
CREATE POLICY "Landlords can delete properties in their organizations" ON public.properties FOR DELETE USING (public.user_is_landlord_in_org(organization_id) OR owner_id = auth.uid());

-- Tenants RLS
DROP POLICY IF EXISTS "Landlords can view tenants in their properties" ON public.tenants;
CREATE POLICY "Landlords can view tenants in their properties" ON public.tenants FOR SELECT USING (
  (household_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.households h WHERE h.id = tenants.household_id AND public.user_can_access_property(h.property_id::UUID))) OR
  (property_id IS NOT NULL AND public.user_can_access_property(property_id::UUID)) OR user_id = auth.uid()
);
DROP POLICY IF EXISTS "Landlords can create tenants in their properties" ON public.tenants;
CREATE POLICY "Landlords can create tenants in their properties" ON public.tenants FOR INSERT WITH CHECK (
  (household_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.households h WHERE h.id = tenants.household_id AND public.user_can_access_property(h.property_id))) OR
  (property_id IS NOT NULL AND public.user_can_access_property(property_id))
);
DROP POLICY IF EXISTS "Landlords can update tenants in their properties" ON public.tenants;
CREATE POLICY "Landlords can update tenants in their properties" ON public.tenants FOR UPDATE USING (
  (household_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.households h WHERE h.id = tenants.household_id AND public.user_can_access_property(h.property_id))) OR
  (property_id IS NOT NULL AND public.user_can_access_property(property_id))
);
DROP POLICY IF EXISTS "Landlords can delete tenants in their properties" ON public.tenants;
CREATE POLICY "Landlords can delete tenants in their properties" ON public.tenants FOR DELETE USING (
  (household_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.households h WHERE h.id = tenants.household_id AND public.user_can_access_property(h.property_id))) OR
  (property_id IS NOT NULL AND public.user_can_access_property(property_id))
);

-- Households RLS
DROP POLICY IF EXISTS "Landlords can view households for their properties" ON public.households;
CREATE POLICY "Landlords can view households for their properties" ON public.households FOR SELECT USING (public.user_can_access_property(property_id::UUID));
DROP POLICY IF EXISTS "Tenants can view their households" ON public.households;
CREATE POLICY "Tenants can view their households" ON public.households FOR SELECT USING (public.user_is_tenant_in_household(id::UUID));
DROP POLICY IF EXISTS "Landlords can create households" ON public.households;
CREATE POLICY "Landlords can create households" ON public.households FOR INSERT WITH CHECK (public.user_can_access_property(property_id::UUID));
DROP POLICY IF EXISTS "Landlords can update households" ON public.households;
CREATE POLICY "Landlords can update households" ON public.households FOR UPDATE USING (public.user_can_access_property(property_id::UUID));
DROP POLICY IF EXISTS "Landlords can delete households" ON public.households;
CREATE POLICY "Landlords can delete households" ON public.households FOR DELETE USING (public.user_can_access_property(property_id::UUID));

-- Users RLS: allow landlords to read tenant emails
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (
  auth.uid() = id OR id IN (SELECT user_id FROM public.tenants WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()))
);
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Tenants: make property_id nullable
DO $$ BEGIN ALTER TABLE public.tenants ALTER COLUMN property_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_user_id_property_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_user_id_property_id_unique ON public.tenants(user_id, property_id) WHERE property_id IS NOT NULL;

-- Abuse guard validation triggers
-- Allow service-role (admin) operations to bypass ownership checks (auth.uid() is NULL for service-role)
CREATE OR REPLACE FUNCTION public.validate_tenant_assignment()
RETURNS TRIGGER AS $$ BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = NEW.property_id AND (owner_id = auth.uid() OR organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')))) THEN
    RAISE EXCEPTION 'You do not have permission to assign tenants to this property';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.validate_work_order_ownership()
RETURNS TRIGGER AS $$ BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.created_by_role = 'landlord' AND NOT EXISTS (SELECT 1 FROM public.properties WHERE id = NEW.property_id AND (owner_id = auth.uid() OR organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')))) THEN
    RAISE EXCEPTION 'You do not have permission to create work orders for this property';
  ELSIF NEW.created_by_role = 'tenant' AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE user_id = auth.uid() AND property_id = NEW.property_id) THEN
    RAISE EXCEPTION 'You can only create work orders for properties you are assigned to';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_tenant_assignment_trigger ON public.tenants;
CREATE TRIGGER validate_tenant_assignment_trigger BEFORE INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_assignment();
DROP TRIGGER IF EXISTS validate_work_order_ownership_trigger ON public.maintenance_requests;
CREATE TRIGGER validate_work_order_ownership_trigger BEFORE INSERT ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.validate_work_order_ownership();

NOTIFY pgrst, 'reload schema';
