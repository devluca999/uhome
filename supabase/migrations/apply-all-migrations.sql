-- ============================================================================
-- uhome: Idempotent Apply-All Migrations
-- ============================================================================
-- Paste this entire script into the Supabase SQL Editor and run it.
-- Safe to re-run on a database that already has some/all migrations applied.
-- Every statement uses IF NOT EXISTS, DROP IF EXISTS, or DO $$ guards.
--
-- Migration sources (in order):
--   20240101000000_initial_schema
--   20240102000000_add_token_to_tenant_invites
--   20240219000001_base_tables
--   20240219000002_property_tenant_fields
--   20240219000003_lease_work_order
--   20240219000004_lease_normalization
--   20240219000005_messaging_rate_limits
--   20240219000006_rls_fixes
--   20240219000007_add_full_name_to_users
--   20240219000008_onboarding_tables
--   20240219000009_admin_rls_read_all
--   20260310000100_extend_expenses_with_metadata
--   20260403100000_documents_visibility_folders
-- ============================================================================


-- ============================================================================
-- MIGRATION 1: Initial Schema (20240101000000)
-- ============================================================================

-- 1. USERS TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT CHECK (role IN ('landlord', 'tenant', 'admin')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'collaborator', 'tenant')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 4. SUBSCRIPTIONS TABLE
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

-- 6. HOUSEHOLDS TABLE
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. UNITS TABLE
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  rent_amount NUMERIC(10, 2),
  rent_due_date INTEGER CHECK (rent_due_date >= 1 AND rent_due_date <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, unit_name)
);

-- 8. LEASES TABLE
CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('draft', 'active', 'ended')) NOT NULL DEFAULT 'draft',
  lease_start_date DATE,
  lease_end_date DATE,
  lease_type TEXT CHECK (lease_type IN ('short-term', 'long-term')) NOT NULL DEFAULT 'long-term',
  rent_amount NUMERIC(10, 2),
  rent_frequency TEXT CHECK (rent_frequency IN ('monthly', 'weekly', 'biweekly', 'yearly')) NOT NULL DEFAULT 'monthly',
  security_deposit NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TENANTS TABLE
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
  move_in_date DATE NOT NULL,
  lease_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- 10. TENANT_INVITES TABLE
CREATE TABLE IF NOT EXISTS public.tenant_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired')) NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 11. MAINTENANCE_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed')) NOT NULL DEFAULT 'submitted',
  category TEXT,
  description TEXT NOT NULL,
  public_description TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_by_role TEXT CHECK (created_by_role IN ('landlord', 'tenant')) NOT NULL DEFAULT 'tenant',
  scheduled_date TIMESTAMP WITH TIME ZONE,
  visibility_to_tenants BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. RENT_RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.rent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid', 'overdue')) NOT NULL DEFAULT 'pending',
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT,
  description TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('landlord_tenant', 'household')) DEFAULT 'landlord_tenant',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'tenant')
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Permissive policies for tables that keep them (units, leases, tenant_invites,
-- maintenance_requests, rent_records, expenses, messages, notifications, documents).
-- The tables whose allow_all policies get replaced later (users, organizations,
-- memberships, properties, tenants, households, subscriptions) are created here
-- but dropped in migration 6 (rls_fixes).
DROP POLICY IF EXISTS "allow_all_users" ON public.users;
CREATE POLICY "allow_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_organizations" ON public.organizations;
CREATE POLICY "allow_all_organizations" ON public.organizations FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_memberships" ON public.memberships;
CREATE POLICY "allow_all_memberships" ON public.memberships FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_properties" ON public.properties;
CREATE POLICY "allow_all_properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_units" ON public.units;
CREATE POLICY "allow_all_units" ON public.units FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_leases" ON public.leases;
CREATE POLICY "allow_all_leases" ON public.leases FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_tenants" ON public.tenants;
CREATE POLICY "allow_all_tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_tenant_invites" ON public.tenant_invites;
CREATE POLICY "allow_all_tenant_invites" ON public.tenant_invites FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_maintenance" ON public.maintenance_requests;
CREATE POLICY "allow_all_maintenance" ON public.maintenance_requests FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_rent_records" ON public.rent_records;
CREATE POLICY "allow_all_rent_records" ON public.rent_records FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_expenses" ON public.expenses;
CREATE POLICY "allow_all_expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_messages" ON public.messages;
CREATE POLICY "allow_all_messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_notifications" ON public.notifications;
CREATE POLICY "allow_all_notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_documents" ON public.documents;
CREATE POLICY "allow_all_documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_households" ON public.households;
CREATE POLICY "allow_all_households" ON public.households FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_subscriptions" ON public.subscriptions;
CREATE POLICY "allow_all_subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);


