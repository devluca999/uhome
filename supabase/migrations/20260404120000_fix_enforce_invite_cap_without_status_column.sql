-- Some staging DBs were created without tenant_invites.status; triggers or PostgREST
-- can then fail. Align with initial_schema + fix invite cap to use accepted_at only.

ALTER TABLE public.tenant_invites
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.tenant_invites
SET status = 'accepted'
WHERE accepted_at IS NOT NULL AND status IS NULL;

UPDATE public.tenant_invites
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE public.tenant_invites
  ALTER COLUMN status SET DEFAULT 'pending';

DO $$
BEGIN
  ALTER TABLE public.tenant_invites
    ADD CONSTRAINT tenant_invites_status_check
    CHECK (status IN ('pending', 'accepted', 'expired'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.tenant_invites
  ALTER COLUMN status SET NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_invite_cap()
RETURNS TRIGGER AS $$
DECLARE active_invite_count INTEGER; max_active_invites INTEGER := 5;
BEGIN
  SELECT COUNT(*) INTO active_invite_count FROM public.tenant_invites
  WHERE property_id = NEW.property_id
    AND accepted_at IS NULL
    AND expires_at > NOW();
  IF active_invite_count >= max_active_invites THEN
    RAISE EXCEPTION 'Maximum % active invites per property. Please wait for existing invites to be accepted or expire.', max_active_invites;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
