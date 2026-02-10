/**
 * Create Payment Intent Edge Function
 * 
 * Creates a Stripe Payment Intent for a rent record.
 * Requires Stripe secret key and property to have active Connect account.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentIntentRequest {
  rent_record_id: string
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

    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { rent_record_id }: PaymentIntentRequest = await req.json()

    if (!rent_record_id) {
      return new Response(
        JSON.stringify({ error: 'rent_record_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get rent record with relations
    const { data: rentRecord, error: recordError } = await supabase
      .from('rent_records')
      .select(`
        *,
        property:properties(*),
        tenant:tenants(*, user:users(*))
      `)
      .eq('id', rent_record_id)
      .single()

    if (recordError || !rentRecord) {
      return new Response(
        JSON.stringify({ error: 'Rent record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify tenant ownership (tenant can only pay their own rent)
    const tenantUserId = (rentRecord.tenant as any)?.user?.id
    if (tenantUserId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already paid
    if (rentRecord.status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Rent record already paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get property
    const property = rentRecord.property as any
    if (!property) {
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Connect account for property
    const { data: connectAccount, error: connectError } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id, onboarding_status')
      .eq('property_id', property.id)
      .eq('onboarding_status', 'complete')
      .maybeSingle()

    if (connectError || !connectAccount) {
      return new Response(
        JSON.stringify({
          error: 'Stripe Connect account not set up',
          message: 'Landlord must connect their Stripe account before accepting online payments',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get payment settings
    const { data: paymentSettings } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('property_id', property.id)
      .maybeSingle()

    // Calculate amount (rent + late fee if applicable)
    const rentAmount = Number(rentRecord.amount)
    const lateFee = Number(rentRecord.late_fee || 0)
    const totalAmount = rentAmount + lateFee
    const amountCents = Math.round(totalAmount * 100)

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({
          error: 'Stripe not configured',
          message: 'Please configure STRIPE_SECRET_KEY in Supabase Secrets',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Import Stripe
    const Stripe = (await import('https://esm.sh/stripe@14.21.0')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    // Create Payment Intent on Connect account
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        application_fee_amount: 0, // Platform fee (can be configured)
        on_behalf_of: connectAccount.account_id,
        transfer_data: {
          destination: connectAccount.account_id,
        },
        metadata: {
          rent_record_id: rent_record_id,
          property_id: property.id,
          tenant_id: rentRecord.tenant_id,
        },
      },
      {
        stripeAccount: connectAccount.account_id,
      }
    )

    // Update rent record with payment intent ID
    await supabase
      .from('rent_records')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
      })
      .eq('id', rent_record_id)

    // Create payment record
    await supabase.from('payments').insert({
      payment_intent_id: paymentIntent.id,
      status: 'pending',
      amount: totalAmount,
      fees: 0, // Will be updated by webhook
      net_amount: totalAmount, // Will be updated by webhook
      currency: 'usd',
      property_id: property.id,
      tenant_id: rentRecord.tenant_id,
      lease_id: rentRecord.lease_id ?? null,
    })

    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to create payment intent',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