-- ============================================================================
-- MIGRATION 2: Add token to tenant_invites (20240102000000)
-- ============================================================================

ALTER TABLE public.tenant_invites
  ADD COLUMN IF NOT EXISTS token TEXT UNIQUE;

ALTER TABLE public.tenant_invites
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

UPDATE public.tenant_invites
SET token = gen_random_uuid()::text || '-' || substr(md5(random()::text), 1, 8)
WHERE token IS NULL;

ALTER TABLE public.tenant_invites
  ALTER COLUMN token SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_invites_token ON public.tenant_invites(token);


-- ============================================================================
-- MIGRATION 3: Base tables - tasks, notes, receipt_settings, etc. (20240219000001)
-- ============================================================================

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  assigned_to_type TEXT CHECK (assigned_to_type IN ('tenant', 'household', 'unit')) NOT NULL,
  assigned_to_id UUID NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed')) NOT NULL DEFAULT 'pending',
  deadline DATE,
  linked_context_type TEXT CHECK (linked_context_type IN ('work_order', 'move_in', 'property', 'rent_record')) NOT NULL,
  linked_context_id UUID NOT NULL,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  image_urls JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Landlords can view all tasks for their properties" ON public.tasks;
CREATE POLICY "Landlords can view all tasks for their properties" ON public.tasks FOR SELECT USING (
  created_by = auth.uid() OR
  (assigned_to_type = 'tenant' AND assigned_to_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())) OR
  (linked_context_type = 'property' AND linked_context_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())) OR
  (linked_context_type = 'work_order' AND linked_context_id IN (SELECT id FROM public.maintenance_requests WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())))
);
DROP POLICY IF EXISTS "Landlords can create tasks for their properties" ON public.tasks;
CREATE POLICY "Landlords can create tasks for their properties" ON public.tasks FOR INSERT WITH CHECK (
  created_by = auth.uid() AND (
    (linked_context_type = 'property' AND linked_context_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())) OR
    (linked_context_type = 'work_order' AND linked_context_id IN (SELECT id FROM public.maintenance_requests WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()))) OR
    (linked_context_type = 'rent_record' AND linked_context_id IN (SELECT id FROM public.rent_records WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())))
  )
);
DROP POLICY IF EXISTS "Landlords can update tasks for their properties" ON public.tasks;
CREATE POLICY "Landlords can update tasks for their properties" ON public.tasks FOR UPDATE USING (
  created_by = auth.uid() OR
  (linked_context_type = 'property' AND linked_context_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())) OR
  (linked_context_type = 'work_order' AND linked_context_id IN (SELECT id FROM public.maintenance_requests WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())))
);
DROP POLICY IF EXISTS "Tenants can update tasks assigned to them" ON public.tasks;
CREATE POLICY "Tenants can update tasks assigned to them" ON public.tasks FOR UPDATE USING (
  assigned_to_type = 'tenant' AND assigned_to_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "Landlords can delete tasks for their properties" ON public.tasks;
CREATE POLICY "Landlords can delete tasks for their properties" ON public.tasks FOR DELETE USING (
  created_by = auth.uid() OR
  (linked_context_type = 'property' AND linked_context_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())) OR
  (linked_context_type = 'work_order' AND linked_context_id IN (SELECT id FROM public.maintenance_requests WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())))
);

CREATE OR REPLACE FUNCTION update_tasks_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to_type, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_context ON public.tasks(linked_context_type, linked_context_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline) WHERE deadline IS NOT NULL;

-- Notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entity_type TEXT CHECK (entity_type IN ('property', 'tenant', 'rent_record', 'expense')) NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
CREATE POLICY "Users can insert their own notes" ON public.notes FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION update_notes_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS notes_updated_at ON public.notes;
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION update_notes_updated_at();
CREATE INDEX IF NOT EXISTS idx_notes_entity ON public.notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);

-- Receipt settings table
CREATE TABLE IF NOT EXISTS public.receipt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  header_text TEXT NULL,
  logo_url TEXT NULL,
  footer_note TEXT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE public.receipt_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own receipt settings" ON public.receipt_settings;
CREATE POLICY "Users can view their own receipt settings" ON public.receipt_settings FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own receipt settings" ON public.receipt_settings;
CREATE POLICY "Users can insert their own receipt settings" ON public.receipt_settings FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own receipt settings" ON public.receipt_settings;
CREATE POLICY "Users can update their own receipt settings" ON public.receipt_settings FOR UPDATE USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION update_receipt_settings_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS receipt_settings_updated_at ON public.receipt_settings;
CREATE TRIGGER receipt_settings_updated_at BEFORE UPDATE ON public.receipt_settings FOR EACH ROW EXECUTE FUNCTION update_receipt_settings_updated_at();

-- Property type system
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_type TEXT NULL;
CREATE TABLE IF NOT EXISTS public.user_property_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, type_name)
);
ALTER TABLE public.user_property_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own property types" ON public.user_property_types;
CREATE POLICY "Users can view their own property types" ON public.user_property_types FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own property types" ON public.user_property_types;
CREATE POLICY "Users can insert their own property types" ON public.user_property_types FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own property types" ON public.user_property_types;
CREATE POLICY "Users can delete their own property types" ON public.user_property_types FOR DELETE USING (user_id = auth.uid());

-- Property groups
CREATE TABLE IF NOT EXISTS public.property_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('city', 'ownership', 'custom')) NOT NULL DEFAULT 'custom',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.property_group_assignments (
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.property_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, group_id)
);
ALTER TABLE public.property_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_group_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own property groups" ON public.property_groups;
CREATE POLICY "Users can view their own property groups" ON public.property_groups FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own property groups" ON public.property_groups;
CREATE POLICY "Users can insert their own property groups" ON public.property_groups FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own property groups" ON public.property_groups;
CREATE POLICY "Users can update their own property groups" ON public.property_groups FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own property groups" ON public.property_groups;
CREATE POLICY "Users can delete their own property groups" ON public.property_groups FOR DELETE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can view assignments for their properties" ON public.property_group_assignments;
CREATE POLICY "Users can view assignments for their properties" ON public.property_group_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_group_assignments.property_id AND properties.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert assignments for their properties" ON public.property_group_assignments;
CREATE POLICY "Users can insert assignments for their properties" ON public.property_group_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_group_assignments.property_id AND properties.owner_id = auth.uid()) AND
  EXISTS (SELECT 1 FROM public.property_groups WHERE property_groups.id = property_group_assignments.group_id AND property_groups.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can delete assignments for their properties" ON public.property_group_assignments;
CREATE POLICY "Users can delete assignments for their properties" ON public.property_group_assignments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_group_assignments.property_id AND properties.owner_id = auth.uid())
);

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON public.properties(organization_id) WHERE organization_id IS NOT NULL;


-- ============================================================================
-- MIGRATION 4: Property and tenant field additions (20240219000002)
-- ============================================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_household_id ON public.tenants(household_id) WHERE household_id IS NOT NULL;

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT NULL;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS notes TEXT NULL;

ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('manual', 'external')) NULL;
ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS receipt_url TEXT NULL;
ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS late_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL;

ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS payment_method_type TEXT CHECK (payment_method_type IN ('manual', 'external')) NULL;
ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS payment_method_label TEXT NULL;
UPDATE public.rent_records SET payment_method_type = CASE WHEN payment_method = 'manual' THEN 'manual' WHEN payment_method = 'external' THEN 'external' ELSE NULL END WHERE payment_method IS NOT NULL AND payment_method_type IS NULL;
ALTER TABLE public.rent_records DROP CONSTRAINT IF EXISTS rent_records_payment_method_check;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS late_fee_rules JSONB;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rules_visible_to_tenants BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON public.properties(is_active);
COMMENT ON COLUMN public.properties.is_active IS 'Whether the property is active. Inactive properties are excluded from calculations, metrics, and most views. Defaults to true.';

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly'));
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_start_date DATE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_end_date DATE;


