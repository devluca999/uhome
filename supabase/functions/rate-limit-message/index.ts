// Supabase Edge Function for Messaging Rate Limiting
// Enforces messaging limits: max messages per minute, cooldown on failures, empty payload prevention

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limit configuration
const MAX_MESSAGES_PER_MINUTE = 20 // 20 messages per minute per user
const MAX_MESSAGES_PER_MINUTE_STAGING = 40 // Higher limit for staging
const COOLDOWN_SECONDS = 5 // Cooldown after failed attempts
const MIN_MESSAGE_LENGTH = 1 // Minimum message length (prevent empty spam)

// Check if we're in staging
function isStaging(): boolean {
  const url = Deno.env.get('SUPABASE_URL') || ''
  return url.toLowerCase().includes('staging') || url.toLowerCase().includes('test')
}

serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { body, lease_id } = await req.json()

    if (!body || !lease_id) {
      return new Response(JSON.stringify({ error: 'body and lease_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prevent empty messages (spam prevention)
    const messageBody = typeof body === 'string' ? body.trim() : ''
    if (messageBody.length < MIN_MESSAGE_LENGTH) {
      // Log abuse event
      await supabaseClient.from('abuse_events').insert({
        user_id: user.id,
        action_type: 'message',
        violation_type: 'empty_message',
        details: { message_length: messageBody.length },
        rate_limit_violation: true,
      })

      return new Response(
        JSON.stringify({
          error: 'Message cannot be empty',
          code: 'EMPTY_MESSAGE',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check for cooldown period (recent failures)
    const cooldownTime = new Date(Date.now() - COOLDOWN_SECONDS * 1000).toISOString()
    const { count: recentFailures } = await supabaseClient
      .from('abuse_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'message')
      .eq('rate_limit_violation', true)
      .gte('created_at', cooldownTime)

    if (recentFailures && recentFailures > 0) {
      return new Response(
        JSON.stringify({
          error: `Please wait ${COOLDOWN_SECONDS} seconds before sending another message after a failed attempt.`,
          code: 'COOLDOWN_ACTIVE',
          retry_after: COOLDOWN_SECONDS,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get rate limits based on environment
    const maxPerMinute = isStaging() ? MAX_MESSAGES_PER_MINUTE_STAGING : MAX_MESSAGES_PER_MINUTE

    // Check messages in last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: messagesLastMinute } = await supabaseClient
      .from('rate_limit_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'message')
      .gte('created_at', oneMinuteAgo)

    if (messagesLastMinute && messagesLastMinute >= maxPerMinute) {
      // Log abuse event
      await supabaseClient.from('abuse_events').insert({
        user_id: user.id,
        action_type: 'message',
        violation_type: 'rate_limit_per_minute',
        details: { messages_last_minute: messagesLastMinute, limit: maxPerMinute },
        rate_limit_violation: true,
      })

      return new Response(
        JSON.stringify({
          error: `Message rate limit exceeded. Maximum ${maxPerMinute} messages per minute.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: 60,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Record this message attempt
    await supabaseClient.from('rate_limit_tracking').insert({
      user_id: user.id,
      action_type: 'message',
      details: { lease_id, message_length: messageBody.length },
    })

    // Allow message to proceed
    return new Response(
      JSON.stringify({
        allowed: true,
        remaining_per_minute: Math.max(0, maxPerMinute - (messagesLastMinute || 0) - 1),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Message rate limit error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
