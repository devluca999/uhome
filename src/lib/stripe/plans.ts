/**
 * uhome Subscription Plans
 *
 * Trial-only model: every user starts on a 30-day trial of the Landlord plan.
 * After trial ends without payment, plan becomes 'free' (locked state — not a usable tier).
 * The 'free' tier exists only as a DB fallback — it is never shown as a plan option.
 *
 * Keep in sync with public.subscription_limits in the database.
 */

export type PlanTier = 'free' | 'landlord' | 'portfolio'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'

export interface PlanConfig {
  tier: PlanTier
  name: string
  description: string
  monthlyPrice: number // in cents
  yearlyPrice: number // in cents
  maxProperties: number // -1 = unlimited
  maxCollaborators: number
  storageMb: number
  features: {
    collaboratorInvites: boolean
    brandedReceipts: boolean
    csvExport: boolean
    advancedFinancials: boolean
  }
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  /**
   * 'free' = post-trial locked state. Not a selectable plan.
   * Users land here only after trial expires without upgrading.
   * Limits are minimal to prevent abuse, not to provide a usable free product.
   */
  free: {
    tier: 'free',
    name: 'Trial Ended',
    description: 'Your free trial has ended. Add a payment method to continue.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxProperties: 0,
    maxCollaborators: 0,
    storageMb: 0,
    features: {
      collaboratorInvites: false,
      brandedReceipts: false,
      csvExport: false,
      advancedFinancials: false,
    },
  },
  landlord: {
    tier: 'landlord',
    name: 'Landlord',
    description: 'For independent landlords managing multiple properties',
    monthlyPrice: 2999,
    yearlyPrice: 28800, // ~$240/yr, 2 months free
    maxProperties: 10,
    maxCollaborators: 1,
    storageMb: 5120,
    features: {
      collaboratorInvites: true,
      brandedReceipts: true,
      csvExport: false,
      advancedFinancials: true,
    },
  },
  portfolio: {
    tier: 'portfolio',
    name: 'Portfolio',
    description: 'For serious landlords managing a property portfolio',
    monthlyPrice: 5999,
    yearlyPrice: 57600, // ~$480/yr, 2 months free
    maxProperties: 30,
    maxCollaborators: 3,
    storageMb: 20480,
    features: {
      collaboratorInvites: true,
      brandedReceipts: true,
      csvExport: true,
      advancedFinancials: true,
    },
  },
}

/**
 * Maps Stripe price IDs to internal plan tiers.
 */
export const STRIPE_PRICE_TO_PLAN: Record<string, PlanTier> = {
  // Monthly
  price_1TFftVQmn5YLaXLqqVaazjQW: 'landlord',
  price_1TFfuzQmn5YLaXLqdoVRBqjn: 'portfolio',
  // Yearly
  price_1TG6gUQmn5YLaXLqOnKqWzs5: 'landlord',
  price_1TG6jNQmn5YLaXLqNMdEOdk6: 'portfolio',
}

export function getPlanFromPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return 'free'
  return STRIPE_PRICE_TO_PLAN[priceId] ?? 'landlord'
}

export function formatPrice(cents: number, interval: 'month' | 'year' = 'month'): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}/${interval}`
}

export function isFeatureAvailable(plan: PlanTier, feature: keyof PlanConfig['features']): boolean {
  return PLANS[plan].features[feature]
}

export function canAddProperty(plan: PlanTier, currentCount: number): boolean {
  const limit = PLANS[plan].maxProperties
  if (limit === -1) return true
  return currentCount < limit
}

export function canAddCollaborator(plan: PlanTier, currentCount: number): boolean {
  return currentCount < PLANS[plan].maxCollaborators
}

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing'
}

export function isPlanPaid(tier: PlanTier): boolean {
  return tier !== 'free'
}

/** True if the user's access is locked (trial expired, no payment) */
export function isAccountLocked(plan: PlanTier, status: SubscriptionStatus | null): boolean {
  if (plan === 'free') return true
  if (!status) return false
  return status === 'canceled' || status === 'incomplete_expired' || status === 'unpaid'
}

/** True if user is in trial — show trial countdown UI */
export function isTrialing(status: SubscriptionStatus | null): boolean {
  return status === 'trialing'
}
