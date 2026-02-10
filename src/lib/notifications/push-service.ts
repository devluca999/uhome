/**
 * Push Notification Service (VAPID)
 * 
 * Handles web push notifications using VAPID protocol.
 * Requires VAPID keys to be configured in environment variables.
 */

import { supabase } from '@/lib/supabase/client'
import { isFeatureEnabled } from '@/lib/feature-flags'

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, any>
  tag?: string
  requireInteraction?: boolean
}

/**
 * Check if push notifications are enabled
 */
export function isPushEnabled(): boolean {
  return isFeatureEnabled('ENABLE_PUSH_NOTIFICATIONS')
}

/**
 * Check if browser supports push notifications
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser')
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Subscribe to push notifications
 * Returns subscription data that should be saved to database
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushEnabled()) {
    throw new Error('Push notifications are disabled')
  }

  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser')
  }

  try {
    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.ready

    // Get VAPID public key from environment
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured')
    }

    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    })

    // Extract subscription data
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
    }

    return subscriptionData
  } catch (error) {
    console.error('Error subscribing to push:', error)
    throw error
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      return true
    }

    return false
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
    return false
  }
}

/**
 * Save push subscription to database
 */
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: navigator.userAgent,
    })

    if (error) {
      // If subscription already exists (unique constraint), update it
      if (error.code === '23505') {
        const { error: updateError } = await supabase
          .from('push_subscriptions')
          .update({
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString(),
          })
          .eq('endpoint', subscription.endpoint)

        if (updateError) {
          return { success: false, error: updateError.message }
        }
        return { success: true }
      }

      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete push subscription from database
 */
export async function deletePushSubscription(
  endpoint: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get all push subscriptions for a user
 */
export async function getUserPushSubscriptions(
  userId: string
): Promise<PushSubscriptionData[]> {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching push subscriptions:', error)
      return []
    }

    return (
      data?.map(sub => ({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      })) || []
    )
  } catch (error) {
    console.error('Error fetching push subscriptions:', error)
    return []
  }
}

// Helper functions

/**
 * Convert VAPID key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
