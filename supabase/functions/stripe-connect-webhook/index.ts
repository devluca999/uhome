/**
 * Stripe Connect Webhook Handler
 * 
 * Handles Stripe webhook events for Connect accounts and payments.
 * Requires Stripe webhook secret in Supabase Secrets.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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

    // Get Stripe webhook secret
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get webhook signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const body = await req.text()

    // Import Stripe
    const Stripe = (await import('https://esm.sh/stripe@14.21.0')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    // Verify webhook signature
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any
        const rentRecordId = paymentIntent.metadata?.rent_record_id

        if (rentRecordId) {
          // Idempotency: skip if already processed
          const { data: existingRent } = await supabase
            .from('rent_records')
            .select('status, payment_status')
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .single()
          if (existingRent?.status === 'paid' && existingRent?.payment_status === 'paid') {
            break // Already processed, return 200
          }

          // Update rent record
          await supabase
            .from('rent_records')
            .update({
              status: 'paid',
              payment_status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', paymentIntent.id)

          // Update payment record (idempotent: only if not already succeeded)
          const { data: existingPayment } = await supabase
            .from('payments')
            .select('status')
            .eq('payment_intent_id', paymentIntent.id)
            .single()
          if (existingPayment?.status !== 'succeeded') {
            await supabase
              .from('payments')
              .update({
                status: 'succeeded',
                paid_at: new Date().toISOString(),
              })
              .eq('payment_intent_id', paymentIntent.id)
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any
        const rentRecordId = paymentIntent.metadata?.rent_record_id

        if (rentRecordId) {
          // Idempotency: allow re-processing failed (status can be retried)
          // Update rent record
          await supabase
            .from('rent_records')
            .update({
              payment_status: 'failed',
            })
            .eq('stripe_payment_intent_id', paymentIntent.id)

          // Update payment record
          await supabase
            .from('payments')
            .update({
              status: 'failed',
            })
            .eq('payment_intent_id', paymentIntent.id)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as any
        const accountId = account.id

        // Update Connect account status
        const onboardingStatus = account.details_submitted
          ? account.charges_enabled && account.payouts_enabled
            ? 'complete'
            : 'in_progress'
          : 'pending'

        await supabase
          .from('stripe_connect_accounts')
          .update({
            onboarding_status: onboardingStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('account_id', accountId)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
