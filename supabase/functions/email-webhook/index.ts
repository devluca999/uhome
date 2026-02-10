/**
 * Email Webhook Handler (Postal)
 *
 * Receives webhook events from Postal for delivery tracking.
 * Updates email_deliveries and notifications tables.
 */
/// <reference path="../../deno.d.ts" />

// @ts-expect-error Deno module URL
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error Deno module URL
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-postal-secret',
}

interface PostalWebhookEvent {
  event: 'sent' | 'delivered' | 'bounced' | 'failed'
  message_id: string
  timestamp?: string
  reason?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Webhook verification required in production
    const webhookSecret = Deno.env.get('POSTAL_WEBHOOK_SECRET')
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({
          error: 'Webhook not configured',
          message: 'POSTAL_WEBHOOK_SECRET must be set in Supabase Secrets',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    const providedSecret = req.headers.get('x-postal-secret')
    if (providedSecret !== webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload
    const event: PostalWebhookEvent = await req.json()

    if (!event.message_id || !event.event) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message_id, event' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Find email delivery by Postal message ID
    const { data: delivery, error: fetchError } = await supabase
      .from('email_deliveries')
      .select('id, notification_id, user_id')
      .eq('postal_message_id', event.message_id)
      .single()

    if (fetchError || !delivery) {
      // Delivery not found - might be from a different system or old record
      console.warn('Email delivery not found for message_id:', event.message_id)
      return new Response(
        JSON.stringify({ success: true, message: 'Delivery not found (ignored)' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update delivery status based on event
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    switch (event.event) {
      case 'sent':
        updateData.status = 'sent'
        updateData.sent_at = event.timestamp || new Date().toISOString()
        break
      case 'delivered':
        updateData.status = 'delivered'
        updateData.delivered_at = event.timestamp || new Date().toISOString()
        break
      case 'bounced':
        updateData.status = 'bounced'
        updateData.bounced_at = event.timestamp || new Date().toISOString()
        updateData.error_message = event.reason || 'Email bounced'
        break
      case 'failed':
        updateData.status = 'failed'
        updateData.failed_at = event.timestamp || new Date().toISOString()
        updateData.error_message = event.reason || 'Email delivery failed'
        break
    }

    await supabase.from('email_deliveries').update(updateData).eq('id', delivery.id)

    // Update notification if linked
    if (delivery.notification_id) {
      const notificationUpdate: any = {}
      if (event.event === 'delivered') {
        notificationUpdate.email_delivered_at = event.timestamp || new Date().toISOString()
      } else if (event.event === 'bounced' || event.event === 'failed') {
        notificationUpdate.email_failed_at = event.timestamp || new Date().toISOString()
        notificationUpdate.email_error = event.reason || 'Email delivery failed'
      }
      if (Object.keys(notificationUpdate).length > 0) {
        await supabase
          .from('notifications')
          .update(notificationUpdate)
          .eq('id', delivery.notification_id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deliveryId: delivery.id,
        event: event.event,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in email-webhook function:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
