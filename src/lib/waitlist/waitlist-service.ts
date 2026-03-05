/**
 * Waitlist Service
 *
 * Handles waitlist operations including invitations and bulk actions
 */

import { supabase } from '@/lib/supabase/client'
import { sendEmail } from '@/lib/notifications/email-service'

export interface WaitlistInviteOptions {
  entryId: string
  email: string
  name?: string
  userId?: string
}

export interface BulkWaitlistOperation {
  entryIds: string[]
  operation: 'invite' | 'remove'
}

/**
 * Send invitation email to waitlist entry
 */
export async function sendWaitlistInvite(
  options: WaitlistInviteOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const inviteUrl = `${window.location.origin}/signup?invite=${options.entryId}`
    const subject = "You're Invited to Join Uhome!"
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .content { padding: 30px 20px; background-color: #f8f9fa; border-radius: 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Uhome!</h1>
          </div>
          <div class="content">
            <p>Hi ${options.name || 'there'},</p>
            <p>Great news! You've been invited to join Uhome, the modern property management platform.</p>
            <p>Click the button below to create your account and get started:</p>
            <p style="text-align: center;">
              <a href="${inviteUrl}" class="button">Accept Invitation</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">${inviteUrl}</p>
            <p>This invitation will expire in 7 days.</p>
          </div>
          <div class="footer">
            <p>If you didn't request this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
    const text = `
Welcome to Uhome!

Hi ${options.name || 'there'},

Great news! You've been invited to join Uhome, the modern property management platform.

Create your account here: ${inviteUrl}

This invitation will expire in 7 days.

If you didn't request this invitation, you can safely ignore this email.
    `.trim()

    // Get or create user ID for email sending
    let userId = options.userId
    if (!userId) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', options.email)
        .single()

      if (user) {
        userId = user.id
      } else {
        // For waitlist entries without user accounts, we'll need a system user
        // or handle this differently. For now, we'll skip the opt-out check
        // In production, you might want to create a "waitlist_subscriber" user type
      }
    }

    if (userId) {
      const emailResult = await sendEmail({
        to: options.email,
        subject,
        html,
        text,
        userId,
      })

      if (emailResult.success) {
        // Update waitlist entry status
        await supabase.from('waitlist').update({ status: 'invited' }).eq('id', options.entryId)

        return { success: true }
      } else {
        return { success: false, error: emailResult.error }
      }
    } else {
      // Send email without user account (bypass opt-out check for waitlist invites)
      // This is a special case for waitlist invitations
      const { data: delivery, error: deliveryError } = await supabase
        .from('email_deliveries')
        .insert({
          to_email: options.email,
          subject,
          status: 'pending',
        })
        .select()
        .single()

      if (deliveryError) {
        return { success: false, error: 'Failed to create delivery record' }
      }

      // Call Edge Function directly (bypassing user opt-out check for waitlist)
      const { error: functionError } = await supabase.functions.invoke('send-email', {
        body: {
          to: options.email,
          subject,
          html,
          text,
          deliveryId: delivery.id,
        },
      })

      if (functionError) {
        await supabase
          .from('email_deliveries')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: functionError.message,
          })
          .eq('id', delivery.id)

        return { success: false, error: functionError.message }
      }

      await supabase
        .from('email_deliveries')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', delivery.id)

      await supabase.from('waitlist').update({ status: 'invited' }).eq('id', options.entryId)

      return { success: true }
    }
  } catch (error) {
    console.error('Error sending waitlist invite:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Bulk invite waitlist entries
 */
export async function bulkInviteWaitlist(
  entryIds: string[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const result = { success: 0, failed: 0, errors: [] as string[] }

  try {
    // Get all entries
    const { data: entries, error } = await supabase
      .from('waitlist')
      .select('*')
      .in('id', entryIds)
      .eq('status', 'pending')

    if (error || !entries) {
      result.errors.push('Failed to fetch waitlist entries')
      return result
    }

    // Send invites
    for (const entry of entries) {
      const inviteResult = await sendWaitlistInvite({
        entryId: entry.id,
        email: entry.email,
        name: entry.name || undefined,
        userId: entry.converted_to_user_id || undefined,
      })

      if (inviteResult.success) {
        result.success++
      } else {
        result.failed++
        result.errors.push(`${entry.email}: ${inviteResult.error || 'Failed'}`)
      }
    }

    return result
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    return result
  }
}

/**
 * Bulk remove waitlist entries
 */
export async function bulkRemoveWaitlist(
  entryIds: string[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const result = { success: 0, failed: 0, errors: [] as string[] }

  try {
    const { error } = await supabase
      .from('waitlist')
      .update({ status: 'removed' })
      .in('id', entryIds)

    if (error) {
      result.errors.push(error.message)
      result.failed = entryIds.length
    } else {
      result.success = entryIds.length
    }

    return result
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    result.failed = entryIds.length
    return result
  }
}
