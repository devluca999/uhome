-- Consolidated migration: Lease status, immutability, work order refactor
-- Lease: status (may exist), triggers for immutability and auto-end
-- Work order: make tenant optional, add created_by_role, visibility, migrate statuses

-- Lease: Make tenant_id, lease_start_date, rent_amount nullable for drafts (initial_schema may already have these)
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

-- Work order: add columns (initial_schema has created_by, created_by_role, etc.)
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

NOTIFY pgrst, 'reload schema';