-- ============================================================================
-- MIGRATION 5: Lease status, immutability, work order refactor (20240219000003)
-- ============================================================================

-- Lease: make columns nullable for drafts
DO $$ BEGIN
  ALTER TABLE public.leases ALTER COLUMN tenant_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.leases ALTER COLUMN lease_start_date DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.leases ALTER COLUMN rent_amount DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_status_tenant_id ON public.leases(status, tenant_id) WHERE tenant_id IS NOT NULL;

-- Lease immutability triggers
CREATE OR REPLACE FUNCTION public.prevent_ended_lease_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'ended' THEN
    IF NEW.status != OLD.status OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.lease_start_date IS DISTINCT FROM OLD.lease_start_date OR NEW.lease_end_date IS DISTINCT FROM OLD.lease_end_date OR NEW.lease_type IS DISTINCT FROM OLD.lease_type OR NEW.rent_amount IS DISTINCT FROM OLD.rent_amount OR NEW.rent_frequency IS DISTINCT FROM OLD.rent_frequency OR NEW.security_deposit IS DISTINCT FROM OLD.security_deposit THEN
      RAISE EXCEPTION 'Lease has ended and cannot be modified. Ended leases are immutable.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS prevent_ended_lease_updates_trigger ON public.leases;
CREATE TRIGGER prevent_ended_lease_updates_trigger BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.prevent_ended_lease_updates();

CREATE OR REPLACE FUNCTION public.prevent_ended_status_transitions()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'ended' AND NEW.status != 'ended' THEN
    RAISE EXCEPTION 'Cannot change status from ended. Ended leases are terminal and immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS prevent_ended_status_transitions_trigger ON public.leases;
CREATE TRIGGER prevent_ended_status_transitions_trigger BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.prevent_ended_status_transitions();

CREATE OR REPLACE FUNCTION public.auto_end_leases()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lease_end_date IS NOT NULL AND NEW.lease_end_date < CURRENT_DATE AND NEW.status != 'ended' THEN
    NEW.status = 'ended';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS auto_end_leases_update_trigger ON public.leases;
CREATE TRIGGER auto_end_leases_update_trigger BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.auto_end_leases();
DROP TRIGGER IF EXISTS auto_end_leases_insert_trigger ON public.leases;
CREATE TRIGGER auto_end_leases_insert_trigger BEFORE INSERT ON public.leases FOR EACH ROW EXECUTE FUNCTION public.auto_end_leases();

CREATE OR REPLACE FUNCTION public.batch_end_expired_leases()
RETURNS INTEGER AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE public.leases SET status = 'ended', updated_at = NOW()
  WHERE status IN ('draft', 'active') AND lease_end_date IS NOT NULL AND lease_end_date < CURRENT_DATE;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Work order: ensure columns exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='maintenance_requests' AND column_name='created_by') THEN
    ALTER TABLE public.maintenance_requests ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS created_by_role TEXT CHECK (created_by_role IN ('landlord', 'tenant'));
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS visibility_to_tenants BOOLEAN DEFAULT true;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS public_description TEXT;

UPDATE public.maintenance_requests SET public_description = description WHERE public_description IS NULL AND description IS NOT NULL;
UPDATE public.maintenance_requests mr SET created_by_role = CASE WHEN EXISTS (SELECT 1 FROM public.tenants t WHERE t.user_id = mr.created_by) THEN 'tenant' ELSE 'landlord' END WHERE created_by_role IS NULL;
UPDATE public.maintenance_requests SET visibility_to_tenants = true WHERE visibility_to_tenants IS NULL;
UPDATE public.maintenance_requests mr SET created_by = (SELECT owner_id FROM public.properties WHERE id = mr.property_id) WHERE created_by IS NULL;
UPDATE public.maintenance_requests mr SET created_by_role = CASE WHEN created_by_role IS NULL AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.user_id = mr.created_by) THEN 'tenant' WHEN created_by_role IS NULL THEN 'landlord' ELSE created_by_role END WHERE created_by_role IS NULL;

