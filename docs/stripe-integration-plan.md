# Stripe Integration Plan — haume

## Overview

Stripe integration will enable two payment flows:
1. **Subscription Billing** — Landlords pay for the SaaS subscription
2. **Rent Collection** — Tenants pay rent to landlords via Stripe Connect

## Current Status

**MVP Constraints:**
- ✅ No payment processing in-app
- ✅ Manual rent tracking only
- ✅ Stripe integration deferred to post-MVP

**Planned Features:**
- Subscription-based SaaS ($15/month for up to 10 households)
- Stripe Connect for rent collection
- Split payments (if needed)
- Premium insights (paid feature)

---

## Part 1: Subscription Billing (SaaS)

### Architecture Overview

**Flow:**
1. Landlord signs up → Free tier or trial period
2. Landlord reaches property limit → Subscription prompt
3. Landlord subscribes via Stripe Checkout
4. Subscription status tracked in Supabase
5. Access controlled based on subscription status

### Database Schema Additions

```sql
-- Add subscription tracking to users table
ALTER TABLE public.users
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN subscription_status TEXT DEFAULT 'free', -- free, trialing, active, past_due, canceled
ADD COLUMN subscription_tier TEXT DEFAULT 'free', -- free, starter, pro, enterprise
ADD COLUMN current_period_end TIMESTAMPTZ,
ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT false;

-- Create subscriptions table for history
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscription_limits table
CREATE TABLE public.subscription_limits (
  tier TEXT PRIMARY KEY,
  max_properties INTEGER NOT NULL,
  max_tenants INTEGER NOT NULL,
  features JSONB DEFAULT '{}'::jsonb,
  price_monthly_cents INTEGER,
  price_yearly_cents INTEGER
);

-- Insert default tiers
INSERT INTO public.subscription_limits (tier, max_properties, max_tenants, price_monthly_cents, price_yearly_cents) VALUES
  ('free', 1, 3, 0, 0),
  ('starter', 10, 30, 1500, 15000), -- $15/month, $150/year
  ('pro', 50, 200, 4900, 49000), -- $49/month, $490/year
  ('enterprise', -1, -1, NULL, NULL); -- Unlimited, custom pricing
```

### Stripe Setup

**Required Stripe Products & Prices:**
- Starter Plan: $15/month (or $150/year)
- Pro Plan: $49/month (or $490/year)
- Create in Stripe Dashboard → Products

**Webhook Events to Handle:**
- `checkout.session.completed` — Subscription created
- `customer.subscription.updated` — Subscription changed
- `customer.subscription.deleted` — Subscription canceled
- `invoice.payment_succeeded` — Payment successful
- `invoice.payment_failed` — Payment failed

### Implementation Steps

1. **Install Stripe SDK**
   ```bash
   npm install @stripe/stripe-js
   ```

2. **Add Environment Variables**
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_... (server-side only)
   STRIPE_WEBHOOK_SECRET=whsec_... (server-side only)
   ```

3. **Create Stripe Context/Hook**
   - `src/contexts/stripe-context.tsx` — Stripe instance provider
   - `src/hooks/use-subscription.ts` — Subscription status hook

4. **Create Subscription Components**
   - `src/components/billing/subscription-plans.tsx` — Plan selection
   - `src/components/billing/billing-settings.tsx` — Manage subscription
   - `src/pages/landlord/billing.tsx` — Billing page

5. **Add Route Protection**
   - Check subscription limits before allowing property creation
   - Show upgrade prompts when limits reached

6. **Webhook Handler**
   - Create serverless function (Vercel/Netlify) or use Supabase Edge Function
   - Update subscription status in database on webhook events

### File Structure

```
src/
├── components/
│   └── billing/
│       ├── subscription-plans.tsx
│       ├── billing-settings.tsx
│       └── usage-limits.tsx
├── pages/
│   └── landlord/
│       └── billing.tsx
├── hooks/
│   └── use-subscription.ts
├── lib/
│   └── stripe/
│       ├── client.ts
│       └── checkout.ts
└── contexts/
    └── stripe-context.tsx

supabase/
└── functions/
    └── stripe-webhook/
        └── index.ts
```

---

## Part 2: Rent Collection (Stripe Connect)

### Architecture Overview

**Flow:**
1. Landlord connects Stripe account via Stripe Connect
2. Tenant initiates rent payment via app
3. Payment processed through landlord's Stripe account
4. Rent record automatically updated
5. Landlord receives funds (minus Stripe fees)

### Database Schema Additions

```sql
-- Add Stripe Connect fields to users table
ALTER TABLE public.users
ADD COLUMN stripe_connect_account_id TEXT,
ADD COLUMN stripe_connect_onboarding_complete BOOLEAN DEFAULT false;

-- Add payment fields to rent_records
ALTER TABLE public.rent_records
ADD COLUMN stripe_payment_intent_id TEXT,
ADD COLUMN stripe_payment_status TEXT, -- pending, succeeded, failed
ADD COLUMN payment_method TEXT, -- card, bank_transfer, etc.
ADD COLUMN paid_at TIMESTAMPTZ;

