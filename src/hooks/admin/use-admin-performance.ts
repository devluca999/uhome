/**
 * Admin Performance Metrics Hook
 *
 * Hook to fetch performance metrics, upload logs, and security logs for admin dashboard.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export type TimeRange = '24h' | '7d' | '30d'

export interface PerformanceMetrics {
  avgPageLoadTime: number
  totalAPICalls: number
  uploadSuccessRate: number
  securityIncidents: number
}

export interface PageLoadMetric {
  page_path: string
  avg_duration: number
  count: number
}

export interface APIMetric {
  metric_name: string
  avg_duration: number
  count: number
}

export interface UploadLog {
  id: string
  file_name: string
  file_size_bytes: number
  file_type: string
  status: 'success' | 'failed'
  error_message?: string
  created_at: string
}

export interface SecurityLog {
  id: string
  event_type: string
  severity: 'low' | 'medium' | 'high'
  details: Record<string, unknown>
  created_at: string
}

export function useAdminPerformance(timeRange: TimeRange = '24h') {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [pageLoadMetrics, setPageLoadMetrics] = useState<PageLoadMetric[]>([])
  const [apiMetrics, setApiMetrics] = useState<APIMetric[]>([])
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([])
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchAllMetrics()
  }, [timeRange])

  function getTimeRangeISO(timeRange: TimeRange): string {
    const now = Date.now()
    let hours = 24
    if (timeRange === '7d') hours = 7 * 24
    if (timeRange === '30d') hours = 30 * 24
    return new Date(now - hours * 60 * 60 * 1000).toISOString()
  }

  async function fetchAllMetrics() {
    try {
      setLoading(true)
      setError(null)

      const timeRangeISO = getTimeRangeISO(timeRange)

      // Fetch aggregated metrics
      const [pageLoads, apiCalls, uploads, security] = await Promise.all([
        fetchPageLoadTimes(timeRangeISO),
        fetchAPIMetrics(timeRangeISO),
        fetchUploadLogs(timeRangeISO),
        fetchSecurityLogs(timeRangeISO),
      ])

      // Calculate aggregated metrics
      const avgPageLoadTime =
        pageLoads.length > 0
          ? pageLoads.reduce((sum, m) => sum + m.avg_duration * m.count, 0) /
            pageLoads.reduce((sum, m) => sum + m.count, 0)
          : 0

      const totalAPICalls = apiCalls.reduce((sum, m) => sum + m.count, 0)

      const successfulUploads = uploads.filter(u => u.status === 'success').length
      const uploadSuccessRate = uploads.length > 0 ? (successfulUploads / uploads.length) * 100 : 0

      const securityIncidents = security.filter(
        s => s.severity === 'high' || s.severity === 'medium'
      ).length

      setMetrics({
        avgPageLoadTime: Math.round(avgPageLoadTime),
        totalAPICalls,
        uploadSuccessRate: Math.round(uploadSuccessRate * 100) / 100,
        securityIncidents,
      })

      setPageLoadMetrics(pageLoads)
      setApiMetrics(apiCalls)
      setUploadLogs(uploads)
      setSecurityLogs(security)
    } catch (err) {
      console.error('Error fetching admin performance metrics:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPageLoadTimes(timeRangeISO: string): Promise<PageLoadMetric[]> {
    const { data, error } = await supabase
      .from('admin_metrics')
      .select('page_path, duration_ms')
      .eq('metric_type', 'page_load')
      .gte('created_at', timeRangeISO)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Aggregate by page path
    const aggregated = new Map<string, { total: number; count: number }>()
    data?.forEach(item => {
      const path = item.page_path || 'unknown'
      const existing = aggregated.get(path) || { total: 0, count: 0 }
      aggregated.set(path, {
        total: existing.total + (item.duration_ms || 0),
        count: existing.count + 1,
      })
    })

    return Array.from(aggregated.entries()).map(([page_path, stats]) => ({
      page_path,
      avg_duration: Math.round(stats.total / stats.count),
      count: stats.count,
    }))
  }

  async function fetchAPIMetrics(timeRangeISO: string): Promise<APIMetric[]> {
    const { data, error } = await supabase
      .from('admin_metrics')
      .select('metric_name, duration_ms')
      .eq('metric_type', 'api_call')
      .gte('created_at', timeRangeISO)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Aggregate by metric name
    const aggregated = new Map<string, { total: number; count: number }>()
    data?.forEach(item => {
      const name = item.metric_name || 'unknown'
      const existing = aggregated.get(name) || { total: 0, count: 0 }
      aggregated.set(name, {
        total: existing.total + (item.duration_ms || 0),
        count: existing.count + 1,
      })
    })

    return Array.from(aggregated.entries()).map(([metric_name, stats]) => ({
      metric_name,
      avg_duration: Math.round(stats.total / stats.count),
      count: stats.count,
    }))
  }

  async function fetchUploadLogs(
    timeRangeISO: string,
    status?: 'success' | 'failed'
  ): Promise<UploadLog[]> {
    let query = supabase
      .from('admin_upload_logs')
      .select('id, file_name, file_size_bytes, file_type, status, error_message, created_at')
      .gte('created_at', timeRangeISO)
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  async function fetchSecurityLogs(
    timeRangeISO: string,
    severity?: 'low' | 'medium' | 'high'
  ): Promise<SecurityLog[]> {
    let query = supabase
      .from('admin_security_logs')
      .select('id, event_type, severity, details, created_at')
      .gte('created_at', timeRangeISO)
      .order('created_at', { ascending: false })
      .limit(100)

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  return {
    metrics,
    pageLoadMetrics,
    apiMetrics,
    uploadLogs,
    securityLogs,
    loading,
    error,
    refetch: fetchAllMetrics,
  }
}
