// Supabase Edge Function for General Abuse Detection
// Detects patterns of abuse: rapid actions, suspicious behavior, bot-like activity

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Abuse detection thresholds
const SUSPICIOUS_ACTIONS_PER_MINUTE = 30 // More than 30 actions per minute is suspicious
const BURST_WINDOW_SECONDS = 10 // Check for bursts in 10-second windows
const MAX_BURST_ACTIONS = 10 // More than 10 actions in 10 seconds is a burst

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

    const { action_type, details } = await req.json()

    if (!action_type) {
      return new Response(JSON.stringify({ error: 'action_type is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check for burst activity (rapid actions in short time window)
    const burstWindowStart = new Date(Date.now() - BURST_WINDOW_SECONDS * 1000).toISOString()
    const { count: burstActions } = await supabaseClient
      .from('rate_limit_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', burstWindowStart)

    if (burstActions && burstActions >= MAX_BURST_ACTIONS) {
      // Log abuse event
      await supabaseClient.from('abuse_events').insert({
        user_id: user.id,
        action_type,
        violation_type: 'burst_activity',
        details: {
          ...details,
          burst_actions: burstActions,
          window_seconds: BURST_WINDOW_SECONDS,
        },
        rate_limit_violation: true,
      })

      return new Response(
        JSON.stringify({
          error: 'Suspicious activity detected. Please slow down your actions.',
          code: 'BURST_ACTIVITY_DETECTED',
          retry_after: BURST_WINDOW_SECONDS,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check for suspicious overall activity (all actions in last minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: actionsLastMinute } = await supabaseClient
      .from('rate_limit_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneMinuteAgo)

    if (actionsLastMinute && actionsLastMinute >= SUSPICIOUS_ACTIONS_PER_MINUTE) {
      // Log abuse event
      await supabaseClient.from('abuse_events').insert({
        user_id: user.id,
        action_type,
        violation_type: 'suspicious_activity',
        details: {
          ...details,
          actions_last_minute: actionsLastMinute,
          threshold: SUSPICIOUS_ACTIONS_PER_MINUTE,
        },
        rate_limit_violation: true,
      })

      return new Response(
        JSON.stringify({
          error: 'Suspicious activity detected. Please wait before continuing.',
          code: 'SUSPICIOUS_ACTIVITY_DETECTED',
          retry_after: 60,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check for recent abuse events (user with multiple violations)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentViolations } = await supabaseClient
      .from('abuse_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('rate_limit_violation', true)
      .gte('created_at', oneHourAgo)

    // If user has 5+ violations in last hour, temporarily block
    if (recentViolations && recentViolations >= 5) {
      return new Response(
        JSON.stringify({
          error:
            'Account temporarily restricted due to repeated violations. Please try again later.',
          code: 'ACCOUNT_TEMPORARILY_RESTRICTED',
          retry_after: 3600, // 1 hour
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Record this action for tracking
    await supabaseClient.from('rate_limit_tracking').insert({
      user_id: user.id,
      action_type,
      details: details || {},
    })

    // Allow action to proceed
    return new Response(
      JSON.stringify({
        allowed: true,
        actions_last_minute: actionsLastMinute || 0,
        recent_violations: recentViolations || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Abuse guard error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
