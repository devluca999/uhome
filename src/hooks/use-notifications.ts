import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { useAuth } from '@/contexts/auth-context'
import { useTenantDevMode } from '@/contexts/tenant-dev-mode-context'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'

type Notification = Database['public']['Tables']['notifications']['Row']

const DISMISSED_NOTIFICATION_PREFIX = 'dismissed_notification_'

function readDismissedNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const ids = new Set<string>()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(DISMISSED_NOTIFICATION_PREFIX)) {
        ids.add(k.slice(DISMISSED_NOTIFICATION_PREFIX.length))
      }
    }
  } catch {
    // ignore storage access errors
  }
  return ids
}

function dismissNotificationStorageKey(id: string): string {
  return `${DISMISSED_NOTIFICATION_PREFIX}${id}`
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(readDismissedNotificationIds)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()
  const devMode = useTenantDevMode()

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key?.startsWith(DISMISSED_NOTIFICATION_PREFIX) || e.key === null) {
        setDismissedIds(readDismissedNotificationIds())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (user) {
      fetchNotifications()
    } else {
      setNotifications([])
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, devMode?.isActive, devMode?.state])

  async function fetchNotifications() {
    if (!user) return

    try {
      setLoading(true)

      // In extended dev mode, notifications use staging DB (not mocked)
      // Always fetch from Supabase (production or dev mode)
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setNotifications(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markNotificationDismissed = useCallback((notificationId: string) => {
    try {
      localStorage.setItem(dismissNotificationStorageKey(notificationId), '1')
    } catch {
      // ignore quota / private mode
    }
    setDismissedIds(prev => new Set(prev).add(notificationId))
  }, [])

  const visibleNotifications = useMemo(
    () => notifications.filter(n => !dismissedIds.has(n.id)),
    [notifications, dismissedIds]
  )

  // Set up realtime subscription for multi-tab sync (dev mode only)
  useRealtimeSubscription({
    table: 'notifications',
    filter: user ? { user_id: user.id } : undefined,
    events: ['INSERT', 'UPDATE', 'DELETE'],
    onInsert: payload => {
      if (payload.new && user && payload.new.user_id === user.id) {
        setNotifications(prev => {
          // Check if already exists
          if (prev.some(n => n.id === payload.new.id)) {
            return prev
          }
          return [payload.new as Notification, ...prev]
        })
      }
    },
    onUpdate: payload => {
      if (payload.new && user && payload.new.user_id === user.id) {
        setNotifications(prev =>
          prev.map(n => (n.id === payload.new.id ? (payload.new as Notification) : n))
        )
      }
    },
    onDelete: payload => {
      if (payload.old) {
        if (payload.old) {
          const oldId = (payload.old as { id?: string }).id
          if (oldId) {
            setNotifications(prev => prev.filter(n => n.id !== oldId))
          }
        }
      }
    },
  })

  async function markNotificationAsRead(notificationId: string) {
    if (!user) return

    try {
      // Always update in Supabase (staging DB in dev mode)
      // Realtime subscription will handle UI update
      const { data: updatedNotification, error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      setNotifications(prev => prev.map(n => (n.id === notificationId ? updatedNotification : n)))
      return { data: updatedNotification, error: null }
    } catch (err) {
      const error = err as Error
      console.error('Error marking notification as read:', err)
      return { data: null, error }
    }
  }

  async function markAllAsRead() {
    if (!user) return

    try {
      // Always update in Supabase (staging DB in dev mode)
      // Realtime subscription will handle UI update
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (updateError) throw updateError

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      return { error: null }
    } catch (err) {
      const error = err as Error
      console.error('Error marking all notifications as read:', err)
      return { error }
    }
  }

  const unreadCount = visibleNotifications.filter(n => !n.read).length
  const unreadNotifications = visibleNotifications.filter(n => !n.read)

  return {
    notifications: visibleNotifications,
    unreadNotifications,
    unreadCount,
    loading,
    error,
    markNotificationAsRead,
    markNotificationDismissed,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