ALTER TABLE public.maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;
UPDATE public.maintenance_requests SET status = CASE WHEN status = 'pending' AND created_by_role = 'tenant' THEN 'submitted' WHEN status = 'pending' AND created_by_role = 'landlord' THEN 'scheduled' WHEN status = 'completed' THEN 'closed' WHEN status NOT IN ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed') THEN 'submitted' ELSE status END;
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_status_check CHECK (status IN ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed'));
DO $$ BEGIN ALTER TABLE public.maintenance_requests ALTER COLUMN created_by_role SET NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_by_role ON public.maintenance_requests(created_by_role);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_visibility ON public.maintenance_requests(visibility_to_tenants);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_scheduled_date ON public.maintenance_requests(scheduled_date);

ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_image_urls ON public.maintenance_requests USING GIN (image_urls);


-- ============================================================================
-- MIGRATION 6: Lease normalization - add lease_id + backfill (20240219000004)
-- ============================================================================

ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_lease_id ON public.maintenance_requests(lease_id);
UPDATE public.maintenance_requests mr SET lease_id = (
  SELECT l.id FROM public.leases l
  WHERE l.property_id = mr.property_id
  AND ((l.tenant_id = mr.tenant_id) OR (l.tenant_id IN (SELECT user_id FROM public.tenants WHERE id = mr.tenant_id)))
  AND (l.lease_end_date IS NULL OR l.lease_end_date > CURRENT_DATE)
  ORDER BY l.lease_start_date DESC LIMIT 1
) WHERE mr.lease_id IS NULL AND mr.tenant_id IS NOT NULL;
UPDATE public.maintenance_requests mr SET lease_id = (
  SELECT l.id FROM public.leases l
  WHERE l.property_id = mr.property_id
  AND ((l.tenant_id = mr.tenant_id) OR (l.tenant_id IN (SELECT user_id FROM public.tenants WHERE id = mr.tenant_id)))
  ORDER BY l.lease_start_date DESC LIMIT 1
) WHERE mr.lease_id IS NULL AND mr.tenant_id IS NOT NULL;
DO $$ BEGIN ALTER TABLE public.maintenance_requests ALTER COLUMN property_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.maintenance_requests ALTER COLUMN tenant_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.rent_records ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_rent_records_lease_id ON public.rent_records(lease_id);
UPDATE public.rent_records rr SET lease_id = (
  SELECT l.id FROM public.leases l
  JOIN public.tenants t ON t.id = rr.tenant_id AND t.user_id = l.tenant_id
  WHERE l.property_id = rr.property_id
  AND (l.lease_end_date IS NULL OR l.lease_end_date > CURRENT_DATE)
  ORDER BY l.lease_start_date DESC LIMIT 1
) WHERE rr.lease_id IS NULL AND rr.tenant_id IS NOT NULL;
UPDATE public.rent_records rr SET lease_id = (
  SELECT l.id FROM public.leases l
  JOIN public.tenants t ON t.id = rr.tenant_id AND t.user_id = l.tenant_id
  WHERE l.property_id = rr.property_id
  ORDER BY l.lease_start_date DESC LIMIT 1
) WHERE rr.lease_id IS NULL AND rr.tenant_id IS NOT NULL;
DO $$ BEGIN ALTER TABLE public.rent_records ALTER COLUMN property_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.rent_records ALTER COLUMN tenant_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;


-- ============================================================================
-- MIGRATION 7: Messaging, rate limits, abuse guards (20240219000005)
-- ============================================================================

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_role TEXT CHECK (sender_role IN ('tenant', 'landlord', 'system'));
UPDATE public.messages SET sender_role = 'landlord' WHERE sender_role IS NULL;
DO $$ BEGIN ALTER TABLE public.messages ALTER COLUMN sender_role SET NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('message', 'system'));
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "read" BOOLEAN NOT NULL DEFAULT false;

