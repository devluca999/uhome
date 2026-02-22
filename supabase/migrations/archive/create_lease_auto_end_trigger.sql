-- Auto-end leases when lease_end_date passes
-- This trigger automatically sets status to 'ended' when lease_end_date is in the past

-- Step 1: Create function to auto-end leases
CREATE OR REPLACE FUNCTION public.auto_end_leases()
RETURNS TRIGGER AS $$
BEGIN
  -- If lease_end_date is set and has passed, and status is not already 'ended'
  IF NEW.lease_end_date IS NOT NULL 
     AND NEW.lease_end_date < CURRENT_DATE 
     AND NEW.status != 'ended' THEN
    NEW.status = 'ended';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger on UPDATE
DROP TRIGGER IF EXISTS auto_end_leases_update_trigger ON public.leases;
CREATE TRIGGER auto_end_leases_update_trigger
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_end_leases();

-- Step 3: Also check on INSERT (in case lease is created with past end_date)
DROP TRIGGER IF EXISTS auto_end_leases_insert_trigger ON public.leases;
CREATE TRIGGER auto_end_leases_insert_trigger
  BEFORE INSERT ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_end_leases();

-- Step 4: Create function to batch-update expired leases (for scheduled jobs)
CREATE OR REPLACE FUNCTION public.batch_end_expired_leases()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.leases
  SET status = 'ended', updated_at = NOW()
  WHERE status IN ('draft', 'active')
    AND lease_end_date IS NOT NULL
    AND lease_end_date < CURRENT_DATE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Add comment
COMMENT ON FUNCTION public.auto_end_leases() IS 'Automatically sets lease status to ended when lease_end_date passes. Prevents manual oversight.';
COMMENT ON FUNCTION public.batch_end_expired_leases() IS 'Batch function to end all expired leases. Can be called by scheduled jobs or manually.';

