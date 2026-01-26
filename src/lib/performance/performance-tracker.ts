/**
 * Performance Tracker
 *
 * Utility module for tracking performance metrics (page load times, API durations, component renders).
 * All metrics are anonymized and batched before sending to admin_metrics table.
 */

import { supabase } from '@/lib/supabase/client'
import { anonymizeUserId } from '@/lib/admin/data-anonymizer'

export type MetricType = 'page_load' | 'api_call' | 'component_render'

export interface PerformanceMetric {
  user_id: string // Anonymized
  user_role: 'tenant' | 'landlord' | 'admin'
  metric_type: MetricType
  page_path?: string
  metric_name: string
  duration_ms: number
  metadata?: Record<string, unknown>
}

// Batch metrics to reduce database writes
const METRIC_BATCH_SIZE = 10
const METRIC_BATCH_TIMEOUT = 5000 // 5 seconds

class PerformanceTracker {
  private metricQueue: PerformanceMetric[] = []
  private batchTimer: number | null = null
  private currentUserRole: 'tenant' | 'landlord' | 'admin' | null = null

  /**
   * Initialize tracker with current user info
   */
  async initialize() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      // Fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData) {
        this.currentUserRole = userData.role as 'tenant' | 'landlord' | 'admin'
      }
    }
  }

  /**
   * Track page load time
   */
  async trackPageLoad(pagePath: string, durationMs: number, metadata?: Record<string, unknown>) {
    if (!this.currentUserRole) {
      await this.initialize()
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const metric: PerformanceMetric = {
      user_id: anonymizeUserId(user.id),
      user_role: this.currentUserRole || 'tenant',
      metric_type: 'page_load',
      page_path: pagePath,
      metric_name: `page_load_${pagePath.replace(/\//g, '_')}`,
      duration_ms: Math.round(durationMs),
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    }

    this.addMetric(metric)
  }

  /**
   * Track API call duration
   */
  async trackAPICall(
    endpoint: string,
    durationMs: number,
    status: number,
    metadata?: Record<string, unknown>
  ) {
    if (!this.currentUserRole) {
      await this.initialize()
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const metric: PerformanceMetric = {
      user_id: anonymizeUserId(user.id),
      user_role: this.currentUserRole || 'tenant',
      metric_type: 'api_call',
      page_path: window.location.pathname,
      metric_name: `api_${endpoint.replace(/\//g, '_')}`,
      duration_ms: Math.round(durationMs),
      metadata: {
        ...metadata,
        endpoint,
        status,
        timestamp: new Date().toISOString(),
      },
    }

    this.addMetric(metric)
  }

  /**
   * Track component render time
   */
  async trackComponentRender(
    componentName: string,
    durationMs: number,
    metadata?: Record<string, unknown>
  ) {
    if (!this.currentUserRole) {
      await this.initialize()
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const metric: PerformanceMetric = {
      user_id: anonymizeUserId(user.id),
      user_role: this.currentUserRole || 'tenant',
      metric_type: 'component_render',
      page_path: window.location.pathname,
      metric_name: `render_${componentName}`,
      duration_ms: Math.round(durationMs),
      metadata: {
        ...metadata,
        component: componentName,
        timestamp: new Date().toISOString(),
      },
    }

    this.addMetric(metric)
  }

  /**
   * Add metric to queue and flush if batch size reached
   */
  private addMetric(metric: PerformanceMetric) {
    this.metricQueue.push(metric)

    // Flush if batch size reached
    if (this.metricQueue.length >= METRIC_BATCH_SIZE) {
      this.flush()
      return
    }

    // Set timer to flush after timeout
    if (this.batchTimer === null) {
      this.batchTimer = window.setTimeout(() => {
        this.flush()
      }, METRIC_BATCH_TIMEOUT)
    }
  }

  /**
   * Flush metrics queue to database via Edge Function
   */
  async flush() {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    if (this.metricQueue.length === 0) return

    const metrics = [...this.metricQueue]
    this.metricQueue = []

    try {
      // Call Edge Function to insert metrics (service role access)
      const { error } = await supabase.functions.invoke('log-metrics', {
        body: { metrics },
      })

      if (error) {
        // Silently fail in production/dev - performance tracking is non-critical
        if (import.meta.env.DEV) {
          console.debug('Performance metrics logging failed (non-critical):', error.message)
        }
        // Re-queue metrics on error (optional - might cause duplicates)
        // this.metricQueue.unshift(...metrics)
      }
    } catch (err) {
      // Silently fail - performance tracking is non-critical
      if (import.meta.env.DEV) {
        console.debug('Performance metrics logging error (non-critical):', err)
      }
      // Re-queue metrics on error (optional)
      // this.metricQueue.unshift(...metrics)
    }
  }

  /**
   * Flush remaining metrics on page unload
   */
  flushOnUnload() {
    if (this.metricQueue.length > 0) {
      // Use sendBeacon for reliable delivery on page unload
      const metrics = JSON.stringify(this.metricQueue)

      // Note: sendBeacon doesn't work with Edge Functions directly
      // Fallback to sync flush attempt
      this.flush().catch(() => {
        // Silently fail on unload
      })
    }
  }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker()

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceTracker.flushOnUnload()
  })
}