-- Rate limit and abuse tables
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'message', 'invite', 'work_order', 'checklist', 'other')),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own rate limit tracking" ON public.rate_limit_tracking;
CREATE POLICY "Users can view their own rate limit tracking" ON public.rate_limit_tracking FOR SELECT USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_id ON public.rate_limit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_created_at ON public.rate_limit_tracking(created_at);

CREATE TABLE IF NOT EXISTS public.abuse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'message', 'invite', 'work_order', 'checklist', 'other')),
  violation_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  rate_limit_violation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.abuse_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own abuse events" ON public.abuse_events;
CREATE POLICY "Users can view their own abuse events" ON public.abuse_events FOR SELECT USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_abuse_events_user_id ON public.abuse_events(user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_events_created_at ON public.abuse_events(created_at);

-- Invite cap trigger
CREATE OR REPLACE FUNCTION public.enforce_invite_cap()
RETURNS TRIGGER AS $$
DECLARE active_invite_count INTEGER; max_active_invites INTEGER := 5;
BEGIN
  SELECT COUNT(*) INTO active_invite_count FROM public.tenant_invites
  WHERE property_id = NEW.property_id AND (accepted_at IS NULL OR status = 'pending') AND expires_at > NOW();
  IF active_invite_count >= max_active_invites THEN
    RAISE EXCEPTION 'Maximum % active invites per property. Please wait for existing invites to be accepted or expire.', max_active_invites;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS enforce_invite_cap_trigger ON public.tenant_invites;
CREATE TRIGGER enforce_invite_cap_trigger BEFORE INSERT ON public.tenant_invites FOR EACH ROW EXECUTE FUNCTION public.enforce_invite_cap();

-- Upload limit trigger
CREATE OR REPLACE FUNCTION public.enforce_daily_upload_cap()
RETURNS TRIGGER AS $$
DECLARE uploads_today INTEGER; max_uploads INTEGER := 50;
BEGIN
  SELECT COUNT(*) INTO uploads_today FROM public.documents WHERE uploaded_by = NEW.uploaded_by AND DATE(created_at) = CURRENT_DATE;
  IF uploads_today >= max_uploads THEN RAISE EXCEPTION 'Daily upload limit of % reached. Please try again tomorrow.', max_uploads; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS enforce_daily_upload_cap_trigger ON public.documents;
CREATE TRIGGER enforce_daily_upload_cap_trigger BEFORE INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_upload_cap();

-- Notes entity type extension
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_entity_type_check;
ALTER TABLE public.notes ADD CONSTRAINT notes_entity_type_check CHECK (entity_type IN ('property', 'unit', 'tenant', 'rent_record', 'expense', 'work_order', 'document'));


-- ============================================================================
-- MIGRATION 8: RLS fixes - replace permissive with proper policies (20240219000006)
-- ============================================================================

-- Drop permissive allow_all policies for tables that get proper RLS
DROP POLICY IF EXISTS "allow_all_users" ON public.users;
DROP POLICY IF EXISTS "allow_all_organizations" ON public.organizations;
DROP POLICY IF EXISTS "allow_all_memberships" ON public.memberships;
DROP POLICY IF EXISTS "allow_all_properties" ON public.properties;
DROP POLICY IF EXISTS "allow_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "allow_all_households" ON public.households;
DROP POLICY IF EXISTS "allow_all_subscriptions" ON public.subscriptions;

-- SECURITY DEFINER helper functions (break RLS recursion)
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

-- Users RLS (replaced again in migration 9 with admin support)
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


-- ============================================================================
-- MIGRATION 9: Add full_name to users (20240219000007)
-- ============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;


-- ============================================================================
-- MIGRATION 10: Onboarding tables (20240219000008)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Move-In Checklist',
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_property ON public.onboarding_templates(property_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_active ON public.onboarding_templates(property_id, is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'reviewed', 'reopened')),
  completed_fields INTEGER NOT NULL DEFAULT 0,
  total_fields INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reopened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, template_id)
);
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_tenant ON public.onboarding_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_template ON public.onboarding_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_status ON public.onboarding_submissions(status);

