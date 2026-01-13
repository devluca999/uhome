// Supabase Edge Function for Invite Rate Limiting
// Enforces invite limits: max active invites per property, auto-expire unused invites

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limit configuration (same for staging and production)
const MAX_ACTIVE_INVITES_PER_PROPERTY = 5 // Maximum active invites per property
const MAX_INVITES_PER_MINUTE = 3 // Maximum invites created per minute per user

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

    const { property_id, email } = await req.json()

    if (!property_id || !email) {
      return new Response(
        JSON.stringify({ error: 'property_id and email are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check invites created in last minute (burst protection)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: invitesLastMinute } = await supabaseClient
      .from('rate_limit_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'invite')
      .gte('created_at', oneMinuteAgo)

    if (invitesLastMinute && invitesLastMinute >= MAX_INVITES_PER_MINUTE) {
      // Log abuse event
      await supabaseClient.from('abuse_events').insert({
        user_id: user.id,
        action_type: 'invite',
        violation_type: 'rate_limit_per_minute',
        details: { invites_last_minute: invitesLastMinute, limit: MAX_INVITES_PER_MINUTE },
        rate_limit_violation: true,
      })

      return new Response(
        JSON.stringify({
          error: `Invite rate limit exceeded. Maximum ${MAX_INVITES_PER_MINUTE} invites per minute.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: 60,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check active invites for this property
    const now = new Date().toISOString()
    const { count: activeInvites } = await supabaseClient
      .from('tenant_invites')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', property_id)
      .is('accepted_at', null) // Not yet accepted
      .gt('expires_at', now) // Not expired

    if (activeInvites && activeInvites >= MAX_ACTIVE_INVITES_PER_PROPERTY) {
      // Log abuse event
      await supabaseClient.from('abuse_events').insert({
        user_id: user.id,
        action_type: 'invite',
        violation_type: 'max_active_invites',
        details: {
          property_id,
          active_invites: activeInvites,
          limit: MAX_ACTIVE_INVITES_PER_PROPERTY,
        },
        rate_limit_violation: true,
      })

      return new Response(
        JSON.stringify({
          error: `Maximum ${MAX_ACTIVE_INVITES_PER_PROPERTY} active invites per property. Please wait for existing invites to be accepted or expire.`,
          code: 'MAX_ACTIVE_INVITES_EXCEEDED',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Record this invite attempt
    await supabaseClient.from('rate_limit_tracking').insert({
      user_id: user.id,
      action_type: 'invite',
      details: { property_id, email },
    })

    // Allow invite to proceed
    return new Response(
      JSON.stringify({
        allowed: true,
        active_invites: activeInvites || 0,
        max_active_invites: MAX_ACTIVE_INVITES_PER_PROPERTY,
        remaining_per_minute: Math.max(0, MAX_INVITES_PER_MINUTE - (invitesLastMinute || 0) - 1),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Invite rate limit error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

