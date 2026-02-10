/**
 * Send Push Notification Edge Function
 *
 * Sends push notifications to user's devices using VAPID via web-push.
 * Requires VAPID keys in Supabase Secrets.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, any>
  tag?: string
  requireInteraction?: boolean
}

interface SendPushRequest {
  subscriptions: PushSubscription[]
  payload: PushPayload
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          error: 'VAPID keys not configured',
          message: 'Please configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Supabase Secrets',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { subscriptions, payload }: SendPushRequest = await req.json()

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No subscriptions provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!payload || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    webpush.setVapidDetails(
      'mailto:support@uhome.app',
      vapidPublicKey,
      vapidPrivateKey
    )

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      data: payload.data || {},
      tag: payload.tag || 'default',
      requireInteraction: payload.requireInteraction ?? false,
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          pushPayload
        )
        return { success: true, endpoint: subscription.endpoint }
      })
    )

    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: subscriptions.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-push function:', error)
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
