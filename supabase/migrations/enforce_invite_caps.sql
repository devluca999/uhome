-- Enforce Invite Caps via Database Triggers
-- Hard caps that cannot be bypassed even if Edge Functions are skipped
-- Run this in Supabase SQL Editor

-- ============================================================================
-- FUNCTION: Enforce Maximum Active Invites Per Property
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_invite_cap()
RETURNS TRIGGER AS $$
DECLARE
  active_invite_count INTEGER;
  max_active_invites INTEGER := 5; -- Hard cap: 5 active invites per property
BEGIN
  -- Count active invites for this property (not accepted, not expired)
  SELECT COUNT(*) INTO active_invite_count
  FROM public.tenant_invites
  WHERE property_id = NEW.property_id
    AND accepted_at IS NULL
    AND expires_at > NOW();

  -- If we're adding a new invite, check if we'd exceed the limit
  IF active_invite_count >= max_active_invites THEN
    RAISE EXCEPTION 'Maximum % active invites per property. Please wait for existing invites to be accepted or expire.', max_active_invites;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to enforce invite cap on insert
DROP TRIGGER IF EXISTS enforce_invite_cap_trigger ON public.tenant_invites;
CREATE TRIGGER enforce_invite_cap_trigger
  BEFORE INSERT ON public.tenant_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invite_cap();

-- ============================================================================
-- FUNCTION: Auto-Expire Old Invites
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_expire_old_invites()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be called periodically to expire old invites
  -- For now, we rely on application logic to check expires_at
  -- But we can add a trigger if needed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.enforce_invite_cap() IS 'Enforces maximum 5 active invites per property. Cannot be bypassed.';

