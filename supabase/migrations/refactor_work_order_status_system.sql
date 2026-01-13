-- Refactor work order status system
-- Implements canonical statuses: submitted, seen, scheduled, in_progress, resolved, closed
-- Adds role tracking, visibility controls, and separate public/internal descriptions

-- Step 1: Add new columns (before migrating data)
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS created_by_role TEXT CHECK (created_by_role IN ('landlord', 'tenant'));

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS visibility_to_tenants BOOLEAN DEFAULT true;

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS public_description TEXT;

-- Step 2: Migrate existing description to public_description
UPDATE public.maintenance_requests
SET public_description = description
WHERE public_description IS NULL AND description IS NOT NULL;

-- Step 3: Set created_by_role for existing records
-- If created_by matches a tenant's user_id, it's tenant-created
-- Otherwise, it's landlord-created
UPDATE public.maintenance_requests mr
SET created_by_role = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.user_id = mr.created_by
  ) THEN 'tenant'
  ELSE 'landlord'
END
WHERE created_by_role IS NULL;

-- Step 4: Set visibility_to_tenants default for existing records
UPDATE public.maintenance_requests
SET visibility_to_tenants = true
WHERE visibility_to_tenants IS NULL;

-- Step 5: Ensure created_by is set for all rows (required for created_by_role determination)
-- Handle cases where created_by might be NULL (set to property owner as fallback)
UPDATE public.maintenance_requests mr
SET created_by = (
  SELECT owner_id FROM public.properties WHERE id = mr.property_id
)
WHERE created_by IS NULL;

-- Step 5b: Ensure created_by_role is set (fallback for any rows that might have been missed)
UPDATE public.maintenance_requests mr
SET created_by_role = CASE
  WHEN created_by_role IS NULL AND EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.user_id = mr.created_by
  ) THEN 'tenant'
  WHEN created_by_role IS NULL THEN 'landlord'
  ELSE created_by_role
END
WHERE created_by_role IS NULL;

-- Step 6: Update status CHECK constraint FIRST (before migrating status values)
-- Drop the old constraint to allow status migration
ALTER TABLE public.maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;

-- Step 7: Migrate status values (now that old constraint is dropped)
-- pending → submitted (if tenant-created) or scheduled (if landlord-created)
-- completed → closed
-- in_progress → in_progress (unchanged)
-- Any invalid status → submitted (fallback)
UPDATE public.maintenance_requests
SET status = CASE
  WHEN status = 'pending' AND created_by_role = 'tenant' THEN 'submitted'
  WHEN status = 'pending' AND created_by_role = 'landlord' THEN 'scheduled'
  WHEN status = 'completed' THEN 'closed'
  WHEN status = 'in_progress' THEN 'in_progress'
  WHEN status NOT IN ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed') THEN 'submitted'
  ELSE status
END;

-- Step 8: Add new constraint with canonical statuses (after all rows are migrated)
ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT maintenance_requests_status_check
  CHECK (status IN ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed'));

-- Step 9: Make created_by_role NOT NULL after setting values
ALTER TABLE public.maintenance_requests
  ALTER COLUMN created_by_role SET NOT NULL;

-- Step 10: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_by_role ON public.maintenance_requests(created_by_role);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_visibility ON public.maintenance_requests(visibility_to_tenants);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_scheduled_date ON public.maintenance_requests(scheduled_date);

-- Step 11: Add comments for documentation
COMMENT ON COLUMN public.maintenance_requests.created_by_role IS 'Role of the user who created this work order. Determines valid status flow.';
COMMENT ON COLUMN public.maintenance_requests.scheduled_date IS 'When maintenance is scheduled to occur. Set when status transitions to scheduled.';
COMMENT ON COLUMN public.maintenance_requests.visibility_to_tenants IS 'Whether this work order is visible to tenants assigned to the property. Default true.';
COMMENT ON COLUMN public.maintenance_requests.internal_notes IS 'Landlord-only notes. Not visible to tenants.';
COMMENT ON COLUMN public.maintenance_requests.public_description IS 'Description visible to tenants. Replaces description field.';

