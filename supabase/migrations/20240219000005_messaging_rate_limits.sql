-- Consolidated migration: Messaging columns, notifications schema alignment, rate limits, abuse guards
-- Messages: add sender_role (initial has content not body; we add sender_role for RLS/triggers)
-- Notifications: add lease_id, type, read if missing (initial has title, body, read_at)
-- Rate limits, abuse events, invite cap, upload limit

-- Messages: add sender_role for RLS and triggers
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_role TEXT CHECK (sender_role IN ('tenant', 'landlord', 'system'));
UPDATE public.messages SET sender_role = 'landlord' WHERE sender_role IS NULL;
DO $$ BEGIN ALTER TABLE public.messages ALTER COLUMN sender_role SET NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Notifications: align with create_notifications (add lease_id, type, read if missing)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('message', 'system'));
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "read" BOOLEAN NOT NULL DEFAULT false;

-- Rate limit and abuse tables
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'message', 'invite', 'work_order', 'checklist', 'other')),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own rate limit tracking" ON public.rate_limit_tracking;
CREATE POLICY "Users can view their own rate limit tracking" ON public.rate_limit_tracking FOR SELECT USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_id ON public.rate_limit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_created_at ON public.rate_limit_tracking(created_at);

CREATE TABLE IF NOT EXISTS public.abuse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'message', 'invite', 'work_order', 'checklist', 'other')),
  violation_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  rate_limit_violation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.abuse_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own abuse events" ON public.abuse_events;
CREATE POLICY "Users can view their own abuse events" ON public.abuse_events FOR SELECT USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_abuse_events_user_id ON public.abuse_events(user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_events_created_at ON public.abuse_events(created_at);

-- Invite cap trigger (tenant_invites needs accepted_at - from 20240102000000)
CREATE OR REPLACE FUNCTION public.enforce_invite_cap()
RETURNS TRIGGER AS $$
DECLARE active_invite_count INTEGER; max_active_invites INTEGER := 5;
BEGIN
  SELECT COUNT(*) INTO active_invite_count FROM public.tenant_invites
  WHERE property_id = NEW.property_id AND (accepted_at IS NULL OR status = 'pending') AND expires_at > NOW();
  IF active_invite_count >= max_active_invites THEN
    RAISE EXCEPTION 'Maximum % active invites per property. Please wait for existing invites to be accepted or expire.', max_active_invites;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS enforce_invite_cap_trigger ON public.tenant_invites;
CREATE TRIGGER enforce_invite_cap_trigger BEFORE INSERT ON public.tenant_invites FOR EACH ROW EXECUTE FUNCTION public.enforce_invite_cap();

-- Upload limit trigger
CREATE OR REPLACE FUNCTION public.enforce_daily_upload_cap()
RETURNS TRIGGER AS $$
DECLARE uploads_today INTEGER; max_uploads INTEGER := 50;
BEGIN
  SELECT COUNT(*) INTO uploads_today FROM public.documents WHERE uploaded_by = NEW.uploaded_by AND DATE(created_at) = CURRENT_DATE;
  IF uploads_today >= max_uploads THEN RAISE EXCEPTION 'Daily upload limit of % reached. Please try again tomorrow.', max_uploads; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS enforce_daily_upload_cap_trigger ON public.documents;
CREATE TRIGGER enforce_daily_upload_cap_trigger BEFORE INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_upload_cap();

-- Notes entity type extension
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_entity_type_check;
ALTER TABLE public.notes ADD CONSTRAINT notes_entity_type_check CHECK (entity_type IN ('property', 'unit', 'tenant', 'rent_record', 'expense', 'work_order', 'document'));

NOTIFY pgrst, 'reload schema';
