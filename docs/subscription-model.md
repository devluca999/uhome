# Subscription Model

## Overview

Subscriptions in uhome are **organization-level**, not user-level. Each organization (landlord workspace) has one subscription that determines plan features and limits.

## Subscription Ownership

- **Subscriptions belong to organizations**, not individual users
- Each organization has exactly one subscription
- Subscription determines what features the organization can access
- Billing is tied to the organization

## Plan Tiers

### Free Plan
- Default plan for all new organizations
- Basic property management features
- **No collaborator invites** (owner only)
- Suitable for individual landlords

### Pro Plan
- All Free plan features
- **Enables collaborator invites** (1 collaborator max)
- Hard cap: 2 landlord-side users (owner + 1 collaborator)
- Intended for partners, spouses, family members, or trusted assistants

## Subscription Features

### What Pro Plan Enables

1. **Collaborator Invites**
   - Can invite one additional landlord-side user
   - Collaborator can manage properties, tenants, maintenance
   - Collaborator cannot manage billing or delete organization

2. **What Pro Plan Does NOT Enable**
   - Unlimited collaborators (hard cap of 2)
   - Tenant invites (always free and unlimited)
   - Per-seat billing (not in MVP)
   - Role matrix UI (not in MVP)

### What's Always Free

- **Tenant invites** - Always allowed, unlimited
- **Tenant accounts** - Never count toward plan limits
- **Tenant collaboration** - Multiple tenant users per household (always allowed)

## Billing Access

### Who Can Manage Billing

- **Only owners** can view and manage subscriptions
- **Collaborators cannot** access billing settings
- This is enforced via RLS policies

### Billing Features (Future)

- Stripe integration for payment processing
- Subscription management (upgrade/downgrade)
- Billing history
- Payment method management

## Subscription Status

Subscriptions can have the following statuses:

- `active` - Subscription is active and paid
- `canceled` - Subscription has been canceled
- `past_due` - Payment failed, subscription in grace period
- `trialing` - In trial period (future feature)
- `incomplete` - Payment setup incomplete
- `incomplete_expired` - Payment setup expired

## Plan Limits

### Free Plan Limits
- Properties: No hard limit (application-level limits may apply)
- Tenants: No limit (tenants don't count)
- Collaborators: 0 (owner only)

### Pro Plan Limits
- Properties: No hard limit (application-level limits may apply)
- Tenants: No limit (tenants don't count)
- Collaborators: 1 (owner + 1 collaborator = 2 max landlord-side users)

## Key Principles

1. **Subscriptions are organization-level** - One subscription per organization
2. **Pro gates collaborator invites** - Not tenant features
3. **Tenant accounts never count** - Unlimited tenant users
4. **Hard cap on collaborators** - 2 landlord-side users max (Pro plan)
5. **Billing is owner-only** - Collaborators cannot access billing

## Future Considerations

- Per-seat billing for larger teams
- Enterprise plans with custom limits
- Annual billing discounts
- Team plans with role matrix UI

