import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { supabase } from '@/lib/supabase/client'
import { PLANS } from '@/lib/stripe/plans'
import { useAuth } from '@/contexts/auth-context'

export function TrialExpiredPaywall() {
  const { signOut } = useAuth()
  const [loading, setLoading] = useState<'landlord' | 'portfolio' | null>(null)

  async function handleUpgrade(tier: 'landlord' | 'portfolio') {
    setLoading(tier)
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
      console.error('[Paywall] Checkout failed:', err)
    } finally {
      setLoading(null)
    }
  }

  const plans = [PLANS.landlord, PLANS.portfolio]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <GrainOverlay />
      <motion.div
        className="relative z-10 max-w-3xl w-full"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-3">
            Your free trial has ended
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Choose a plan to continue managing your properties. Everything you set up during your trial is safe and waiting.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {plans.map((plan) => {
            const isPopular = plan.tier === 'landlord'
            return (
              <div
                key={plan.tier}
                className={`glass-card relative rounded-2xl p-6 flex flex-col gap-5 ${
                  isPopular ? 'ring-2 ring-primary/30' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-6">
                    <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      <Sparkles className="w-3 h-3" /> Most popular
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    ${plan.monthlyPrice / 100}
                  </span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2 flex-1">
                  <li><span className="text-foreground font-medium">{plan.maxProperties}</span> properties</li>
                  <li><span className="text-foreground font-medium">{plan.maxCollaborators}</span> collaborator{plan.maxCollaborators !== 1 ? 's' : ''}</li>
                  {plan.features.advancedFinancials && <li className="text-foreground">✓ Advanced financials</li>}
                  {plan.features.csvExport && <li className="text-foreground">✓ CSV export</li>}
                  {plan.features.brandedReceipts && <li className="text-foreground">✓ Branded receipts</li>}
                  <li><span className="text-foreground font-medium">{plan.storageMb >= 1024 ? `${plan.storageMb / 1024}GB` : `${plan.storageMb}MB`}</span> storage</li>
                </ul>
                <Button
                  className="w-full"
                  variant={isPopular ? 'default' : 'outline'}
                  disabled={loading !== null}
                  onClick={() => handleUpgrade(plan.tier as 'landlord' | 'portfolio')}
                >
                  {loading === plan.tier ? 'Redirecting…' : (
                    <span className="flex items-center gap-2">
                      Get started <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          No contracts. Cancel anytime.{' '}
          <button
            onClick={() => signOut()}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </p>
      </motion.div>
    </div>
  )
}