CREATE OR REPLACE FUNCTION update_onboarding_templates_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS onboarding_templates_updated_at ON public.onboarding_templates;
CREATE TRIGGER onboarding_templates_updated_at BEFORE UPDATE ON public.onboarding_templates FOR EACH ROW EXECUTE FUNCTION update_onboarding_templates_updated_at();

CREATE OR REPLACE FUNCTION update_onboarding_submissions_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS onboarding_submissions_updated_at ON public.onboarding_submissions;
CREATE TRIGGER onboarding_submissions_updated_at BEFORE UPDATE ON public.onboarding_submissions FOR EACH ROW EXECUTE FUNCTION update_onboarding_submissions_updated_at();

-- RLS: Onboarding Templates
DROP POLICY IF EXISTS "Landlords can view own property templates" ON public.onboarding_templates;
CREATE POLICY "Landlords can view own property templates" ON public.onboarding_templates
  FOR SELECT USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
    OR public.user_can_access_property(property_id)
  );
DROP POLICY IF EXISTS "Landlords can create templates for own properties" ON public.onboarding_templates;
CREATE POLICY "Landlords can create templates for own properties" ON public.onboarding_templates
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (
      property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
      OR public.user_can_access_property(property_id)
    )
  );
DROP POLICY IF EXISTS "Landlords can update own property templates" ON public.onboarding_templates;
CREATE POLICY "Landlords can update own property templates" ON public.onboarding_templates
  FOR UPDATE USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
    OR public.user_can_access_property(property_id)
  );
DROP POLICY IF EXISTS "Landlords can delete own property templates" ON public.onboarding_templates;
CREATE POLICY "Landlords can delete own property templates" ON public.onboarding_templates
  FOR DELETE USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
    OR public.user_can_access_property(property_id)
  );
DROP POLICY IF EXISTS "Tenants can view templates for their property" ON public.onboarding_templates;
CREATE POLICY "Tenants can view templates for their property" ON public.onboarding_templates
  FOR SELECT USING (
    is_active = true
    AND property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.tenants t ON t.property_id = p.id
      WHERE t.user_id = auth.uid()
    )
  );

-- RLS: Onboarding Submissions
DROP POLICY IF EXISTS "Tenants can view own submissions" ON public.onboarding_submissions;
CREATE POLICY "Tenants can view own submissions" ON public.onboarding_submissions
  FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Tenants can create own submissions" ON public.onboarding_submissions;
CREATE POLICY "Tenants can create own submissions" ON public.onboarding_submissions
  FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Tenants can update own submissions" ON public.onboarding_submissions;
CREATE POLICY "Tenants can update own submissions" ON public.onboarding_submissions
  FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Landlords can view submissions for own properties" ON public.onboarding_submissions;
CREATE POLICY "Landlords can view submissions for own properties" ON public.onboarding_submissions
  FOR SELECT USING (
    template_id IN (
      SELECT ot.id FROM public.onboarding_templates ot
      JOIN public.properties p ON ot.property_id = p.id
      WHERE p.owner_id = auth.uid() OR public.user_can_access_property(p.id)
    )
  );
DROP POLICY IF EXISTS "Landlords can update submissions for own properties" ON public.onboarding_submissions;
CREATE POLICY "Landlords can update submissions for own properties" ON public.onboarding_submissions
  FOR UPDATE USING (
    template_id IN (
      SELECT ot.id FROM public.onboarding_templates ot
      JOIN public.properties p ON ot.property_id = p.id
      WHERE p.owner_id = auth.uid() OR public.user_can_access_property(p.id)
    )
  );

-- Storage bucket for onboarding images
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-images', 'onboarding-images', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload onboarding images" ON storage.objects;
CREATE POLICY "Authenticated users can upload onboarding images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'onboarding-images' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can view own onboarding images" ON storage.objects;
CREATE POLICY "Users can view own onboarding images" ON storage.objects
  FOR SELECT USING (bucket_id = 'onboarding-images' AND auth.role() = 'authenticated');


-- ============================================================================
-- MIGRATION 11: Admin RLS and monitoring (20240219000009)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;

-- Users: replace policy with admin-aware version
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (
  auth.uid() = id
  OR public.is_admin_user()
  OR id IN (SELECT user_id FROM public.tenants WHERE property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()))
);

