/**
 * Send Email Edge Function
 * 
 * Sends email via Postal SMTP.
 * Requires Postal SMTP credentials in Supabase Secrets.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html?: string
  text?: string
  deliveryId?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Postal SMTP credentials from secrets
    const postalHost = Deno.env.get('POSTAL_SMTP_HOST')
    const postalUser = Deno.env.get('POSTAL_SMTP_USER')
    const postalPass = Deno.env.get('POSTAL_SMTP_PASS')
    const postalPort = Deno.env.get('POSTAL_SMTP_PORT') || '587'

    if (!postalHost || !postalUser || !postalPass) {
      return new Response(
        JSON.stringify({
          error: 'Postal SMTP credentials not configured',
          message: 'Please configure POSTAL_SMTP_HOST, POSTAL_SMTP_USER, and POSTAL_SMTP_PASS in Supabase Secrets',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const { to, subject, html, text, deliveryId }: EmailRequest = await req.json()

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Send email via Postal HTTP API
    // Postal API endpoint: https://postal.yourdomain.com/api/v1/send/message
    // Alternative: Use Postal's SMTP server with a proper SMTP client library
    const postalApiUrl = Deno.env.get('POSTAL_API_URL') || `https://${postalHost}/api/v1/send/message`
    const postalApiKey = Deno.env.get('POSTAL_API_KEY') || postalPass

    const emailPayload = {
      to: [to],
      from: Deno.env.get('POSTAL_FROM_EMAIL') || 'noreply@uhome.app',
      subject,
      html_body: html,
      plain_body: text,
    }

    const postalResponse = await fetch(postalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Server-API-Key': postalApiKey,
      },
      body: JSON.stringify(emailPayload),
    })

    if (!postalResponse.ok) {
      const errorText = await postalResponse.text()
      throw new Error(`Postal API error: ${postalResponse.status} - ${errorText}`)
    }

    const postalData = await postalResponse.json()
    const postalMessageId = postalData?.message_id || postalData?.id || `postal_${Date.now()}`

    // Update delivery record if provided
    if (deliveryId) {
      await supabase
        .from('email_deliveries')
        .update({
          postal_message_id: postalMessageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', deliveryId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        postalMessageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-email function:', error)
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
