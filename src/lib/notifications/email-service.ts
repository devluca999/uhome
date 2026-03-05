/**
 * Email Service (Postal)
 *
 * Wrapper for Postal SMTP email sending with delivery tracking,
 * throttling, and retry logic.
 */

import { supabase } from '@/lib/supabase/client'
import { isFeatureEnabled } from '@/lib/feature-flags'

export interface EmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
  notificationId?: string
  userId: string
}

export interface EmailDeliveryResult {
  success: boolean
  deliveryId?: string
  postalMessageId?: string
  error?: string
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000 // Start with 1 second, exponential backoff
const THROTTLE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const MAX_EMAILS_PER_WINDOW = 1

/**
 * Check if email notifications are enabled
 */
export function isEmailEnabled(): boolean {
  return isFeatureEnabled('ENABLE_EMAIL_NOTIFICATIONS')
}

/**
 * Check if user has opted out of email notifications
 */
export async function checkEmailOptOut(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('email_preferences')
      .select('email_notifications_enabled')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which means no preference set (default to enabled)
      console.error('Error checking email preferences:', error)
      return false // Default to not opted out
    }

    // If no preference exists, default to enabled (not opted out)
    return data ? !data.email_notifications_enabled : false
  } catch (error) {
    console.error('Error checking email opt-out:', error)
    return false // Default to not opted out on error
  }
}

/**
 * Check throttling limits for a user
 */
async function checkThrottleLimit(userId: string): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - THROTTLE_WINDOW_MS)
    const { count, error } = await supabase
      .from('email_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString())
      .in('status', ['pending', 'sent', 'delivered'])

    if (error) {
      console.error('Error checking throttle limit:', error)
      return true // Allow on error (fail open)
    }

    return (count || 0) < MAX_EMAILS_PER_WINDOW
  } catch (error) {
    console.error('Error checking throttle limit:', error)
    return true // Allow on error
  }
}

/**
 * Send email via Postal (via Supabase Edge Function)
 *
 * This function calls the Edge Function which handles actual SMTP sending.
 * The Edge Function should be configured with Postal SMTP credentials.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailDeliveryResult> {
  if (!isEmailEnabled()) {
    return {
      success: false,
      error: 'Email notifications are disabled',
    }
  }

  // Check opt-out
  const optedOut = await checkEmailOptOut(options.userId)
  if (optedOut) {
    return {
      success: false,
      error: 'User has opted out of email notifications',
    }
  }

  // Check throttle limit
  const withinLimit = await checkThrottleLimit(options.userId)
  if (!withinLimit) {
    return {
      success: false,
      error: 'Email rate limit exceeded. Please try again later.',
    }
  }

  try {
    // Create email delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('email_deliveries')
      .insert({
        notification_id: options.notificationId || null,
        user_id: options.userId,
        to_email: options.to,
        subject: options.subject,
        status: 'pending',
      })
      .select()
      .single()

    if (deliveryError) {
      console.error('Error creating email delivery record:', deliveryError)
      return {
        success: false,
        error: 'Failed to create delivery record',
      }
    }

    // Call Edge Function to send email
    const { data: functionData, error: functionError } = await supabase.functions.invoke(
      'send-email',
      {
        body: {
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          deliveryId: delivery.id,
        },
      }
    )

    if (functionError) {
      // Update delivery record with error
      await supabase
        .from('email_deliveries')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: functionError.message,
        })
        .eq('id', delivery.id)

      return {
        success: false,
        deliveryId: delivery.id,
        error: functionError.message,
      }
    }

    // Update delivery record with Postal message ID
    const postalMessageId = functionData?.postalMessageId
    if (postalMessageId) {
      await supabase
        .from('email_deliveries')
        .update({
          postal_message_id: postalMessageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', delivery.id)
    }

    // Update notification if provided
    if (options.notificationId) {
      await supabase
        .from('notifications')
        .update({
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', options.notificationId)
    }

    return {
      success: true,
      deliveryId: delivery.id,
      postalMessageId,
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Retry failed email delivery
 */
export async function retryEmailDelivery(
  deliveryId: string,
  options: EmailOptions
): Promise<EmailDeliveryResult> {
  try {
    // Get current delivery record
    const { data: delivery, error: fetchError } = await supabase
      .from('email_deliveries')
      .select('retry_count')
      .eq('id', deliveryId)
      .single()

    if (fetchError || !delivery) {
      return {
        success: false,
        error: 'Delivery record not found',
      }
    }

    if (delivery.retry_count >= MAX_RETRIES) {
      return {
        success: false,
        error: 'Maximum retry attempts reached',
      }
    }

    // Increment retry count
    await supabase
      .from('email_deliveries')
      .update({
        retry_count: delivery.retry_count + 1,
        status: 'pending',
      })
      .eq('id', deliveryId)

    // Wait with exponential backoff
    const delay = RETRY_DELAY_MS * Math.pow(2, delivery.retry_count)
    await new Promise(resolve => setTimeout(resolve, delay))

    // Retry sending
    return await sendEmail(options)
  } catch (error) {
    console.error('Error retrying email delivery:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
