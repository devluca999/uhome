# Stripe integration — handoff report and Claude follow-up prompt

## Purpose

Single place to summarize **where the uhome (haume) repo stands on Stripe**, what the **human operator** has configured so far, and a **copy-paste prompt** for Claude (with Stripe connector) to drive the next steps without re-discovering context.

---

## A. Current state in the codebase (facts)

### Two separate Stripe surfaces

| Surface | Purpose | Edge Functions (examples) | Webhook env var |
|--------|---------|---------------------------|-----------------|
| **Stripe Connect** | Landlord receives rent; PaymentIntents on connected accounts | `create-connect-account`, `create-payment-intent`, `stripe-connect-webhook` | `STRIPE_WEBHOOK_SECRET` (must match the **Connect** webhook endpoint’s signing secret) |
| **SaaS subscriptions** | Landlord pays uhome (Checkout / subscriptions) | `stripe-subscription-webhook` | `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` (must match the **subscription** webhook endpoint’s signing secret) |

These are **not interchangeable**: each Dashboard webhook endpoint has its **own** `whsec_...`.

### Connect is feature-flagged off by default

- Client flag: `VITE_ENABLE_STRIPE_CONNECT` must be `'true'` in `.env.local` (Vite) for pay-rent / Connect onboarding UI.
- See [`src/lib/feature-flags.ts`](../src/lib/feature-flags.ts) and usages in [`docs/environment-variables.md`](environment-variables.md).

### Local Supabase (Docker) vs `.env.local`

- **Vite / browser:** reads project root **`.env.local`** (`VITE_*`, feature flags, `VITE_STRIPE_PUBLISHABLE_KEY`).
- **Edge Functions when using `supabase start`:** custom secrets (including `STRIPE_SECRET_KEY`, webhook secrets) are loaded from **`supabase/functions/.env`**, not from `.env.local`. Template: [`supabase/functions/.env.example`](../supabase/functions/.env.example). Documented in [`docs/environment-variables.md`](environment-variables.md) (section *Local Docker*).

### Subscription Checkout (landlord billing)

- Webhook handler exists: [`supabase/functions/stripe-subscription-webhook/index.ts`](../supabase/functions/stripe-subscription-webhook/index.ts).
- **Creating** Checkout sessions from the app was identified as a gap: [`src/components/billing/subscription-plans.tsx`](../src/components/billing/subscription-plans.tsx) still had a TODO to call a `create-checkout-session`-style flow (plan item; verify tree before implementing).

---

## B. Operator context (this project’s attempts so far)

- **Stripe Connect** is **not** fully set up in Stripe (no Connect application / onboarding flow completed in Dashboard to the point of live test charges).
- **One** webhook signing secret is available and stored in **`.env.local`**. That secret is only valid for **one** Stripe webhook endpoint URL. It must be wired to the correct env var:
  - If that endpoint URL targets **`stripe-connect-webhook`** → use as **`STRIPE_WEBHOOK_SECRET`** (in `supabase/functions/.env` for local functions).
  - If it targets **`stripe-subscription-webhook`** → use as **`STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`**.
  - If unsure which function the URL points to, **open the endpoint in Stripe Dashboard** and compare the URL path to the deployed/local function name.
- **Staging** Supabase project: Stripe test secrets were **not** configured there; **production** project had prod-oriented config. **Local Docker** is the intended place for iterative test-mode work if staging is empty.
- **Claude** is connected to Stripe via a **connector** (read/analyze Dashboard); use the follow-up prompt below so Claude can align Dashboard state with this repo’s two-webhook model.

---

## C. Common pitfalls (short)

1. Putting **`sk_test_...` in `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`** — wrong; that env var must be **`whsec_...`** from the subscription webhook endpoint.
2. Using **one `whsec`** for both Connect and subscription webhooks — wrong unless Stripe is misconfigured; normally **two endpoints → two secrets**.
3. Secrets only in **`.env.local`** while Edge Functions return “not configured” locally — add the same Stripe secrets to **`supabase/functions/.env`** and restart `supabase start`.
4. Connect UI never appears — set **`VITE_ENABLE_STRIPE_CONNECT=true`** and ensure **`VITE_STRIPE_PUBLISHABLE_KEY`** is set; still need Connect enabled in Stripe and platform settings per their docs.

---

## D. Copy-paste: follow-up prompt for Claude (Stripe connector)

Use this after attaching or pointing Claude at this repo (`haume`) and this file.

```text
You have access to my Stripe account via connector. Our app is the uhome/haume monorepo.

Read docs/STRIPE_HANDOFF_REPORT_AND_CLAUDE_PROMPT.md for full context.

Goals:
1) Reconcile Stripe Dashboard with the codebase’s TWO webhook flows:
   - Connect: stripe-connect-webhook → env STRIPE_WEBHOOK_SECRET (whsec for THAT endpoint URL only).
   - Subscriptions: stripe-subscription-webhook → env STRIPE_SUBSCRIPTION_WEBHOOK_SECRET (whsec for THAT endpoint URL only).
   List which webhook endpoints exist in my Dashboard, their URLs, and which events they subscribe to. Flag duplicates, wrong URLs, or missing endpoints.

2) Connect setup gap: I have not fully set up Stripe Connect. Using Stripe’s current Connect model (Standard/Express/etc. as appropriate), give a ordered checklist to go from “no Connect” to “test mode landlord can onboard and tenant can complete a test PaymentIntent” for this codebase (functions: create-connect-account, create-payment-intent, stripe-connect-webhook). Include Dashboard toggles, redirect URLs, and test account steps.

3) Tell me exactly which secrets belong in:
   - .env.local (VITE_* and flags)
   - supabase/functions/.env (local Docker Edge Functions)
   vs hosted Supabase Edge secrets for staging/production.

4) If my single existing whsec was created for the wrong endpoint, say whether to add a second endpoint or rotate, and how to name vars so Connect vs subscription don’t conflict.

Output: (a) Dashboard findings, (b) step-by-step next actions, (c) a minimal env snippet with placeholder values only (no real secrets in chat).
```

---

## E. Relationship to other docs

- [`docs/stripe-integration-plan.md`](stripe-integration-plan.md) — longer product/technical plan.
- [`docs/environment-variables.md`](environment-variables.md) — authoritative env tables and local Docker note.