-- Admin monitoring tables
CREATE TABLE IF NOT EXISTS public.admin_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('tenant', 'landlord', 'admin')),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('page_load', 'api_call', 'component_render')),
  page_path TEXT,
  metric_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.admin_metrics ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_metrics_created_at ON public.admin_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_metric_type ON public.admin_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_type_created ON public.admin_metrics(metric_type, created_at DESC);

DROP POLICY IF EXISTS "Admins can view admin metrics" ON public.admin_metrics;
CREATE POLICY "Admins can view admin metrics" ON public.admin_metrics FOR SELECT USING (public.is_admin_user());
DROP POLICY IF EXISTS "Anyone can insert admin metrics" ON public.admin_metrics;
CREATE POLICY "Anyone can insert admin metrics" ON public.admin_metrics FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.admin_upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('tenant', 'landlord', 'admin')),
  bucket TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_duration_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  storage_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.admin_upload_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_upload_logs_created_at ON public.admin_upload_logs(created_at DESC);

DROP POLICY IF EXISTS "Admins can view upload logs" ON public.admin_upload_logs;
CREATE POLICY "Admins can view upload logs" ON public.admin_upload_logs FOR SELECT USING (public.is_admin_user());
DROP POLICY IF EXISTS "Anyone can insert upload logs" ON public.admin_upload_logs;
CREATE POLICY "Anyone can insert upload logs" ON public.admin_upload_logs FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.admin_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  user_role TEXT CHECK (user_role IN ('tenant', 'landlord', 'admin')),
  event_type TEXT NOT NULL CHECK (event_type IN ('failed_login', 'invalid_api_call', 'rate_limit_exceeded', 'suspicious_activity')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.admin_security_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_created_at ON public.admin_security_logs(created_at DESC);

DROP POLICY IF EXISTS "Admins can view security logs" ON public.admin_security_logs;
CREATE POLICY "Admins can view security logs" ON public.admin_security_logs FOR SELECT USING (public.is_admin_user());
DROP POLICY IF EXISTS "Anyone can insert security logs" ON public.admin_security_logs;
CREATE POLICY "Anyone can insert security logs" ON public.admin_security_logs FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (public.is_admin_user());
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (public.is_admin_user());


-- ============================================================================
-- MIGRATION 12: Extend expenses with metadata (20260310000100)
-- ============================================================================

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS recurring_type TEXT,
ADD COLUMN IF NOT EXISTS recurring_interval INTEGER,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS next_due_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN public.expenses.type IS 'High-level type of expense: one_time or recurring';
COMMENT ON COLUMN public.expenses.recurring_type IS 'Recurring cadence: monthly, quarterly, yearly';
COMMENT ON COLUMN public.expenses.recurring_interval IS 'Numeric interval used for custom recurrence rules';
COMMENT ON COLUMN public.expenses.start_date IS 'Logical start date for the expense or series';
COMMENT ON COLUMN public.expenses.end_date IS 'Logical end date for the expense or series';
COMMENT ON COLUMN public.expenses.next_due_date IS 'Next due date for this expense or series';
COMMENT ON COLUMN public.expenses.status IS 'Lightweight status field: planned, due, paid, canceled';
COMMENT ON COLUMN public.expenses.notes IS 'Freeform notes for landlords about this expense';
COMMENT ON COLUMN public.expenses.title IS 'Optional display title';


-- ============================================================================
-- MIGRATION 13: Documents visibility and folders (20260403100000)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_folders_property_id ON public.document_folders(property_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_lease_id ON public.document_folders(lease_id);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_document_folders" ON public.document_folders;
CREATE POLICY "allow_all_document_folders" ON public.document_folders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'household';
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_visibility_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_visibility_check CHECK (visibility IN ('private', 'landlord', 'household'));

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON public.documents(folder_id);

COMMENT ON COLUMN public.documents.visibility IS 'Who can see this document besides the uploader: private, landlord, or household';
COMMENT ON COLUMN public.documents.folder_id IS 'Optional folder grouping for UI';


-- ============================================================================
-- DONE - Reload PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
