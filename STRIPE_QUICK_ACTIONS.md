# Stripe Integration - Quick Action Guide

**Current Status:** Partially configured, needs reconciliation  
**Time to Complete:** 4-6 hours  
**Blocks Production:** No (feature-flagged off)

---

## IMMEDIATE ACTIONS (30 minutes)

### Action 1: Identify Your Existing Webhook Secret

**WHERE:** [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)

**DO THIS:**
1. Open Stripe Dashboard
2. Go to Developers → Webhooks  
3. Look at your endpoint(s) - you should see URLs like:
   - `https://xxx.supabase.co/functions/v1/stripe-connect-webhook`
   - OR `https://xxx.supabase.co/functions/v1/stripe-subscription-webhook`
4. Click on the endpoint to reveal signing secret
5. **Match URL to function name:**
   - Contains `stripe-connect-webhook` → This is **STRIPE_WEBHOOK_SECRET**
   - Contains `stripe-subscription-webhook` → This is **STRIPE_SUBSCRIPTION_WEBHOOK_SECRET**

**RESULT:** Now you know which variable name to use for your existing `whsec_...`

---

### Action 2: Create Missing Webhook Endpoint

**IF:** You only have ONE webhook endpoint (likely)  
**THEN:** Create the second one

**Steps:**
1. In Stripe Dashboard → Webhooks → Click "Add endpoint"
2. **If you have Connect webhook:**
   - URL: `https://your-project.supabase.co/functions/v1/stripe-subscription-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
3. **If you have Subscription webhook:**
   - URL: `https://your-project.supabase.co/functions/v1/stripe-connect-webhook`  
   - Events: `account.updated`, `payment_intent.*`, `charge.*`, `payout.*`
4. Click "Add endpoint"
5. Click "Reveal" to see signing secret
6. Copy the `whsec_...` value

**RESULT:** Now you have BOTH webhook secrets

---

### Action 3: Update Environment Variables

**Local (Docker):** Update `supabase/functions/.env`

```bash
# Add BOTH secrets
STRIPE_WEBHOOK_SECRET=whsec_xxx...  # Connect endpoint
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_yyy...  # Subscription endpoint

# Your existing secret key
STRIPE_SECRET_KEY=sk_test_...
```

**Production:** Add to Supabase Dashboard → Project Settings → Edge Functions → Secrets

---

## NEXT STEPS (Prioritized)

### Step 1: Enable Stripe Connect (2 hours)

**Goal:** Get Connect working in test mode

1. Go to [Stripe Dashboard → Connect](https://dashboard.stripe.com/connect)
2. Click "Get started"
3. Choose **Express** accounts
4. Set redirect URLs:
   - Return: `https://your-app.com/landlord/onboarding/complete`
   - Refresh: `https://your-app.com/landlord/onboarding`
5. Enable Connect in your app:
   ```bash
   # In .env.local
   VITE_ENABLE_STRIPE_CONNECT=true
   ```
6. Test: Create landlord account → Connect with Stripe → Complete onboarding

---

### Step 2: Implement Checkout Session (2 hours)

**Goal:** Enable subscription upgrades

1. Create `supabase/functions/create-checkout-session/index.ts`
   - **Full code provided in STRIPE_INTEGRATION_ASSESSMENT.md**
2. Update `src/components/billing/subscription-plans.tsx`
   - **Full code provided in STRIPE_INTEGRATION_ASSESSMENT.md**  
3. Deploy function: `supabase functions deploy create-checkout-session`
4. Test: Click "Upgrade" → Complete Stripe Checkout

---

### Step 3: Create Products & Prices (30 minutes)

**Goal:** Set up subscription tiers

1. Stripe Dashboard → Products → Create product
2. **Product 1: Landlord Plan**
   - Name: "uhome Landlord Plan"
   - Price: $19/month
   - Copy price ID: `price_xxx...`
3. **Product 2: Portfolio Plan**
   - Name: "uhome Portfolio Plan"
   - Price: $49/month
   - Copy price ID: `price_yyy...`
4. Add to `supabase/functions/.env`:
   ```bash
   STRIPE_PRICE_LANDLORD=price_xxx...
   STRIPE_PRICE_PORTFOLIO=price_yyy...
   ```

---

### Step 4: Test Everything (1 hour)

**Connect Flow:**
- [ ] Create landlord account in app
- [ ] Click "Connect with Stripe"
- [ ] Complete Express onboarding
- [ ] Verify redirect back to app works
- [ ] Test payment as tenant with card `4242 4242 4242 4242`

**Subscription Flow:**
- [ ] Login as landlord
- [ ] Go to Settings → Billing
- [ ] Click "Upgrade to Landlord Plan"
- [ ] Complete Checkout
- [ ] Verify subscription created
- [ ] Check webhook fired

---

## Quick Reference

### Test Card Numbers
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### Stripe Dashboard Links
- [Webhooks](https://dashboard.stripe.com/webhooks)
- [Connect](https://dashboard.stripe.com/connect)
- [Products](https://dashboard.stripe.com/products)
- [API Keys](https://dashboard.stripe.com/apikeys)

### Supabase Dashboard
- [Edge Functions](https://supabase.com/dashboard/project/_/functions)
- [Secrets](https://supabase.com/dashboard/project/_/settings/functions)

---

## Common Issues

**"Webhook signature verification failed"**
→ Wrong signing secret. Check which endpoint the request came from.

**"Connect not available"**
→ Set `VITE_ENABLE_STRIPE_CONNECT=true` in .env.local

**"Price ID not found"**
→ Create products in Stripe Dashboard first, add price IDs to env

**"Checkout session creation failed"**
→ Check STRIPE_SECRET_KEY is set in supabase/functions/.env

---

## P2 Status

✅ Analysis complete  
✅ Assessment document created  
✅ Implementation code provided  
⏳ Waiting for webhook endpoint clarification  
⏳ Waiting for Connect platform setup  

**Blocking production:** No (Stripe is feature-flagged)  
**Safe to deploy other changes:** Yes

**Full details:** See `STRIPE_INTEGRATION_ASSESSMENT.md`

---

_Created by P2 CTO Agent - March 22, 2025_
