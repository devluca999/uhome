-- Enforce lease immutability for ended leases
-- This migration prevents any modifications to ended leases at the database level

-- Step 1: Create function to prevent updates to ended leases
CREATE OR REPLACE FUNCTION public.prevent_ended_lease_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- If the lease was ended, prevent all updates except updated_at
  IF OLD.status = 'ended' THEN
    -- Allow only updated_at to change (automatic timestamp)
    IF NEW.status != OLD.status OR
       NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR
       NEW.property_id IS DISTINCT FROM OLD.property_id OR
       NEW.lease_start_date IS DISTINCT FROM OLD.lease_start_date OR
       NEW.lease_end_date IS DISTINCT FROM OLD.lease_end_date OR
       NEW.lease_type IS DISTINCT FROM OLD.lease_type OR
       NEW.rent_amount IS DISTINCT FROM OLD.rent_amount OR
       NEW.rent_frequency IS DISTINCT FROM OLD.rent_frequency OR
       NEW.security_deposit IS DISTINCT FROM OLD.security_deposit THEN
      RAISE EXCEPTION 'Lease has ended and cannot be modified. Ended leases are immutable.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to enforce immutability
DROP TRIGGER IF EXISTS prevent_ended_lease_updates_trigger ON public.leases;
CREATE TRIGGER prevent_ended_lease_updates_trigger
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ended_lease_updates();

-- Step 3: Prevent status transitions from 'ended' to any other status
CREATE OR REPLACE FUNCTION public.prevent_ended_status_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing status from 'ended' to anything else
  IF OLD.status = 'ended' AND NEW.status != 'ended' THEN
    RAISE EXCEPTION 'Cannot change status from ended. Ended leases are terminal and immutable.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for status transitions
DROP TRIGGER IF EXISTS prevent_ended_status_transitions_trigger ON public.leases;
CREATE TRIGGER prevent_ended_status_transitions_trigger
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ended_status_transitions();

-- Step 5: Update RLS policies to prevent DELETE on ended leases
DROP POLICY IF EXISTS "Landlords can delete leases for their properties" ON public.leases;
-- Note: We don't create a DELETE policy - ended leases cannot be deleted
-- This ensures historical data is preserved

-- Step 6: Add comment
COMMENT ON FUNCTION public.prevent_ended_lease_updates() IS 'Prevents modifications to ended leases. Ended leases are immutable for historical record preservation.';
COMMENT ON FUNCTION public.prevent_ended_status_transitions() IS 'Prevents status transitions from ended. Ended is a terminal status.';

