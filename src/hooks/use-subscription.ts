import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import {
  type PlanTier,
  type SubscriptionStatus,
  type PlanConfig,
  PLANS,
  canAddProperty,
  canAddCollaborator,
  isFeatureAvailable,
  isSubscriptionActive,
} from '@/lib/stripe/plans'

export interface SubscriptionState {
  plan: PlanTier
  status: SubscriptionStatus | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  loading: boolean
  error: string | null
}

export interface UseSubscriptionReturn extends SubscriptionState {
  config: PlanConfig
  isActive: boolean
  canAddProperty: (currentCount: number) => boolean
  canAddCollaborator: (currentCount: number) => boolean
  hasFeature: (feature: keyof PlanConfig['features']) => boolean
  refresh: () => Promise<void>
}

export function useSubscription(): UseSubscriptionReturn {
  const { organizationId } = useAuth()
  const [state, setState] = useState<SubscriptionState>({
    plan: 'free',
    status: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    loading: true,
    error: null,
  })

  const fetchSubscription = useCallback(async () => {
    if (!organizationId) {
      setState(s => ({ ...s, loading: false }))
      return
    }

    try {
      setState(s => ({ ...s, loading: true, error: null }))

      const { data, error } = await supabase
        .from('subscriptions')
        .select(
          'plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end'
        )
        .eq('organization_id', organizationId)
        .maybeSingle()

      if (error) throw error

      setState({
        plan: (data?.plan as PlanTier) ?? 'free',
        status: (data?.status as SubscriptionStatus) ?? null,
        stripeCustomerId: data?.stripe_customer_id ?? null,
        stripeSubscriptionId: data?.stripe_subscription_id ?? null,
        currentPeriodEnd: data?.current_period_end ?? null,
        cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load subscription',
      }))
    }
  }, [organizationId])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const plan = state.plan
  const config = PLANS[plan]
  const isActive = state.status ? isSubscriptionActive(state.status) : plan === 'free'

  return {
    ...state,
    config,
    isActive,
    canAddProperty: (count: number) => canAddProperty(plan, count),
    canAddCollaborator: (count: number) => canAddCollaborator(plan, count),
    hasFeature: (feature: keyof PlanConfig['features']) => isFeatureAvailable(plan, feature),
    refresh: fetchSubscription,
  }
}
