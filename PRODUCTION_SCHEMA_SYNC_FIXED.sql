-- ============================================================================
-- PRODUCTION SCHEMA SYNCHRONIZATION - FIXED
-- ============================================================================
-- This migration brings production schema up to date with staging
-- Run this in Production Supabase SQL Editor
-- ============================================================================

-- SECTION 1: EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  category TEXT CHECK (category IN ('maintenance', 'utilities', 'repairs')) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Landlords can view expenses for their properties" ON public.expenses;
CREATE POLICY "Landlords can view expenses for their properties"
  ON public.expenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = expenses.property_id AND properties.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Landlords can insert expenses for their properties" ON public.expenses;
CREATE POLICY "Landlords can insert expenses for their properties"
  ON public.expenses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = expenses.property_id AND properties.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Landlords can update expenses for their properties" ON public.expenses;
CREATE POLICY "Landlords can update expenses for their properties"
  ON public.expenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = expenses.property_id AND properties.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Landlords can delete expenses for their properties" ON public.expenses;
CREATE POLICY "Landlords can delete expenses for their properties"
  ON public.expenses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = expenses.property_id AND properties.owner_id = auth.uid()));

-- Add recurring expenses columns
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
ADD COLUMN IF NOT EXISTS recurring_start_date DATE,
ADD COLUMN IF NOT EXISTS recurring_end_date DATE;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_expenses_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expenses_updated_at ON public.expenses;
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_expenses_updated_at();

-- SECTION 2: LEASES TABLE - ADD STATUS COLUMN
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'active', 'ended')) NOT NULL DEFAULT 'active';
ALTER TABLE public.leases ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.leases ALTER COLUMN lease_start_date DROP NOT NULL;
ALTER TABLE public.leases ALTER COLUMN rent_amount DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_status_tenant_id ON public.leases(status, tenant_id) WHERE tenant_id IS NOT NULL;

UPDATE public.leases SET status = CASE
  WHEN lease_end_date IS NOT NULL AND lease_end_date < CURRENT_DATE THEN 'ended'
  WHEN lease_start_date IS NOT NULL AND lease_start_date <= CURRENT_DATE THEN 'active'
  ELSE 'draft' END WHERE status = 'active';

-- Drop all existing lease policies first
DROP POLICY IF EXISTS "Landlords can view leases for their properties" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view leases for their properties" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view their leases" ON public.leases;
DROP POLICY IF EXISTS "Landlords can insert leases for their properties" ON public.leases;
DROP POLICY IF EXISTS "Landlords can update leases for their properties" ON public.leases;

-- Recreate policies
CREATE POLICY "Landlords can view leases for their properties" ON public.leases FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = leases.property_id AND properties.owner_id = auth.uid()));

CREATE POLICY "Tenants can view their leases" ON public.leases FOR SELECT
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()));

-- SECTION 3: NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('message', 'system')) NOT NULL DEFAULT 'message',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_lease_id ON public.notifications(lease_id);

-- SECTION 4: TENANT_INVITES - ADD LEASE_ID
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tenant_invites_lease_id ON public.tenant_invites(lease_id);

-- SECTION 5: MAINTENANCE_REQUESTS - ADD MISSING COLUMNS
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_lease_id ON public.maintenance_requests(lease_id);

-- Add created_by if missing (needed for role detection)
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS created_by_role TEXT CHECK (created_by_role IN ('landlord', 'tenant')),
  ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS visibility_to_tenants BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS public_description TEXT;

ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_image_urls ON public.maintenance_requests USING GIN (image_urls);

UPDATE public.maintenance_requests SET public_description = description WHERE public_description IS NULL AND description IS NOT NULL;

-- Set created_by_role (handle case where created_by might be null)
UPDATE public.maintenance_requests mr SET created_by_role = CASE
  WHEN mr.created_by IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.user_id = mr.created_by) THEN 'tenant'
  ELSE 'landlord' END WHERE created_by_role IS NULL;

UPDATE public.maintenance_requests SET visibility_to_tenants = true WHERE visibility_to_tenants IS NULL;

-- Only set NOT NULL if we have values
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.maintenance_requests WHERE created_by_role IS NULL LIMIT 1) THEN
    ALTER TABLE public.maintenance_requests ALTER COLUMN created_by_role SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_by_role ON public.maintenance_requests(created_by_role);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_visibility ON public.maintenance_requests(visibility_to_tenants);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_scheduled_date ON public.maintenance_requests(scheduled_date);

-- DONE! Schemas should now be congruent
