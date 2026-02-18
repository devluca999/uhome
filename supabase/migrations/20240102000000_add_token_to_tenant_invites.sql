-- Add token and accepted_at columns to tenant_invites for invite acceptance flow
-- Required for /auth/accept-invite/:token and seed script

ALTER TABLE public.tenant_invites
  ADD COLUMN IF NOT EXISTS token TEXT UNIQUE;

ALTER TABLE public.tenant_invites
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing rows with unique tokens (required if any exist)
UPDATE public.tenant_invites
SET token = gen_random_uuid()::text || '-' || substr(md5(random()::text), 1, 8)
WHERE token IS NULL;

-- Make token NOT NULL after backfill
ALTER TABLE public.tenant_invites
  ALTER COLUMN token SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_invites_token ON public.tenant_invites(token);
