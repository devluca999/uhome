-- Panic brake: hard-fail anon writes on critical tables
-- Even if RLS or application code fails, the DB refuses mutation.
-- This makes prod smoke tests physically safe, not just logically safe.
--
-- Tables with public anon write (waitlist, leads, etc.) are excluded.

CREATE OR REPLACE FUNCTION public.panic_brake_anon_no_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.role() = 'anon' THEN
    RAISE EXCEPTION 'panic_brake: anon role cannot write to this table. Production safeguard.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply to core tables that must never accept anon writes
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users', 'properties', 'tenants', 'leases', 'rent_records', 'expenses',
    'maintenance_requests', 'documents', 'messages', 'households',
    'tenant_invites', 'tasks', 'notifications', 'property_groups',
    'property_group_assignments', 'organizations', 'memberships',
    'stripe_connect_accounts', 'payments', 'payment_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS panic_brake_anon_no_write ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER panic_brake_anon_no_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.panic_brake_anon_no_write()',
        t
      );
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.panic_brake_anon_no_write() IS 'Panic brake: blocks anon role writes. Production safety layer.';
