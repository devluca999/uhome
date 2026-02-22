-- Consolidated migration: Add lease_id to related tables, backfill
-- maintenance_requests, rent_records, documents, tenant_invites already have lease_id in initial_schema
-- This ensures backfill and any missing constraints

ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_lease_id ON public.maintenance_requests(lease_id);
-- Backfill: match by property + tenant (lease.tenant_id may reference users or tenants depending on schema)
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
-- Backfill rent_records: match by property + tenant (lease.tenant_id refs users, rent_records.tenant_id refs tenants)
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

NOTIFY pgrst, 'reload schema';
