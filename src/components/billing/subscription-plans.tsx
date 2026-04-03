import { useState } from 'react'
import { PLANS, type PlanTier } from '@/lib/stripe/plans'
import { useSubscription } from '@/hooks/use-subscription'
import { supabase } from '@/lib/supabase/client'
import { Sparkles } from 'lucide-react'

const SELECTABLE_TIERS: PlanTier[] = ['landlord', 'portfolio']

interface PlanCardProps {
  tier: PlanTier
  currentPlan: PlanTier
  onSelect: (tier: PlanTier) => void
  loading?: boolean
}

function PlanCard({ tier, currentPlan, onSelect, loading }: PlanCardProps) {
  const plan = PLANS[tier]
  const isCurrent = tier === currentPlan
  const isPopular = tier === 'landlord'

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-all
      ${isCurrent
        ? 'border-primary bg-primary/5 shadow-md'
        : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
      }`}
    >
      {isCurrent && (
        <span className="absolute top-4 right-4 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Current plan
        </span>
      )}
      {isPopular && !isCurrent && (
        <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3" /> Popular
        </span>
      )}

      <div>
        <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-foreground">
          ${plan.monthlyPrice / 100}
        </span>
        <span className="text-sm text-muted-foreground">/month</span>
      </div>

      <ul className="flex flex-col gap-2 text-sm text-muted-foreground flex-1">
        <li>
          <span className="text-foreground font-medium">{plan.maxProperties}</span> properties
        </li>
        <li>
          <span className="text-foreground font-medium">Unlimited</span> tenants
        </li>
        <li>
          <span className="text-foreground font-medium">
            {plan.maxCollaborators === 0 ? 'No' : plan.maxCollaborators}
          </span>{' '}
          collaborator{plan.maxCollaborators !== 1 ? 's' : ''}
        </li>
        {plan.features.advancedFinancials && (
          <li className="text-foreground">✓ Advanced financials</li>
        )}
        {plan.features.brandedReceipts && (
          <li className="text-foreground">✓ Branded receipts</li>
        )}
        {plan.features.csvExport && (
          <li className="text-foreground">✓ CSV export</li>
        )}
        <li>
          <span className="text-foreground font-medium">
            {plan.storageMb >= 1024 ? `${plan.storageMb / 1024}GB` : `${plan.storageMb}MB`}
          </span>{' '}
          storage
        </li>
      </ul>

      <button
        onClick={() => onSelect(tier)}
        disabled={isCurrent || loading}
        className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all
          ${isCurrent
            ? 'bg-muted text-muted-foreground cursor-default'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
      >
        {isCurrent ? 'Current plan' : 'Upgrade'}
      </button>
    </div>
  )
}

export function SubscriptionPlans() {
  const { plan: currentPlan, isTrialing, daysLeftInTrial, loading } = useSubscription()
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const handleSelect = async (tier: PlanTier) => {
    if (tier === currentPlan || tier === 'free') return
    setCheckoutLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tier }),
        }
      )
      const { url, error } = await response.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      console.error('[Checkout] Failed to start checkout:', err)
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        {[0, 1].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card h-80" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Choose your plan</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isTrialing && daysLeftInTrial !== null
            ? `Your free trial ends in ${daysLeftInTrial} day${daysLeftInTrial === 1 ? '' : 's'}. Upgrade now to keep full access.`
            : 'Upgrade or switch plans at any time. Changes take effect immediately.'}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SELECTABLE_TIERS.map(tier => (
          <PlanCard
            key={tier}
            tier={tier}
            currentPlan={currentPlan}
            onSelect={handleSelect}
            loading={loading || checkoutLoading}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        No contracts. Cancel anytime. Tenants are always free.
      </p>
    </div>
  )
}
