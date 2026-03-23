# Subscription Model

## Overview

uhome uses **organization-level** subscriptions. Each organization has one subscription that determines plan features, property limits, and collaborator access.

## Plan Tiers

### Free — $0/month
- 1 property, unlimited tenants
- 0 collaborators (owner only)
- 500MB storage
- uhome-branded receipts
- Core features: rent tracking, maintenance, documents, tasks

### Landlord — $29/month ($290/year)
- 10 properties, unlimited tenants
- 1 collaborator (family member, partner, assistant)
- 5GB storage
- Branded receipts (no uhome branding)
- Advanced financial dashboards
- All Free features

### Portfolio — $59/month ($590/year)
- 30 properties, unlimited tenants
- 3 collaborators
- 20GB storage
- CSV export
- Priority support
- All Landlord features

## Feature Gate Matrix

| Feature | Free | Landlord | Portfolio |
|---------|------|----------|-----------|
| Properties | 1 | 10 | 30 |
| Tenants | Unlimited | Unlimited | Unlimited |
| Collaborators | 0 | 1 | 3 |
| Branded receipts | ❌ | ✅ | ✅ |
| Advanced financials | ❌ | ✅ | ✅ |
| CSV export | ❌ | ❌ | ✅ |
| Storage | 500MB | 5GB | 20GB |

## Key Principles

- Subscriptions belong to **organizations**, not users
- Tenants never count toward limits and are always free
- Only **owners** can manage billing — collaborators cannot
- Annual billing = 2 months free (~17% discount)
- Stripe is the source of truth for subscription status — Supabase mirrors it via webhook

## Subscription Status Values

- `active` — paid and current
- `trialing` — in trial period (future)
- `past_due` — payment failed, Stripe retrying
- `canceled` — subscription ended, org reverts to free
- `incomplete` — payment setup incomplete
- `incomplete_expired` — payment setup expired
- `unpaid` — final state after all retries failed

## Implementation Files

| File | Purpose |
|------|---------|
| `src/lib/stripe/plans.ts` | Single source of truth for plan config, limits, helpers |
| `src/hooks/use-subscription.ts` | React hook for current org subscription state |
| `src/components/billing/subscription-plans.tsx` | Plan selection UI |
| `supabase/functions/stripe-subscription-webhook/` | Webhook handler for lifecycle events |
| `supabase/migrations/20260322000003_update_subscription_tiers.sql` | DB migration |

## Stripe Setup (Required Before Launch)

1. Create products in Stripe Dashboard:
   - **uhome Landlord** — $29/month + $290/year prices
   - **uhome Portfolio** — $59/month + $590/year prices
2. Copy price IDs into `src/lib/stripe/plans.ts` → `STRIPE_PRICE_TO_PLAN`
3. Copy same price IDs into `supabase/functions/stripe-subscription-webhook/index.ts` → `PRICE_TO_PLAN`
4. Register webhook endpoint in Stripe Dashboard:
   - URL: `https://vtucrtvajbmtedroevlz.supabase.co/functions/v1/stripe-subscription-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
5. Add `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` to Supabase secrets

## Related Docs
- [docs/stripe-integration-plan.md](./stripe-integration-plan.md)
- [forClaude/decisions_log.md](../forClaude/decisions_log.md)
