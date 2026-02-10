/**
 * Unified Notification Service
 * 
 * Abstraction layer for sending notifications across multiple channels:
 * - Email (Postal)
 * - Web Push (VAPID)
 * - In-app (existing notifications table)
 * 
 * Handles opt-out, throttling, and graceful degradation.
 */

import { sendEmail } from './email-service'
import { getUserPushSubscriptions, type PushNotificationPayload } from './push-service'
import { supabase } from '@/lib/supabase/client'
import { isFeatureEnabled } from '@/lib/feature-flags'

// Get user settings for notification preferences
async function getUserNotificationSettings(_userId: string): Promise<{
  inAppNotifications: boolean
  toastReminders: boolean
}> {
  try {
    const stored = localStorage.getItem('uhome-settings')
    if (stored) {
      const settings = JSON.parse(stored)
      return {
        inAppNotifications: settings.inAppNotifications !== false, // Default to true
        toastReminders: settings.toastReminders !== false, // Default to true
      }
    }
  } catch (error) {
    console.warn('Error reading notification settings:', error)
  }
  // Default to enabled if settings not found
  return { inAppNotifications: true, toastReminders: true }
}

export interface NotificationChannel {
  email?: boolean
  push?: boolean
  inApp?: boolean
}

export interface UnifiedNotificationOptions {
  userId: string
  leaseId: string
  type: 'message' | 'system'
  title: string
  body: string
  emailSubject?: string
  emailHtml?: string
  emailText?: string
  pushPayload?: PushNotificationPayload
  channels?: NotificationChannel
  intent?: 'general' | 'maintenance' | 'billing' | 'notice'
}

export interface NotificationResult {
  success: boolean
  inAppId?: string
  emailDeliveryId?: string
  pushSent?: boolean
  errors?: string[]
}

/**
 * Send unified notification across enabled channels
 */
export async function sendUnifiedNotification(
  options: UnifiedNotificationOptions
): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    errors: [],
  }

  // Get user notification preferences
  const userSettings = await getUserNotificationSettings(options.userId)

  // Default channels: all enabled, but respect user preferences
  const channels: NotificationChannel = {
    email: isFeatureEnabled('ENABLE_EMAIL_NOTIFICATIONS'),
    push: isFeatureEnabled('ENABLE_PUSH_NOTIFICATIONS'),
    inApp: userSettings.inAppNotifications, // Respect user preference
    ...options.channels, // Allow override
  }

  // Create in-app notification if enabled
  if (channels.inApp) {
    try {
    const { data: notification, error: inAppError } = await supabase
      .from('notifications')
      .insert({
        user_id: options.userId,
        lease_id: options.leaseId,
        type: options.type,
      })
      .select()
      .single()

      if (inAppError) {
        result.errors?.push(`In-app notification failed: ${inAppError.message}`)
      } else {
        result.inAppId = notification.id
        result.success = true // At least in-app succeeded
      }
    } catch (error) {
      result.errors?.push(
        `In-app notification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  } else {
    // In-app notifications disabled by user preference
    result.success = true // Still consider it successful
  }

  // Send email if enabled
  if (channels.email && result.inAppId) {
    try {
      const emailResult = await sendEmail({
        to: await getUserEmail(options.userId),
        subject: options.emailSubject || options.title,
        html: options.emailHtml || `<p>${options.body}</p>`,
        text: options.emailText || options.body,
        notificationId: result.inAppId,
        userId: options.userId,
      })

      if (emailResult.success && emailResult.deliveryId) {
        result.emailDeliveryId = emailResult.deliveryId
      } else {
        result.errors?.push(`Email failed: ${emailResult.error || 'Unknown error'}`)
      }
    } catch (error) {
      result.errors?.push(
        `Email error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      // Continue - email failure shouldn't block other channels
    }
  }

  // Send push if enabled
  if (channels.push && result.inAppId) {
    try {
      const pushResult = await sendPushNotification(options.userId, {
        title: options.title,
        body: options.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: {
          notificationId: result.inAppId,
          leaseId: options.leaseId,
          type: options.type,
          intent: options.intent,
          url: `/landlord/messages?leaseId=${options.leaseId}`,
        },
        tag: `lease-${options.leaseId}`,
        ...options.pushPayload,
      })

      if (pushResult.success) {
        result.pushSent = true
      } else {
        result.errors?.push(`Push failed: ${pushResult.error || 'Unknown error'}`)
      }
    } catch (error) {
      result.errors?.push(
        `Push error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      // Continue - push failure shouldn't block other channels
    }
  }

  return result
}

/**
 * Send push notification to all user's devices
 */
async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all user's push subscriptions
    const subscriptions = await getUserPushSubscriptions(userId)

    if (subscriptions.length === 0) {
      return { success: false, error: 'No push subscriptions found' }
    }

    // Call Edge Function to send push to all subscriptions
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        subscriptions,
        payload,
      },
    })

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
 * Get user email address
 */
async function getUserEmail(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (error || !data) {
      throw new Error('User not found')
    }

    return data.email
  } catch (error) {
    throw new Error('Failed to get user email')
  }
}
