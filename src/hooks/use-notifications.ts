import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { useAuth } from '@/contexts/auth-context'
import { useTenantDevMode } from '@/contexts/tenant-dev-mode-context'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'

type Notification = Database['public']['Tables']['notifications']['Row']

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()
  const devMode = useTenantDevMode()

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
        setNotifications(prev => prev.filter(n => n.id !== (payload.old?.id ?? '')))
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

  const unreadCount = notifications.filter(n => !n.read).length
  const unreadNotifications = notifications.filter(n => !n.read)

  return {
    notifications,
    unreadNotifications,
    unreadCount,
    loading,
    error,
    markNotificationAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
