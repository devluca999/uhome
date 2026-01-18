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
