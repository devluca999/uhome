-- Migration: add_missing_stripe_columns
-- Applied: 2026-03-22
-- Adds missing Stripe-related columns to subscriptions and payments tables,
-- and creates the subscription_limits lookup table.

-- subscriptions: missing Stripe lifecycle columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- payments: missing columns (paid_at was referenced in webhook handler but didn't exist)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rent_record_id UUID REFERENCES public.rent_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Index for rent_record_id lookups on payments
CREATE INDEX IF NOT EXISTS idx_payments_rent_record_id
  ON public.payments(rent_record_id)
  WHERE rent_record_id IS NOT NULL;

-- subscription_limits: plan tier config table
CREATE TABLE IF NOT EXISTS public.subscription_limits (
  tier TEXT PRIMARY KEY,
  max_properties INTEGER NOT NULL DEFAULT -1,
  max_tenants INTEGER NOT NULL DEFAULT -1,
  max_collaborators INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '{}'::jsonb,
  price_monthly_cents INTEGER,
  price_yearly_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subscription limits"
  ON public.subscription_limits FOR SELECT
  USING (true);

-- Seed default tiers (idempotent)
INSERT INTO public.subscription_limits
  (tier, max_properties, max_tenants, max_collaborators, price_monthly_cents, price_yearly_cents, features)
VALUES
  ('free', -1, -1, 0, 0, 0, '{"collaborator_invites": false}'::jsonb),
  ('pro',  -1, -1, 1, 1500, 15000, '{"collaborator_invites": true}'::jsonb)
ON CONFLICT (tier) DO NOTHING;
