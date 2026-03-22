-- Migration: update_subscription_tiers
-- Applied: 2026-03-22
-- Replaces placeholder free/pro tiers with final 3-tier structure:
-- free ($0), landlord ($29/mo), portfolio ($59/mo)
-- Also adds check constraints on plan and status columns.

DELETE FROM public.subscription_limits;

INSERT INTO public.subscription_limits
  (tier, max_properties, max_tenants, max_collaborators, price_monthly_cents, price_yearly_cents, features)
VALUES
  ('free',      1,  -1, 0, 0,     0,     '{"collaborator_invites": false, "branded_receipts": false, "csv_export": false, "advanced_financials": false, "storage_mb": 500}'::jsonb),
  ('landlord', 10,  -1, 1, 2900,  29000, '{"collaborator_invites": true,  "branded_receipts": true,  "csv_export": false, "advanced_financials": true,  "storage_mb": 5120}'::jsonb),
  ('portfolio', 30, -1, 3, 5900,  59000, '{"collaborator_invites": true,  "branded_receipts": true,  "csv_export": true,  "advanced_financials": true,  "storage_mb": 20480}'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  max_properties      = EXCLUDED.max_properties,
  max_collaborators   = EXCLUDED.max_collaborators,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  price_yearly_cents  = EXCLUDED.price_yearly_cents,
  features            = EXCLUDED.features;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'landlord', 'portfolio'));

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'));
