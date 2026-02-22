-- Add Stripe Connect tables
-- Supports Phase 4: Payments (Stripe Connect)

-- Stripe Connect accounts table
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL UNIQUE, -- Stripe Connect account ID
  onboarding_status TEXT CHECK (onboarding_status IN ('pending', 'in_progress', 'complete', 'failed')) NOT NULL DEFAULT 'pending',
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id TEXT NOT NULL UNIQUE, -- Stripe Payment Intent ID
  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled', 'refunded')) NOT NULL DEFAULT 'pending',
  amount NUMERIC(10, 2) NOT NULL, -- Amount in cents
  fees NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Stripe fees
  net_amount NUMERIC(10, 2) NOT NULL, -- Net amount after fees
  currency TEXT NOT NULL DEFAULT 'usd',
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment settings table
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE UNIQUE,
  refunds_enabled BOOLEAN NOT NULL DEFAULT true,
  grace_period_days INTEGER NOT NULL DEFAULT 5, -- Days before late fee
  auto_withdraw_enabled BOOLEAN NOT NULL DEFAULT false, -- Auto-withdraw to landlord
  withdraw_schedule TEXT CHECK (withdraw_schedule IN ('daily', 'weekly', 'monthly', 'manual')) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Stripe columns to rent_records
ALTER TABLE public.rent_records
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'overdue', 'failed')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_property_id ON public.stripe_connect_accounts(property_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_account_id ON public.stripe_connect_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON public.payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_settings_property_id ON public.payment_settings(property_id);

-- RLS Policies
-- Stripe Connect accounts: Property owners can view their own
CREATE POLICY "Landlords can view their own Connect accounts"
  ON public.stripe_connect_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = stripe_connect_accounts.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can manage their own Connect accounts"
  ON public.stripe_connect_accounts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = stripe_connect_accounts.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Payments: Tenants can view their own payments, landlords can view property payments
CREATE POLICY "Tenants can view their own payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.id = payments.tenant_id
      AND tenants.user_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can view property payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = payments.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Payment settings: Property owners can manage their own
CREATE POLICY "Landlords can view their own payment settings"
  ON public.payment_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = payment_settings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can manage their own payment settings"
  ON public.payment_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = payment_settings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE public.stripe_connect_accounts IS 'Stripe Connect accounts for property-scoped payment processing. Links landlords to Stripe for rent collection.';
COMMENT ON TABLE public.payments IS 'Payment records from Stripe. Tracks payment intents, status, fees, and net amounts.';
COMMENT ON TABLE public.payment_settings IS 'Configurable payment settings per property (refunds, grace periods, withdrawal schedules).';
