-- Entity Audit Log for key mutations
-- Logs INSERT/UPDATE/DELETE on properties, tenants, leases, rent_records, expenses, messages, documents
-- Required for Phase 2: Data integrity and auditability

-- Create entity_audit_log table
CREATE TABLE IF NOT EXISTS public.entity_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  old_data JSONB, -- Before state (for UPDATE/DELETE)
  new_data JSONB, -- After state (for INSERT/UPDATE)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.entity_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log
CREATE POLICY "Admins can view entity audit log"
  ON public.entity_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role (triggers) can insert
CREATE POLICY "System can insert entity audit log"
  ON public.entity_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_entity_audit_log_table_name ON public.entity_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_entity_audit_log_record_id ON public.entity_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_entity_audit_log_created_at ON public.entity_audit_log(created_at DESC);

COMMENT ON TABLE public.entity_audit_log IS 'Audit trail for key entity mutations (properties, tenants, leases, rent_records, expenses, messages, documents).';

-- Generic trigger function
CREATE OR REPLACE FUNCTION log_entity_audit()
RETURNS TRIGGER AS $$
DECLARE
  audit_old JSONB;
  audit_new JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    audit_old := to_jsonb(OLD);
    audit_new := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_old := to_jsonb(OLD);
    audit_new := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    audit_old := NULL;
    audit_new := to_jsonb(NEW);
  END IF;

  INSERT INTO public.entity_audit_log (table_name, record_id, operation, actor_id, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    COALESCE((NEW).id, (OLD).id),
    TG_OP,
    auth.uid(),
    audit_old,
    audit_new
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to key tables
DROP TRIGGER IF EXISTS audit_properties ON public.properties;
CREATE TRIGGER audit_properties
  AFTER INSERT OR UPDATE OR DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION log_entity_audit();

DROP TRIGGER IF EXISTS audit_tenants ON public.tenants;
CREATE TRIGGER audit_tenants
  AFTER INSERT OR UPDATE OR DELETE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION log_entity_audit();

DROP TRIGGER IF EXISTS audit_leases ON public.leases;
CREATE TRIGGER audit_leases
  AFTER INSERT OR UPDATE OR DELETE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION log_entity_audit();

DROP TRIGGER IF EXISTS audit_rent_records ON public.rent_records;
CREATE TRIGGER audit_rent_records
  AFTER INSERT OR UPDATE OR DELETE ON public.rent_records
  FOR EACH ROW EXECUTE FUNCTION log_entity_audit();

DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
CREATE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION log_entity_audit();

DROP TRIGGER IF EXISTS audit_messages ON public.messages;
CREATE TRIGGER audit_messages
  AFTER INSERT OR UPDATE OR DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION log_entity_audit();

DROP TRIGGER IF EXISTS audit_documents ON public.documents;
CREATE TRIGGER audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION log_entity_audit();
