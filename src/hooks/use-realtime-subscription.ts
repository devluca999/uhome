/**
 * Realtime Subscription Hook
 *
 * Provides Supabase realtime subscriptions for multi-tab sync in dev mode.
 *
 * Usage:
 * - Subscribe to table changes (INSERT, UPDATE, DELETE)
 * - Automatically unsubscribes on unmount
 * - Only active in dev mode
 * - Enables real-time cross-tab synchronization
 */

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { isDevModeActive } from '@/lib/tenant-dev-mode'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface RealtimeSubscriptionOptions {
  table: string
  filter?: Record<string, any>
  events?: ('INSERT' | 'UPDATE' | 'DELETE')[]
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void
}

/**
 * Hook to subscribe to Supabase realtime changes
 *
 * @param options Configuration for the subscription
 * @param options.table Table name to subscribe to
 * @param options.filter Filter object (e.g., { property_id: '123' })
 * @param options.events Events to listen for (default: all)
 * @param options.onInsert Callback for INSERT events
 * @param options.onUpdate Callback for UPDATE events
 * @param options.onDelete Callback for DELETE events
 *
 * @example
 * ```tsx
 * useRealtimeSubscription({
 *   table: 'maintenance_requests',
 *   filter: { property_id: propertyId },
 *   onUpdate: (payload) => {
 *     setRequests(prev => prev.map(r =>
 *       r.id === payload.new.id ? payload.new : r
 *     ))
 *   },
 *   onInsert: (payload) => {
 *     setRequests(prev => [payload.new, ...prev])
 *   }
 * })
 * ```
 */
export function useRealtimeSubscription(options: RealtimeSubscriptionOptions) {
  const {
    table,
    filter = {},
    events = ['INSERT', 'UPDATE', 'DELETE'],
    onInsert,
    onUpdate,
    onDelete,
  } = options
  const channelRef = useRef<any>(null)

  useEffect(() => {
    // Only subscribe in dev mode
    const devModeActive = isDevModeActive()
    if (!devModeActive) {
      return
    }

    // Build filter string for Supabase
    const filterString = Object.entries(filter)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join(',')

    // Create channel name unique to this subscription
    const channelName = `${table}-changes-${filterString || 'all'}-${Date.now()}`

    // Create subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filterString || undefined,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (import.meta.env.DEV) {
            console.log(`[Realtime] ${payload.eventType} on ${table}:`, payload)
          }

          switch (payload.eventType) {
            case 'INSERT':
              if (onInsert && events.includes('INSERT')) {
                onInsert(payload)
              }
              break
            case 'UPDATE':
              if (onUpdate && events.includes('UPDATE')) {
                onUpdate(payload)
              }
              break
            case 'DELETE':
              if (onDelete && events.includes('DELETE')) {
                onDelete(payload)
              }
              break
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED' && import.meta.env.DEV) {
          console.log(`[Realtime] Subscribed to ${table} changes`)
        } else if (status === 'CHANNEL_ERROR' && import.meta.env.DEV) {
          console.error(`[Realtime] Error subscribing to ${table} changes`)
        }
      })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        if (import.meta.env.DEV) {
          console.log(`[Realtime] Unsubscribed from ${table} changes`)
        }
      }
    }
  }, [table, JSON.stringify(filter), JSON.stringify(events), onInsert, onUpdate, onDelete])
}

/**
 * Simplified hook for subscribing to a single table with simple callback
 */
export function useSimpleRealtimeSubscription<T = any>(
  table: string,
  filter: Record<string, any> | null,
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void
) {
  useRealtimeSubscription({
    table,
    filter: filter || undefined,
    onInsert: onChange,
    onUpdate: onChange,
    onDelete: onChange,
  })
}
