/**
 * Admin Security Alerts Hook
 *
 * React hook for fetching security alerts from admin_security_logs table.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAdminPerformance, type TimeRange } from '@/hooks/admin/use-admin-performance'

export interface SecurityAlert {
  id: string
  user_id: string | null
  user_role: string | null
  event_type: 'failed_login' | 'invalid_api_call' | 'rate_limit_exceeded' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high'
  ip_address: string | null
  user_agent: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface SecurityAlertFilters {
  severity?: 'low' | 'medium' | 'high'
  eventType?: string
  timeRange?: TimeRange
}

export function useAdminSecurityAlerts(filters: SecurityAlertFilters = {}) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const timeRange = filters.timeRange || '24h'

  useEffect(() => {
    fetchAlerts()
  }, [filters.severity, filters.eventType, timeRange])

  function getTimeRangeISO(timeRange: TimeRange): string {
    const now = Date.now()
    let hours = 24
    if (timeRange === '7d') hours = 7 * 24
    if (timeRange === '30d') hours = 30 * 24
    return new Date(now - hours * 60 * 60 * 1000).toISOString()
  }

  async function fetchAlerts() {
    try {
      setLoading(true)
      setError(null)

      const timeRangeISO = getTimeRangeISO(timeRange)

      // Build query
      let query = supabase
        .from('admin_security_logs')
        .select('*')
        .gte('created_at', timeRangeISO)
        .order('created_at', { ascending: false })
        .limit(100)

      // Apply filters
      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }

      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setAlerts(data || [])
    } catch (err) {
      console.error('Error fetching security alerts:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return {
    alerts,
    loading,
    error,
    refetch: fetchAlerts,
  }
}
