# Monetization — uhome

## Initial Model
- Subscription-based SaaS
- Landlords pay for the platform
- Tenants use the platform for free

## Proposed Pricing Tiers

### Free Tier
- 1 property
- Up to 3 tenants
- Basic features

### Starter Plan — $15/month ($150/year)
- Up to 10 properties
- Up to 30 tenants
- All core features
- Email support

### Pro Plan — $49/month ($490/year)
- Up to 50 properties
- Up to 200 tenants
- All features
- Priority support
- Advanced analytics

### Enterprise Plan — Custom Pricing
- Unlimited properties
- Unlimited tenants
- Custom features
- Dedicated support
- SLA guarantees

## MVP Constraints
- ✅ No payments processed in-app
- ✅ Manual rent tracking only
- ✅ Stripe integration post-MVP
- ✅ No subscription enforcement (free to use during MVP)

## Post-MVP Monetization Features

### Phase 1: Subscription Billing
- Stripe Checkout integration
- Subscription management
- Usage limit enforcement
- Billing portal

### Phase 2: Rent Collection
- Stripe Connect integration
- Tenant-to-landlord payments
- Automatic rent collection
- Payment history & receipts

### Phase 3: Advanced Features
- Split payments (roommates)
- Late fee automation
- Premium insights & analytics
- CSV exports for accounting
- Automated receipts & tax docs

## Implementation Plan

See [Stripe Integration Plan](stripe-integration-plan.md) for detailed technical implementation.

## Revenue Model

**Primary Revenue:**
- Monthly/annual subscriptions from landlords

**Future Revenue Streams:**
- Payment processing fees (optional, could be passed to Stripe)
- Premium feature add-ons
- Enterprise custom pricing

## Pricing Philosophy

- **Transparent**: Clear, simple pricing tiers
- **Fair**: Reasonable limits for each tier
- **Scalable**: Pricing scales with usage
- **No surprises**: All fees clearly communicated

