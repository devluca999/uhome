# Stripe Integration Status & Next Steps - uhome
**Date:** March 22, 2025  
**CTO:** P2 Agent  
**Status:** Stripe Integration Analysis Complete

---

## Summary

Based on the STRIPE_HANDOFF_REPORT_AND_CLAUDE_PROMPT.md and Stripe connector analysis, uhome requires **TWO separate Stripe surfaces**:

1. **Stripe Connect** (landlord-to-tenant rent payments)
2. **Subscriptions** (landlord-to-uhome SaaS billing)

**Current State:** Partially implemented, needs reconciliation with Stripe Dashboard

---

## Critical Finding: Webhook Endpoint Clarification Needed

### The Webhook Secret Mystery

You have **ONE `whsec_...` secret** currently stored. This secret is **ONLY VALID for ONE specific webhook endpoint URL** in your Stripe Dashboard.

**To determine which endpoint this secret belongs to:**

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Look at your webhook endpoint(s)
3. Each endpoint shows a URL like:
   - `https://your-supabase-project.supabase.co/functions/v1/stripe-connect-webhook`
   - `https://your-supabase-project.supabase.co/functions/v1/stripe-subscription-webhook`
4. Click on the endpoint to view its signing secret
5. **Match the URL to the function name:**
   - URL contains `stripe-connect-webhook` → Use secret as `STRIPE_WEBHOOK_SECRET`
   - URL contains `stripe-subscription-webhook` → Use secret as `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`

---

## Required Stripe Dashboard Configuration

### 1. Webhook Endpoints (Need TWO separate endpoints)

#### Endpoint A: Connect Webhook
**URL:** `https://<your-project>.supabase.co/functions/v1/stripe-connect-webhook`  
**Events to subscribe:**
- `account.updated`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.succeeded`
- `charge.failed`
- `payout.created`
- `payout.paid`
- `payout.failed`

**Environment Variable Mapping:**
```bash
# In supabase/functions/.env (for local)
STRIPE_WEBHOOK_SECRET=whsec_xxx...  # <-- This secret from THIS endpoint

# In Supabase Dashboard → Edge Functions → Secrets (for hosted)
STRIPE_WEBHOOK_SECRET=whsec_xxx...
```

#### Endpoint B: Subscription Webhook
**URL:** `https://<your-project>.supabase.co/functions/v1/stripe-subscription-webhook`  
**Events to subscribe:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Environment Variable Mapping:**
```bash
# In supabase/functions/.env (for local)
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_yyy...  # <-- This secret from THIS endpoint

# In Supabase Dashboard → Edge Functions → Secrets (for hosted)
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_yyy...
```

---

## 2. Stripe Connect Application Setup

**Status:** NOT YET CONFIGURED (per handoff report)

### Step-by-Step Connect Setup Checklist

#### Step 1: Enable Connect in Stripe Dashboard
1. Go to [Stripe Dashboard → Connect → Get started](https://dashboard.stripe.com/connect)
2. Click "Get started with Connect"
3. Choose **Express** accounts (recommended for property management use case)
4. Complete platform registration:
   - Platform name: uhome
   - Platform URL: your-app-url.com
   - Support email: support@uhome.com (or your email)

#### Step 2: Configure Platform Settings
1. In Connect settings, set:
   - **Account onboarding**: Express
   - **Redirect URLs** (important!):
     - Return URL: `https://your-app.com/landlord/onboarding/complete`
     - Refresh URL: `https://your-app.com/landlord/onboarding`
2. Enable required capabilities:
   - Card payments
   - Bank transfers (for payouts)

#### Step 3: Test Connect with Test Mode
```bash
# In .env.local (for local development frontend)
VITE_ENABLE_STRIPE_CONNECT=true
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your test publishable key

# In supabase/functions/.env (for local Edge Functions)
STRIPE_SECRET_KEY=sk_test_...  # Your test secret key
```

#### Step 4: Test Flow
1. Start local Supabase: `npm run db:start`
2. Start local app: `npm run dev`
3. As landlord:
   - Navigate to Connect onboarding
   - Click "Connect with Stripe"
   - Complete Express onboarding flow
   - Verify redirect back to app
4. As tenant (test mode):
   - Create test PaymentIntent
   - Use test card: `4242 4242 4242 4242`
   - Verify payment succeeds
   - Verify webhook fires (`stripe-connect-webhook`)

---

## 3. Missing Implementation: Checkout Session Creation

### Current Gap

**File:** `src/components/billing/subscription-plans.tsx` (line 99)
```typescript
const handleSelect = (tier: PlanTier) => {
  // TODO: Initiate Stripe Checkout for selected tier
  // Will call a create-checkout-session Edge Function
  console.log('Selected tier:', tier)
}
```

### Required Edge Function

**Create:** `supabase/functions/create-checkout-session/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-09-30.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  try {
    const { tier } = await req.json()
    
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get or create Stripe customer
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = userData?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      })
      customerId = customer.id
      
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Get price ID for tier (you'll need to create products/prices first)
    const priceIds = {
      free: null, // No checkout needed
      landlord: Deno.env.get('STRIPE_PRICE_LANDLORD')!,
      portfolio: Deno.env.get('STRIPE_PRICE_PORTFOLIO')!,
    }

    const priceId = priceIds[tier as keyof typeof priceIds]
    
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), { status: 400 })
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${req.headers.get('origin')}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/settings/billing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        tier,
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

### Frontend Update

**Update:** `src/components/billing/subscription-plans.tsx`

```typescript
const handleSelect = async (tier: PlanTier) => {
  if (tier === currentPlan) return
  
  setLoading(true)
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier })
      }
    )
    
    const { url, error } = await response.json()
    
    if (error) throw new Error(error)
    
    // Redirect to Stripe Checkout
    window.location.href = url
  } catch (error) {
    console.error('Checkout error:', error)
    alert('Failed to start checkout. Please try again.')
  } finally {
    setLoading(false)
  }
}
```

---

## Environment Variables Summary

### `.env.local` (Frontend - Vite)
```bash
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # or pk_live_... for production
VITE_ENABLE_STRIPE_CONNECT=true

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### `supabase/functions/.env` (Local Edge Functions)
```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...  # or sk_live_... for production
STRIPE_PUBLISHABLE_KEY=pk_test_...  # or pk_live_...

# Webhook Signing Secrets (TWO DIFFERENT SECRETS)
STRIPE_WEBHOOK_SECRET=whsec_xxx...  # For Connect webhook endpoint
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_yyy...  # For subscription webhook endpoint

# Price IDs (created in Stripe Dashboard)
STRIPE_PRICE_LANDLORD=price_xxx...  # Monthly price for landlord plan
STRIPE_PRICE_PORTFOLIO=price_yyy...  # Monthly price for portfolio plan

# Supabase
SUPABASE_URL=http://127.0.0.1:55321  # Local Docker
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Supabase Dashboard → Edge Functions → Secrets (Production/Staging)
Same as `supabase/functions/.env` above, but using production values

---

## Database Schema Updates Needed

### Add to `users` table

```sql
-- Add Stripe customer ID column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id 
  ON users(stripe_customer_id);
  
