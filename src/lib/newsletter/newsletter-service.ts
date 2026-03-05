/**
 * Newsletter Service
 *
 * Handles sending newsletter campaigns to subscribers
 * with email integration, analytics tracking, and template rendering
 */

import { supabase } from '@/lib/supabase/client'
import { sendEmail } from '@/lib/notifications/email-service'
import { renderNewsletterTemplate, htmlToPlainText, type TemplateStyle } from './email-templates'

export interface NewsletterRecipient {
  email: string
  userId?: string
  name?: string
}

export interface SendNewsletterOptions {
  campaignId: string
  recipients?: NewsletterRecipient[] // If not provided, sends to all waitlist/newsletter subscribers
  trackOpens?: boolean
  trackClicks?: boolean
}

export interface NewsletterSendResult {
  success: boolean
  sent: number
  failed: number
  errors: string[]
}

/**
 * Get all newsletter subscribers
 * Includes waitlist entries with status 'invited' or 'converted'
 * and users who have opted into newsletter
 */
export async function getNewsletterSubscribers(): Promise<NewsletterRecipient[]> {
  try {
    const recipients: NewsletterRecipient[] = []

    // Get waitlist entries that are invited or converted
    const { data: waitlistEntries } = await supabase
      .from('waitlist')
      .select('email, converted_to_user_id')
      .in('status', ['invited', 'converted'])

    if (waitlistEntries) {
      for (const entry of waitlistEntries) {
        recipients.push({
          email: entry.email,
          userId: entry.converted_to_user_id || undefined,
        })
      }
    }

    // Get users who have email preferences enabled for marketing
    const { data: emailPrefs } = await supabase
      .from('email_preferences')
      .select('user_id, users!inner(email)')
      .eq('email_marketing_enabled', true)

    if (emailPrefs) {
      for (const pref of emailPrefs) {
        const user = pref.users as any
        if (user?.email) {
          // Avoid duplicates
          if (!recipients.find(r => r.email === user.email)) {
            recipients.push({
              email: user.email,
              userId: pref.user_id,
            })
          }
        }
      }
    }

    return recipients
  } catch (error) {
    console.error('Error getting newsletter subscribers:', error)
    return []
  }
}

/**
 * Send newsletter campaign to recipients
 */
export async function sendNewsletterCampaign(
  options: SendNewsletterOptions
): Promise<NewsletterSendResult> {
  const result: NewsletterSendResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', options.campaignId)
      .single()

    if (campaignError || !campaign) {
      result.errors.push('Campaign not found')
      return result
    }

    if (campaign.sent_at) {
      result.errors.push('Campaign has already been sent')
      return result
    }

    // Get recipients
    let recipients = options.recipients
    if (!recipients || recipients.length === 0) {
      recipients = await getNewsletterSubscribers()
    }

    if (recipients.length === 0) {
      result.errors.push('No recipients found')
      return result
    }

    // Get user IDs for recipients who have accounts
    const emailToUserId = new Map<string, string>()
    for (const recipient of recipients) {
      if (recipient.userId) {
        emailToUserId.set(recipient.email, recipient.userId)
      } else {
        // Try to find user by email
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', recipient.email)
          .single()

        if (user) {
          emailToUserId.set(recipient.email, user.id)
        }
      }
    }

    // Render email template
    const templateStyle = (campaign.style_preset as TemplateStyle) || 'Newsletter'
    const unsubscribeUrl = `${window.location.origin}/settings/email-preferences`
    const htmlContent = renderNewsletterTemplate(templateStyle, {
      subject: campaign.subject,
      content: campaign.content,
      unsubscribeUrl,
    })
    const textContent = htmlToPlainText(htmlContent)

    // Generate tracking pixel URL for opens (if enabled)
    const trackingPixelUrl = options.trackOpens
      ? `${window.location.origin}/api/newsletter/track-open?campaign=${campaign.id}&email={EMAIL}`
      : undefined

    // Send emails
    const sendPromises = recipients.map(async recipient => {
      try {
        const userId = emailToUserId.get(recipient.email) || recipient.userId

        // For recipients without user accounts, we need a way to track them
        // For now, we'll create a placeholder user_id or use a system user
        // In production, you might want to create a "newsletter_subscriber" user type

        if (!userId) {
          // Skip recipients without user accounts for now
          // In production, you might want to handle this differently
          result.failed++
          result.errors.push(`No user account for ${recipient.email}`)
          return
        }

        // Add tracking pixel to HTML if enabled
        let finalHtml = htmlContent
        if (trackingPixelUrl) {
          const pixelUrl = trackingPixelUrl.replace('{EMAIL}', encodeURIComponent(recipient.email))
          finalHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none;" />`
        }

        // Replace links with tracking URLs if enabled
        if (options.trackClicks) {
          finalHtml = finalHtml.replace(/href="([^"]+)"/g, (match, url) => {
            if (url.startsWith('http') && !url.includes('/api/newsletter/track')) {
              const trackingUrl = `${window.location.origin}/api/newsletter/track-click?campaign=${campaign.id}&url=${encodeURIComponent(url)}&email=${encodeURIComponent(recipient.email)}`
              return `href="${trackingUrl}"`
            }
            return match
          })
        }

        const emailResult = await sendEmail({
          to: recipient.email,
          subject: campaign.subject,
          html: finalHtml,
          text: textContent,
          userId: userId,
        })

        if (emailResult.success) {
          result.sent++
        } else {
          result.failed++
          result.errors.push(`${recipient.email}: ${emailResult.error || 'Failed to send'}`)
        }
      } catch (error) {
        result.failed++
        result.errors.push(
          `${recipient.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    })

    await Promise.all(sendPromises)

    // Update campaign with sent status
    await supabase
      .from('newsletter_campaigns')
      .update({
        sent_at: new Date().toISOString(),
        recipients_count: result.sent,
      })
      .eq('id', options.campaignId)

    result.success = result.sent > 0
    return result
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    return result
  }
}

/**
 * Track newsletter open
 */
export async function trackNewsletterOpen(campaignId: string, _email: string): Promise<void> {
  try {
    // Increment opened_count
    await supabase.rpc('increment_newsletter_opened', {
      campaign_id: campaignId,
    })

    // Could also track individual opens in a separate table for detailed analytics
  } catch (error) {
    console.error('Error tracking newsletter open:', error)
  }
}

/**
 * Track newsletter click
 */
export async function trackNewsletterClick(
  campaignId: string,
  _email: string,
  url: string
): Promise<string> {
  try {
    // Increment clicked_count
    await supabase.rpc('increment_newsletter_clicked', {
      campaign_id: campaignId,
    })

    // Return original URL for redirect
    return url
  } catch (error) {
    console.error('Error tracking newsletter click:', error)
    return url
  }
}
