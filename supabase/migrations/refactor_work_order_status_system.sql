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

-- Step 5: Migrate status values
-- pending → submitted (if tenant-created) or scheduled (if landlord-created)
UPDATE public.maintenance_requests
SET status = CASE
  WHEN status = 'pending' AND created_by_role = 'tenant' THEN 'submitted'
  WHEN status = 'pending' AND created_by_role = 'landlord' THEN 'scheduled'
  WHEN status = 'completed' THEN 'closed'
  ELSE status
END
WHERE status IN ('pending', 'completed');

-- Step 6: Update status CHECK constraint
-- First, drop the old constraint
ALTER TABLE public.maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;

-- Add new constraint with canonical statuses
ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT maintenance_requests_status_check
  CHECK (status IN ('submitted', 'seen', 'scheduled', 'in_progress', 'resolved', 'closed'));

-- Step 7: Make created_by_role NOT NULL after setting values
ALTER TABLE public.maintenance_requests
  ALTER COLUMN created_by_role SET NOT NULL;

-- Step 8: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_by_role ON public.maintenance_requests(created_by_role);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_visibility ON public.maintenance_requests(visibility_to_tenants);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_scheduled_date ON public.maintenance_requests(scheduled_date);

-- Step 9: Add comments for documentation
COMMENT ON COLUMN public.maintenance_requests.created_by_role IS 'Role of the user who created this work order. Determines valid status flow.';
COMMENT ON COLUMN public.maintenance_requests.scheduled_date IS 'When maintenance is scheduled to occur. Set when status transitions to scheduled.';
COMMENT ON COLUMN public.maintenance_requests.visibility_to_tenants IS 'Whether this work order is visible to tenants assigned to the property. Default true.';
COMMENT ON COLUMN public.maintenance_requests.internal_notes IS 'Landlord-only notes. Not visible to tenants.';
COMMENT ON COLUMN public.maintenance_requests.public_description IS 'Description visible to tenants. Replaces description field.';

