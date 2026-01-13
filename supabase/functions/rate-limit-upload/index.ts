// Supabase Edge Function for Upload Rate Limiting
// Enforces upload limits: max file size, max uploads per minute, daily cap per tenant

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limit configuration
const MAX_FILE_SIZE_MB = 10 // 10MB max file size
const MAX_UPLOADS_PER_MINUTE = 10 // 10 uploads per minute per user
const MAX_UPLOADS_PER_DAY = 50 // 50 uploads per day per user
const MAX_UPLOADS_PER_MINUTE_STAGING = 20 // Higher limit for staging
const MAX_UPLOADS_PER_DAY_STAGING = 100 // Higher limit for staging

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

    const { file_size, property_id } = await req.json()

    if (!file_size || !property_id) {
      return new Response(
        JSON.stringify({ error: 'file_size and property_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check file size limit
    const fileSizeMB = file_size / (1024 * 1024)
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      // Log abuse event
      await supabaseClient.from('abuse_events').insert({
        user_id: user.id,
        action_type: 'upload',
        violation_type: 'file_size_exceeded',
        details: { file_size_mb: fileSizeMB, max_size_mb: MAX_FILE_SIZE_MB },
        rate_limit_violation: true,
      })

      return new Response(
        JSON.stringify({
          error: `File size exceeds maximum of ${MAX_FILE_SIZE_MB}MB`,
          code: 'FILE_SIZE_EXCEEDED',
        }),
        {
          status: 413, // Payload Too Large
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get rate limits based on environment
    const maxPerMinute = isStaging() ? MAX_UPLOADS_PER_MINUTE_STAGING : MAX_UPLOADS_PER_MINUTE
    const maxPerDay = isStaging() ? MAX_UPLOADS_PER_DAY_STAGING : MAX_UPLOADS_PER_DAY

    // Check uploads in last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: uploadsLastMinute } = await supabaseClient
      .from('rate_limit_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'upload')
      .gte('created_at', oneMinuteAgo)

    if (uploadsLastMinute && uploadsLastMinute >= maxPerMinute) {
      // Log abuse event
      await supabaseClient.from('abuse_events').insert({
        user_id: user.id,
        action_type: 'upload',
        violation_type: 'rate_limit_per_minute',
        details: { uploads_last_minute: uploadsLastMinute, limit: maxPerMinute },
        rate_limit_violation: true,
      })

      return new Response(
        JSON.stringify({
          error: `Upload rate limit exceeded. Maximum ${maxPerMinute} uploads per minute.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: 60,
        }),
        {
          status: 429, // Too Many Requests
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check uploads in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: uploadsLastDay } = await supabaseClient
      .from('rate_limit_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'upload')
      .gte('created_at', oneDayAgo)

    if (uploadsLastDay && uploadsLastDay >= maxPerDay) {
      // Log abuse event
      await supabaseClient.from('abuse_events').insert({
        user_id: user.id,
        action_type: 'upload',
        violation_type: 'rate_limit_per_day',
        details: { uploads_last_day: uploadsLastDay, limit: maxPerDay },
        rate_limit_violation: true,
      })

      return new Response(
        JSON.stringify({
          error: `Daily upload limit exceeded. Maximum ${maxPerDay} uploads per day.`,
          code: 'DAILY_LIMIT_EXCEEDED',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Record this upload attempt
    await supabaseClient.from('rate_limit_tracking').insert({
      user_id: user.id,
      action_type: 'upload',
      details: { file_size_mb: fileSizeMB, property_id },
    })

    // Allow upload to proceed
    return new Response(
      JSON.stringify({
        allowed: true,
        remaining_per_minute: Math.max(0, maxPerMinute - (uploadsLastMinute || 0) - 1),
        remaining_per_day: Math.max(0, maxPerDay - (uploadsLastDay || 0) - 1),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Upload rate limit error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

