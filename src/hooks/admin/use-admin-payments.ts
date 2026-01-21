/**
 * Admin Payments Hook
 *
 * React hook for fetching payment and subscription data for admin dashboard.
 * Uses mock Stripe data structure until Stripe is integrated.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface SubscriptionMetrics {
  totalActive: number
  totalTrialing: number
  totalCanceled: number
  byPlan: {
    free: number
    pro: number
  }
}

export interface RevenueMetrics {
  totalRevenue: number
  monthlyRevenue: number
  failedTransactions: number
  refunds: number
}

export interface SubscriptionData {
  id: string
  organization_id: string
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface MockTransaction {
  id: string
  type: 'subscription' | 'refund' | 'dispute'
  status: 'succeeded' | 'failed' | 'pending'
  amount: number
  currency: string
  customer_id: string | null
  subscription_id: string | null
  description: string
  created_at: string
  failure_reason?: string
}

export interface PaymentMetrics {
  subscriptions: SubscriptionMetrics
  revenue: RevenueMetrics
  recentTransactions: MockTransaction[]
  subscriptionTrends: Array<{
    date: string
    active: number
    trialing: number
    canceled: number
  }>
}

export function useAdminPayments() {
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      // Fetch subscriptions from database
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })

      if (subscriptionsError) {
        throw subscriptionsError
      }

      setSubscriptions(subscriptionsData || [])

      // Calculate subscription metrics
      const subscriptionMetrics: SubscriptionMetrics = {
        totalActive: subscriptionsData?.filter(s => s.status === 'active').length || 0,
        totalTrialing: subscriptionsData?.filter(s => s.status === 'trialing').length || 0,
        totalCanceled: subscriptionsData?.filter(s => s.status === 'canceled').length || 0,
        byPlan: {
          free:
            subscriptionsData?.filter(s => s.plan === 'free' && s.status === 'active').length || 0,
          pro:
            subscriptionsData?.filter(s => s.plan === 'pro' && s.status === 'active').length || 0,
        },
      }

      // Generate mock revenue metrics (until Stripe is integrated)
      const revenueMetrics: RevenueMetrics = {
        totalRevenue: subscriptionMetrics.byPlan.pro * 15 * 12, // $15/month * 12 months * pro users
        monthlyRevenue: subscriptionMetrics.byPlan.pro * 15, // $15/month * pro users
        failedTransactions: Math.floor(Math.random() * 5), // Mock: 0-4 failed transactions
        refunds: Math.floor(Math.random() * 3), // Mock: 0-2 refunds
      }

      // Generate mock transaction data (until Stripe is integrated)
      const recentTransactions: MockTransaction[] = generateMockTransactions(
        subscriptionsData || []
      )

      // Generate subscription trends (last 6 months)
      const subscriptionTrends = generateSubscriptionTrends(subscriptionsData || [])

      setMetrics({
        subscriptions: subscriptionMetrics,
        revenue: revenueMetrics,
        recentTransactions,
        subscriptionTrends,
      })
    } catch (err) {
      console.error('Error fetching payment data:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  // Generate mock transaction data (until Stripe is integrated)
  function generateMockTransactions(subs: SubscriptionData[]): MockTransaction[] {
    const transactions: MockTransaction[] = []

    // Generate mock transactions for recent subscriptions
    subs.slice(0, 10).forEach(sub => {
      if (sub.status === 'active' || sub.status === 'trialing') {
        transactions.push({
          id: `txn_mock_${sub.id.substring(0, 8)}`,
          type: 'subscription',
          status: 'succeeded',
          amount: sub.plan === 'pro' ? 1500 : 0, // $15.00 in cents
          currency: 'usd',
          customer_id: sub.stripe_customer_id,
          subscription_id: sub.stripe_subscription_id,
          description: `Subscription payment - ${sub.plan} plan`,
          created_at: sub.updated_at || sub.created_at,
        })
      }

      // Add occasional failed transactions
      if (Math.random() > 0.8) {
        transactions.push({
          id: `txn_failed_${sub.id.substring(0, 8)}`,
          type: 'subscription',
          status: 'failed',
          amount: sub.plan === 'pro' ? 1500 : 0,
          currency: 'usd',
          customer_id: sub.stripe_customer_id,
          subscription_id: sub.stripe_subscription_id,
          description: `Failed subscription payment - ${sub.plan} plan`,
          failure_reason: 'Insufficient funds',
          created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    })

    // Sort by date descending
    return transactions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  // Generate subscription trends (last 6 months)
  function generateSubscriptionTrends(subs: SubscriptionData[]): Array<{
    date: string
    active: number
    trialing: number
    canceled: number
  }> {
    const trends: Array<{
      date: string
      active: number
      trialing: number
      canceled: number
    }> = []

    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const dateStr = date.toISOString().split('T')[0]

      // Count subscriptions by status at this point in time
      const active = subs.filter(s => {
        const created = new Date(s.created_at)
        const canceled = s.status === 'canceled' ? new Date(s.updated_at || s.created_at) : null
        return (
          created <= date &&
          (s.status === 'active' || (s.status === 'trialing' && canceled && canceled > date)) &&
          (!canceled || canceled > date)
        )
      }).length

      const trialing = subs.filter(s => {
        const created = new Date(s.created_at)
        return created <= date && s.status === 'trialing'
      }).length

      const canceled = subs.filter(s => {
        const canceled = s.status === 'canceled' ? new Date(s.updated_at || s.created_at) : null
        return canceled && canceled <= date
      }).length

      trends.push({
        date: dateStr,
        active,
        trialing,
        canceled,
      })
    }

    return trends
  }

  return {
    metrics,
    subscriptions,
    loading,
    error,
    refetch: fetchData,
  }
}
