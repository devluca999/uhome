import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { isFeatureEnabled } from '@/lib/feature-flags'

/**
 * Hook for processing rent payments via Stripe Connect
 */
export function useRentPayment() {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Create a payment intent for a rent record
   */
  async function createPaymentIntent(rentRecordId: string) {
    if (!isFeatureEnabled('ENABLE_STRIPE_CONNECT')) {
      return { error: new Error('Stripe Connect is not enabled') }
    }

    setProcessing(true)
    setError(null)

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          rent_record_id: rentRecordId,
        },
      })

      if (invokeError) throw invokeError
      if (data.error) throw new Error(data.error)

      return { data: data.client_secret, error: null }
    } catch (err) {
      const error = err as Error
      setError(error)
      return { data: null, error }
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Confirm payment after Stripe Payment Element submission
   */
  async function confirmPayment(paymentIntentId: string) {
    if (!isFeatureEnabled('ENABLE_STRIPE_CONNECT')) {
      return { error: new Error('Stripe Connect is not enabled') }
    }

    setProcessing(true)
    setError(null)

    try {
      // Payment confirmation is handled by Stripe webhook
      // This function just verifies the payment intent status
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_intent_id', paymentIntentId)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (!data) {
        return { error: new Error('Payment not found') }
      }

      return { data, error: null }
    } catch (err) {
      const error = err as Error
      setError(error)
      return { data: null, error }
    } finally {
      setProcessing(false)
    }
  }

  return {
    createPaymentIntent,
    confirmPayment,
    processing,
    error,
  }
}
