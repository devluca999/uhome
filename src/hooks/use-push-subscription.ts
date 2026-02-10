/**
 * Push Subscription Hook
 * 
 * Manages push notification subscription state and lifecycle.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  isPushEnabled,
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  savePushSubscription,
  deletePushSubscription,
  getUserPushSubscriptions,
} from '@/lib/notifications/push-service'

export interface UsePushSubscriptionReturn {
  isSupported: boolean
  isEnabled: boolean
  isSubscribed: boolean
  permission: NotificationPermission | null
  loading: boolean
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  checkPermission: () => Promise<void>
}

export function usePushSubscription(): UsePushSubscriptionReturn {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSupported = isPushSupported()
  const isEnabled = isPushEnabled()

  // Check current subscription status
  useEffect(() => {
    if (!isSupported || !isEnabled || !user) {
      setIsSubscribed(false)
      return
    }

    async function checkSubscription() {
      try {
        setLoading(true)
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        if (subscription) {
          // Check if subscription exists in database
          const dbSubscriptions = await getUserPushSubscriptions(user!.id)
          const existsInDb = dbSubscriptions.some(
            sub => sub.endpoint === subscription.endpoint
          )

          setIsSubscribed(existsInDb)
        } else {
          setIsSubscribed(false)
        }

        setPermission(Notification.permission)
      } catch (err) {
        console.error('Error checking push subscription:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    checkSubscription()
  }, [isSupported, isEnabled, user])

  const checkPermission = useCallback(async () => {
    if (!isSupported) {
      setPermission(null)
      return
    }

    setPermission(Notification.permission)
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || !isEnabled) {
      setError('Push notifications are not supported or enabled')
      return
    }

    if (!user) {
      setError('User must be logged in to subscribe to push notifications')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Request permission
      const permissionResult = await requestNotificationPermission()
      setPermission(permissionResult)

      if (permissionResult !== 'granted') {
        setError('Notification permission denied')
        return
      }

      // Subscribe to push
      const subscription = await subscribeToPush()

      if (!subscription) {
        setError('Failed to create push subscription')
        return
      }

      // Save to database
      const result = await savePushSubscription(user.id, subscription)

      if (!result.success) {
        setError(result.error || 'Failed to save push subscription')
        return
      }

      setIsSubscribed(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error subscribing to push:', err)
    } finally {
      setLoading(false)
    }
  }, [isSupported, isEnabled, user])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get current subscription
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Delete from browser
        await unsubscribeFromPush()

        // Delete from database
        await deletePushSubscription(subscription.endpoint)
      }

      setIsSubscribed(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error unsubscribing from push:', err)
    } finally {
      setLoading(false)
    }
  }, [isSupported, user])

  return {
    isSupported,
    isEnabled,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
    checkPermission,
  }
}
