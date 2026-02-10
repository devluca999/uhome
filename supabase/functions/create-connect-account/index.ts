/**
 * Create Stripe Connect Account Edge Function
 * 
 * Creates a Stripe Connect Express account onboarding link for a property.
 * Requires Stripe secret key in Supabase Secrets.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConnectAccountRequest {
  property_id: string
  return_url: string
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
    const { property_id, return_url }: ConnectAccountRequest = await req.json()

    if (!property_id || !return_url) {
      return new Response(
        JSON.stringify({ error: 'property_id and return_url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify property ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', property_id)
      .eq('owner_id', user.id)
      .single()

    if (propertyError || !property) {
      return new Response(
        JSON.stringify({ error: 'Property not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Check if Connect account already exists
    const { data: existingAccount } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id, onboarding_status')
      .eq('property_id', property_id)
      .maybeSingle()

    let accountId = existingAccount?.account_id

    // Create Connect account if it doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US', // Default, can be made configurable
        email: user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      accountId = account.id

      // Save to database
      await supabase.from('stripe_connect_accounts').insert({
        account_id: accountId,
        property_id: property_id,
        onboarding_status: 'pending',
      })
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: return_url,
      return_url: return_url,
      type: 'account_onboarding',
    })

    // Update onboarding status
    await supabase
      .from('stripe_connect_accounts')
      .update({ onboarding_status: 'in_progress' })
      .eq('account_id', accountId)

    return new Response(
      JSON.stringify({ onboarding_url: accountLink.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating Connect account:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to create Connect account',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
