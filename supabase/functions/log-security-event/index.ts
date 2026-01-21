// Supabase Edge Function for Logging Security Events
// Inserts security logs into admin_security_logs table using service role

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get authenticated user from request (if available)
    const authHeader = req.headers.get('authorization')
    let user = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const {
        data: { user: authUser },
      } = await supabaseClient.auth.getUser(token)
      user = authUser
    }

    // Parse request body
    const { log } = await req.json()

    if (!log || !log.event_type || !log.severity) {
      return new Response(JSON.stringify({ error: 'Invalid security log data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert security log into admin_security_logs table
    const { error: insertError } = await supabaseClient.from('admin_security_logs').insert([log])

    if (insertError) {
      console.error('Error inserting security log:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to insert security log' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For high severity events, optionally trigger alerts
    if (log.severity === 'high') {
      console.warn('High severity security event logged:', log.event_type, log.details)
      // TODO: Integrate with notification system
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in log-security-event function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
