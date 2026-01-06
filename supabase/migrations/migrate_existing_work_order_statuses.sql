-- Migrate existing work order statuses to new canonical statuses
-- This migration should run after refactor_work_order_status_system.sql

-- Note: The main migration in refactor_work_order_status_system.sql already handles:
-- - pending → submitted (if tenant-created) or scheduled (if landlord-created)
-- - completed → closed
-- - in_progress → in_progress (unchanged)
-- - Setting created_by_role based on creator
-- - Migrating description to public_description
-- - Setting visibility_to_tenants = true

-- This migration ensures any remaining edge cases are handled

-- Set created_by_role for any records that might still be null
UPDATE public.maintenance_requests
SET created_by_role = CASE
  WHEN created_by_role IS NULL AND EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.user_id = maintenance_requests.created_by
  ) THEN 'tenant'
  WHEN created_by_role IS NULL THEN 'landlord'
  ELSE created_by_role
END
WHERE created_by_role IS NULL;

-- Ensure all records have visibility_to_tenants set
UPDATE public.maintenance_requests
SET visibility_to_tenants = true
WHERE visibility_to_tenants IS NULL;

-- Migrate any remaining old status values
UPDATE public.maintenance_requests
SET status = CASE
  WHEN status = 'pending' AND created_by_role = 'tenant' THEN 'submitted'
  WHEN status = 'pending' AND created_by_role = 'landlord' THEN 'scheduled'
  WHEN status = 'completed' THEN 'closed'
  WHEN status NOT IN ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed') THEN 'submitted'
  ELSE status
END
WHERE status NOT IN ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed');

-- Ensure public_description is set (migrate from description if needed)
UPDATE public.maintenance_requests
SET public_description = description
WHERE public_description IS NULL AND description IS NOT NULL;

-- Add comment
COMMENT ON TABLE public.maintenance_requests IS 'Work orders use canonical statuses: submitted, seen, scheduled, in_progress, resolved, closed';

