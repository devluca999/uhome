-- Base uhome schema - required for local Supabase db reset
-- Source: schema.sql (creates users, organizations, properties, tenants, etc.)

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

-- 7. UNITS TABLE (required before leases)
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

-- 11. MAINTENANCE_REQUESTS TABLE (work_orders)
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

-- Enable RLS
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

-- Basic permissive policies for local dev (seed script uses service role)
CREATE POLICY "allow_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_organizations" ON public.organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_memberships" ON public.memberships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_units" ON public.units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_leases" ON public.leases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tenant_invites" ON public.tenant_invites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_maintenance" ON public.maintenance_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rent_records" ON public.rent_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_households" ON public.households FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

-- Notify PostgREST to reload schema cache (fixes PGRST204 after migration)
NOTIFY pgrst, 'reload schema';