-- Create payments table for detailed tracking
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rent_record_id UUID REFERENCES public.rent_records(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  status TEXT NOT NULL, -- pending, succeeded, failed, refunded
  payment_method TEXT,
  fee_cents INTEGER, -- Stripe fee
  net_amount_cents INTEGER, -- Amount after fees
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTY,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Stripe Connect Setup

**Connect Account Types:**
- **Express Accounts** (Recommended) — Easiest onboarding, landlord manages own account
- **Standard Accounts** — More control, more complex

**Onboarding Flow:**
1. Landlord clicks "Enable Rent Collection"
2. Redirect to Stripe Connect Onboarding
3. Complete KYC/bank details
4. Return to app, account connected
5. Rent collection enabled

### Implementation Steps

1. **Install Stripe Connect SDK**
   ```bash
   # Already have @stripe/stripe-js, no additional install needed
   ```

2. **Add Stripe Connect Components**
   - `src/components/billing/connect-account.tsx` — Connect onboarding
   - `src/components/billing/rent-payment.tsx` — Payment form
   - `src/components/tenant/pay-rent.tsx` — Tenant payment UI

3. **Create Payment Flow**
   - Tenant clicks "Pay Rent"
   - Create Payment Intent via backend
   - Show Stripe Payment Element
   - Confirm payment
   - Update rent record status

4. **Webhook Events**
   - `payment_intent.succeeded` — Update rent record
   - `payment_intent.payment_failed` — Notify tenant
   - `account.updated` — Sync Connect account status

### File Structure

```
src/
├── components/
│   └── billing/
│       ├── connect-account.tsx
│       └── rent-payment.tsx
├── pages/
│   └── tenant/
│       └── pay-rent.tsx
├── hooks/
│   └── use-rent-payment.ts
└── lib/
    └── stripe/
        └── connect.ts

supabase/
└── functions/
    ├── create-payment-intent/
    │   └── index.ts
    └── stripe-connect-webhook/
        └── index.ts
```

---

## Security Considerations

### Subscription Billing
- ✅ Server-side webhook verification (never trust client)
- ✅ Subscription limits enforced server-side (RLS policies)
- ✅ Stripe webhook signature verification
- ✅ Rate limiting on subscription endpoints

### Rent Collection
- ✅ Payment Intents created server-side only
- ✅ Never expose Stripe secret keys to client
- ✅ RLS policies prevent unauthorized payment access
- ✅ Tenant can only pay their own rent
- ✅ Landlord can only view payments for their properties

---

## Pricing & Fees

### Subscription Pricing
- **Free**: 1 property, 3 tenants
- **Starter**: $15/month — 10 properties, 30 tenants
- **Pro**: $49/month — 50 properties, 200 tenants
- **Enterprise**: Custom pricing — Unlimited

### Rent Collection Fees
- Standard Stripe Connect fees apply
- Transparent to tenant (fees included in rent amount)
- Landlord receives net amount after fees
- Fee structure: 2.9% + $0.30 per transaction (US)

---

## Implementation Phases

### Phase 1: Subscription Billing (MVP+)
1. ✅ Add subscription schema
2. ✅ Create Stripe products/prices
3. ✅ Build subscription UI
4. ✅ Implement checkout flow
5. ✅ Webhook handler for subscription events
6. ✅ Enforce subscription limits
7. ✅ Billing management page

### Phase 2: Rent Collection (MVP++)
1. ✅ Add payment schema
2. ✅ Stripe Connect setup
3. ✅ Connect onboarding flow
4. ✅ Rent payment UI
5. ✅ Payment Intent creation
6. ✅ Webhook handler for payments
7. ✅ Payment history view
8. ✅ Receipt generation

### Phase 3: Advanced Features
1. Automatic rent collection (recurring payments)
2. Payment reminders
3. Late fee calculation
4. Payment dispute handling
5. Multi-currency support
6. ACH/bank transfer support

---

## Testing Strategy

### Subscription Billing
- Test with Stripe test cards
- Test subscription lifecycle (create, update, cancel)
- Test limit enforcement
- Test webhook handling

### Rent Collection
- Test Connect account onboarding
- Test payment flow with test cards
- Test payment failures
- Test refunds
- Test webhook reliability

---

## Documentation Needed

- [ ] Stripe account setup guide
- [ ] Subscription pricing page
- [ ] Billing FAQ
- [ ] Payment troubleshooting
- [ ] Tax/compliance considerations (1099-K, etc.)

---

## Estimated Timeline

- **Subscription Billing**: 2-3 weeks
- **Rent Collection**: 3-4 weeks
- **Testing & Polish**: 1-2 weeks
- **Total**: 6-9 weeks post-MVP

---

## Next Steps

1. Create Stripe account (test mode)
2. Set up Stripe products/prices
3. Design subscription UI
4. Plan serverless function architecture (Vercel/Netlify/Supabase Edge Functions)
5. Begin Phase 1 implementation

---

## References

- [Stripe Billing Documentation](https://stripe.com/docs/billing)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Cards](https://stripe.com/docs/testing)

