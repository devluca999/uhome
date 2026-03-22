import { PLANS, type PlanTier } from '@/lib/stripe/plans'
import { useSubscription } from '@/hooks/use-subscription'

interface PlanCardProps {
  tier: PlanTier
  currentPlan: PlanTier
  onSelect: (tier: PlanTier) => void
  loading?: boolean
}

function PlanCard({ tier, currentPlan, onSelect, loading }: PlanCardProps) {
  const plan = PLANS[tier]
  const isCurrent = tier === currentPlan
  const isUpgrade = tier !== 'free' && currentPlan === 'free'
    || (tier === 'portfolio' && currentPlan === 'landlord')

  return (
    <div className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-all
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

      <div>
        <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-foreground">
          {plan.monthlyPrice === 0 ? 'Free' : `$${plan.monthlyPrice / 100}`}
        </span>
        {plan.monthlyPrice > 0 && (
          <span className="text-sm text-muted-foreground">/month</span>
        )}
      </div>

      <ul className="flex flex-col gap-2 text-sm text-muted-foreground flex-1">
        <li className="flex items-center gap-2">
          <span className="text-foreground font-medium">
            {plan.maxProperties === -1 ? 'Unlimited' : plan.maxProperties}
          </span> properties
        </li>
        <li className="flex items-center gap-2">
          <span className="text-foreground font-medium">Unlimited</span> tenants
        </li>
        <li className="flex items-center gap-2">
          <span className="text-foreground font-medium">
            {plan.maxCollaborators === 0 ? 'No' : plan.maxCollaborators}
          </span> collaborator{plan.maxCollaborators !== 1 ? 's' : ''}
        </li>
        {plan.features.advancedFinancials && (
          <li className="flex items-center gap-2 text-foreground">✓ Advanced financials</li>
        )}
        {plan.features.brandedReceipts && (
          <li className="flex items-center gap-2 text-foreground">✓ Branded receipts</li>
        )}
        {plan.features.csvExport && (
          <li className="flex items-center gap-2 text-foreground">✓ CSV export</li>
        )}
        <li className="flex items-center gap-2">
          <span className="text-foreground font-medium">
            {plan.storageMb >= 1024 ? `${plan.storageMb / 1024}GB` : `${plan.storageMb}MB`}
          </span> storage
        </li>
      </ul>

      <button
        onClick={() => onSelect(tier)}
        disabled={isCurrent || loading}
        className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all
          ${isCurrent
            ? 'bg-muted text-muted-foreground cursor-default'
            : isUpgrade
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border border-border text-foreground hover:bg-muted'
          }`}
      >
        {isCurrent ? 'Current plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
      </button>
    </div>
  )
}

export function SubscriptionPlans() {
  const { plan: currentPlan, loading } = useSubscription()

  const handleSelect = (tier: PlanTier) => {
    // TODO: Initiate Stripe Checkout for selected tier
    // Will call a create-checkout-session Edge Function
    console.log('Selected tier:', tier)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[0, 1, 2].map(i => (
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
          Upgrade or downgrade at any time. Changes take effect immediately.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['free', 'landlord', 'portfolio'] as PlanTier[]).map(tier => (
          <PlanCard
            key={tier}
            tier={tier}
            currentPlan={currentPlan}
            onSelect={handleSelect}
            loading={loading}
          />
        ))}
      </div>
    </div>
  )
}
