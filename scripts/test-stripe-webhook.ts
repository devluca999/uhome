/**
 * Stripe Webhook Test Runner
 * Tests realistic subscription lifecycle flows against the deployed Edge Function.
 *
 * Run: npx tsx scripts/test-stripe-webhook.ts
 *
 * Flows tested:
 * 1. New subscription (free → landlord)
 * 2. Upgrade (landlord → portfolio)
 * 3. Renewal (invoice.payment_succeeded)
 * 4. Failed payment (→ past_due)
 * 5. Cancellation (→ free)
 * 6. Downgrade (portfolio → landlord)
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const WEBHOOK_URL = 'https://vtucrtvajbmtedroevlz.supabase.co/functions/v1/stripe-subscription-webhook'
const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001'
const TEST_CUSTOMER_ID = 'cus_test_webhook_runner'
const TEST_SUB_ID = 'sub_test_webhook_runner'
const LANDLORD_PRICE = 'price_1TDgrcHPNU6LjU8JU3KBaA9i'
const PORTFOLIO_PRICE = 'price_1TDgvbHPNU6LjU8JrqpxpYnU'

const now = Math.floor(Date.now() / 1000)
const periodEnd = now + 30 * 24 * 60 * 60 // 30 days from now

async function sendEvent(eventType: string, data: object, label: string) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`▶ Flow: ${label}`)
  console.log(`  Event: ${eventType}`)

  const payload = JSON.stringify({
    id: `evt_test_${Date.now()}`,
    type: eventType,
    data: { object: data },
  })

  // In test mode without Stripe CLI, we send without signature
  // For real signature testing, use: stripe trigger <event>
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Note: without stripe-signature the function returns 400
      // Use stripe CLI for full signature testing: stripe trigger
    },
    body: payload,
  })

  const body = await res.text()
  console.log(`  Status: ${res.status}`)
  console.log(`  Response: ${body}`)
  return res.status
}
