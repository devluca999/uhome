/**
 * Stripe Subscription Webhook Handler
 *
 * Handles SaaS subscription lifecycle events:
 * - checkout.session.completed     → new subscription created
 * - customer.subscription.updated  → plan change, renewal, status change
 * - customer.subscription.deleted  → cancellation
 * - invoice.payment_succeeded      → successful renewal
 * - invoice.payment_failed         → failed payment → past_due
 *
 * Requires Supabase secrets:
 *   STRIPE_SECRET_KEY
 *   STRIPE_SUBSCRIPTION_WEBHOOK_SECRET  (separate from Connect webhook secret)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const webhookSecret = Deno.env.get('STRIPE_SUBSCRIPTION_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('STRIPE_SUBSCRIPTION_WEBHOOK_SECRET not configured')
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured')
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.text()
    const Stripe = (await import('https://esm.sh/stripe@14.21.0')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    let event
    try {
      // constructEventAsync required in Deno — SubtleCrypto is async-only
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Processing Stripe event: ${event.type}`)

    switch (event.type) {

      // ─── checkout.session.completed ─────────────────────────────────────────
      // Fired when a landlord completes Stripe Checkout.
      // Links the Stripe customer + subscription to the org's subscription row.
      case 'checkout.session.completed': {
        const session = event.data.object as any
        if (session.mode !== 'subscription') break

        const orgId = session.metadata?.organization_id
        if (!orgId) {
          console.error('checkout.session.completed: missing organization_id in metadata')
          break
        }

        const stripeSubscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        await supabase
          .from('subscriptions')
          .upsert({
            organization_id: orgId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: stripeSubscription.id,
            stripe_price_id: stripeSubscription.items.data[0]?.price.id ?? null,
            plan: resolvePlan(stripeSubscription.items.data[0]?.price.id),
            status: stripeSubscription.status,
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'organization_id' })

        console.log(`Subscription created for org ${orgId}`)
        break
      }

      // ─── customer.subscription.updated ──────────────────────────────────────
      // Fired on plan changes, renewals, cancellation scheduling, and status changes.
      case 'customer.subscription.updated': {
        const sub = event.data.object as any
        const orgId = await resolveOrgByCustomer(supabase, sub.customer)
        if (!orgId) { console.error(`No org found for customer ${sub.customer}`); break }

        await supabase
          .from('subscriptions')
          .update({
            stripe_price_id: sub.items.data[0]?.price.id ?? null,
            plan: resolvePlan(sub.items.data[0]?.price.id),
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', orgId)

        console.log(`Subscription updated for org ${orgId} → status: ${sub.status}`)
        break
      }

      // ─── customer.subscription.deleted ──────────────────────────────────────
      // Fired when a subscription is fully cancelled (not just scheduled).
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any
        const orgId = await resolveOrgByCustomer(supabase, sub.customer)
        if (!orgId) { console.error(`No org found for customer ${sub.customer}`); break }

        await supabase
          .from('subscriptions')
          .update({
            plan: 'free',
            status: 'canceled',
            cancel_at_period_end: false,
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', orgId)

        console.log(`Subscription canceled for org ${orgId} → downgraded to free`)
        break
      }

      // ─── invoice.payment_succeeded ───────────────────────────────────────────
      // Fired on successful renewal. Refreshes period dates and ensures active status.
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        if (invoice.billing_reason === 'subscription_create') break // handled by checkout.session.completed

        const orgId = await resolveOrgByCustomer(supabase, invoice.customer)
        if (!orgId) { console.error(`No org found for customer ${invoice.customer}`); break }

        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('organization_id', orgId)
        }

        console.log(`Payment succeeded for org ${orgId}`)
        break
      }

      // ─── invoice.payment_failed ──────────────────────────────────────────────
      // Fired when a renewal payment fails. Sets status to past_due.
      // Stripe will retry automatically per the retry schedule.
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const orgId = await resolveOrgByCustomer(supabase, invoice.customer)
        if (!orgId) { console.error(`No org found for customer ${invoice.customer}`); break }

        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', orgId)

        console.log(`Payment failed for org ${orgId} → past_due`)
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolves an organization_id from a Stripe customer ID.
 * Looks up the subscriptions table since that's where customer IDs are stored.
 */
async function resolveOrgByCustomer(
  supabase: ReturnType<typeof createClient>,
  customerId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error) {
    console.error('resolveOrgByCustomer error:', error)
    return null
  }
  return data?.organization_id ?? null
}

/**
 * Maps a Stripe price ID to an internal plan name.
 * Update PRICE_TO_PLAN with your actual Stripe price IDs from the dashboard.
 */
const PRICE_TO_PLAN: Record<string, string> = {
  // Monthly
  'price_1TFftVQmn5YLaXLqqVaazjQW': 'landlord',
  'price_1TFfuzQmn5YLaXLqdoVRBqjn': 'portfolio',
  // Yearly
  'price_1TG6gUQmn5YLaXLqOnKqWzs5': 'landlord',
  'price_1TG6jNQmn5YLaXLqNMdEOdk6': 'portfolio',
}

function resolvePlan(priceId: string | null | undefined): string {
  if (!priceId) return 'free'
  return PRICE_TO_PLAN[priceId] ?? 'landlord' // default unknown prices to landlord
}