CREATE INDEX IF NOT EXISTS idx_users_stripe_connect_account_id 
  ON users(stripe_connect_account_id);
```

---

## Testing Checklist

### Connect Testing (Test Mode)
- [ ] Create Connect account via `create-connect-account` function
- [ ] Complete Express onboarding flow
- [ ] Verify account shows in Stripe Dashboard → Connect → Accounts
- [ ] Create PaymentIntent via `create-payment-intent` function
- [ ] Complete payment with test card `4242 4242 4242 4242`
- [ ] Verify webhook `payment_intent.succeeded` fires
- [ ] Check payment appears in landlord's Connect dashboard

### Subscription Testing (Test Mode)
- [ ] Click "Upgrade" on subscription plan
- [ ] Verify redirect to Stripe Checkout
- [ ] Complete checkout with test card
- [ ] Verify webhook `checkout.session.completed` fires
- [ ] Verify subscription created in Stripe Dashboard
- [ ] Check subscription status updated in app

---

## Deployment Steps

### 1. Create Stripe Products & Prices
```bash
# Via Stripe Dashboard or API
# Product 1: Landlord Plan ($19/month)
# Product 2: Portfolio Plan ($49/month)
```

### 2. Create Webhook Endpoints
```bash
# In Stripe Dashboard → Developers → Webhooks
# Create TWO endpoints as documented above
# Save both signing secrets
```

### 3. Deploy Edge Function
```bash
# Create the checkout session function
supabase functions deploy create-checkout-session

# Set secrets in Supabase Dashboard
```

### 4. Enable Connect
```bash
# Complete Connect platform registration in Dashboard
```

### 5. Update Environment Variables
```bash
# Add all secrets to production environment
```

---

## Next Actions (In Priority Order)

1. **IMMEDIATE:** Clarify which webhook endpoint your existing `whsec_` is for
   - Go to Stripe Dashboard → Webhooks
   - Identify endpoint URL
   - Map to correct env var name

2. **HIGH:** Create second webhook endpoint (if only one exists)
   - Follow instructions in "Webhook Endpoints" section above
   - Get new signing secret
   - Add to environment variables

3. **HIGH:** Complete Stripe Connect application setup
   - Follow "Step-by-Step Connect Setup Checklist" above
   - Test with Express account in test mode

4. **MEDIUM:** Implement checkout session creation
   - Create Edge Function (code provided above)
   - Update frontend component (code provided above)
   - Test full checkout flow

5. **MEDIUM:** Create Stripe products & prices
   - Create in Dashboard or via API
   - Get price IDs
   - Add to environment variables

6. **LOW:** Test end-to-end flows
   - Follow testing checklist above
   - Verify both Connect and subscription flows work

---

## P2 Recommendation

**Do not deploy Stripe integration to production until:**
1. Both webhook endpoints are configured correctly
2. Connect platform application is approved by Stripe
3. All environment variables are set in both local and production
4. End-to-end testing is complete in test mode

**Estimated time to complete:** 4-6 hours for experienced developer

**Blocking issues for production launch:** None (Stripe can remain feature-flagged off)

---

**Document Status:** Ready for implementation  
**Created by:** P2 CTO Agent  
**Last Updated:** March 22, 2025
