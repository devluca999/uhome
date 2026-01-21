import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface AdminStats {
  totalUsers: number
  usersByRole: {
    landlord: number
    tenant: number
    admin: number
  }
  subscriptionsByPlan: {
    free: number
    pro: number
  }
  trialingUsers: number
  paidUsers: number
  canceledLast7Days: number
  canceledLast30Days: number
  newUsersLast7Days: number
  newUsersLast30Days: number
  // Transaction metrics (mock data until Stripe is integrated)
  transactionMetrics?: {
    platformRevenue: number // Total SaaS fees (mock)
    monthlyRevenue: number // Monthly SaaS fees (mock)
    failedTransactions: number // Failed payments (mock)
    refunds: number // Refunds (mock)
  }
  // System load metrics
  systemLoad?: {
    activeSessions: number // Estimated active sessions
    apiCallsLast24h: number // API calls in last 24h (from admin_metrics)
    averageResponseTime: number // Average API response time (from admin_metrics)
  }
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      setLoading(true)
      setError(null)

      // Calculate date thresholds
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // Total users
      const { count: totalUsers, error: totalUsersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (totalUsersError) throw totalUsersError

      // Users by role
      const { count: landlordCount, error: landlordError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'landlord')

      if (landlordError) throw landlordError

      const { count: tenantCount, error: tenantError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'tenant')

      if (tenantError) throw tenantError

      const { count: adminCount, error: adminError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')

      if (adminError) throw adminError

      // Active subscriptions by plan
      const { count: freeCount, error: freeError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('plan', 'free')
        .eq('status', 'active')

      if (freeError) throw freeError

      const { count: proCount, error: proError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('plan', 'pro')
        .eq('status', 'active')

      if (proError) throw proError

      // Trialing vs paid users
      const { count: trialingCount, error: trialingError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trialing')

      if (trialingError) throw trialingError

      const { count: paidCount, error: paidError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      if (paidError) throw paidError

      // Canceled subscriptions (7 and 30 days)
      const { count: canceled7Days, error: canceled7Error } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'canceled')
        .gte('created_at', sevenDaysAgo)

      if (canceled7Error) throw canceled7Error

      const { count: canceled30Days, error: canceled30Error } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'canceled')
        .gte('created_at', thirtyDaysAgo)

      if (canceled30Error) throw canceled30Error

      // New users (7 and 30 days)
      const { count: newUsers7Days, error: newUsers7Error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo)

      if (newUsers7Error) throw newUsers7Error

      const { count: newUsers30Days, error: newUsers30Error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo)

      if (newUsers30Error) throw newUsers30Error

      // Fetch API call metrics for system load (last 24 hours)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      const { count: apiCalls24h, error: apiCallsError } = await supabase
        .from('admin_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('metric_type', 'api_call')
        .gte('created_at', oneDayAgo)

      if (apiCallsError) {
        console.warn('Error fetching API call metrics:', apiCallsError)
      }

      // Fetch average API response time (last 24 hours)
      const { data: apiMetrics, error: apiMetricsError } = await supabase
        .from('admin_metrics')
        .select('duration_ms')
        .eq('metric_type', 'api_call')
        .gte('created_at', oneDayAgo)

      let averageResponseTime = 0
      if (!apiMetricsError && apiMetrics && apiMetrics.length > 0) {
        const totalDuration = apiMetrics.reduce((sum, m) => sum + (m.duration_ms || 0), 0)
        averageResponseTime = Math.round(totalDuration / apiMetrics.length)
      }

      // Calculate mock transaction metrics (until Stripe is integrated)
      const platformRevenue = (proCount || 0) * 15 * 12 // $15/month * 12 months * pro users
      const monthlyRevenue = (proCount || 0) * 15 // $15/month * pro users
      const failedTransactions = Math.floor(Math.random() * 5) // Mock: 0-4
      const refunds = Math.floor(Math.random() * 3) // Mock: 0-2

      // Estimate active sessions (users who signed in within last hour)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      // Note: We don't have last_sign_in_at in public.users, so we'll estimate based on recent activity
      // In production, this would come from session tracking
      const activeSessions = Math.floor((totalUsers || 0) * 0.1) // Mock: ~10% of users

      setStats({
        totalUsers: totalUsers || 0,
        usersByRole: {
          landlord: landlordCount || 0,
          tenant: tenantCount || 0,
          admin: adminCount || 0,
        },
        subscriptionsByPlan: {
          free: freeCount || 0,
          pro: proCount || 0,
        },
        trialingUsers: trialingCount || 0,
        paidUsers: paidCount || 0,
        canceledLast7Days: canceled7Days || 0,
        canceledLast30Days: canceled30Days || 0,
        newUsersLast7Days: newUsers7Days || 0,
        newUsersLast30Days: newUsers30Days || 0,
        transactionMetrics: {
          platformRevenue,
          monthlyRevenue,
          failedTransactions,
          refunds,
        },
        systemLoad: {
          activeSessions,
          apiCallsLast24h: apiCalls24h || 0,
          averageResponseTime,
        },
      })
    } catch (err) {
      console.error('Error fetching admin stats:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return { stats, loading, error, refetch: fetchStats }
}
