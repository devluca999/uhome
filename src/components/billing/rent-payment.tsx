import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react'
import { useRentPayment } from '@/hooks/use-rent-payment'
import { isFeatureEnabled } from '@/lib/feature-flags'

interface RentPaymentProps {
  rentRecordId: string
  amount: number
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * Rent Payment Component
 *
 * Uses Stripe Payment Element to process rent payments.
 * Requires Stripe Connect to be enabled and property to have active Connect account.
 */
export function RentPayment({ rentRecordId, amount, onSuccess, onCancel }: RentPaymentProps) {
  const { createPaymentIntent, processing, error } = useRentPayment()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentElementReady, setPaymentElementReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const stripeRef = useRef<any>(null)
  const elementsRef = useRef<any>(null)
  const paymentElementRef = useRef<any>(null)

  // Initialize Stripe and create payment intent
  useEffect(() => {
    if (!isFeatureEnabled('ENABLE_STRIPE_CONNECT')) {
      return
    }

    initializePayment()
  }, [rentRecordId])

  async function initializePayment() {
    try {
      // Create payment intent
      const { data: secret, error: intentError } = await createPaymentIntent(rentRecordId)
      if (intentError || !secret) {
        setPaymentError(intentError?.message || 'Failed to create payment intent')
        return
      }

      setClientSecret(secret)

      // Load Stripe
      const { loadStripe } = await import('@stripe/stripe-js')
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
      if (!publishableKey) {
        setPaymentError('Stripe publishable key not configured')
        return
      }

      const stripe = await loadStripe(publishableKey)
      if (!stripe) {
        setPaymentError('Failed to load Stripe')
        return
      }

      stripeRef.current = stripe

      // Create Elements
      const elements = stripe.elements({
        clientSecret: secret,
        appearance: {
          theme: 'stripe',
        },
      })

      elementsRef.current = elements

      // Create Payment Element
      const paymentElement = elements.create('payment')
      paymentElementRef.current = paymentElement

      // Mount Payment Element
      const paymentElementContainer = document.getElementById('payment-element')
      if (paymentElementContainer) {
        paymentElement.mount(paymentElementContainer)
        paymentElement.on('ready', () => {
          setPaymentElementReady(true)
        })
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Failed to initialize payment')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripeRef.current || !elementsRef.current || !clientSecret) {
      return
    }

    setSubmitting(true)
    setPaymentError(null)

    try {
      const { error: confirmError } = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: {
          return_url: `${window.location.origin}/tenant/finances?payment_success=true`,
        },
        redirect: 'if_required',
      })

      if (confirmError) {
        setPaymentError(confirmError.message || 'Payment failed')
        setSubmitting(false)
        return
      }

      // Payment succeeded
      setPaymentSuccess(true)
      setTimeout(() => {
        onSuccess?.()
      }, 2000)
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (paymentElementRef.current) {
        paymentElementRef.current.unmount()
      }
    }
  }, [])

  if (!isFeatureEnabled('ENABLE_STRIPE_CONNECT')) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Pay Rent</CardTitle>
          <CardDescription>Pay your rent online</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Online rent payment is not available. Please contact your landlord for payment
              instructions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (paymentSuccess) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Payment Successful</CardTitle>
          <CardDescription>Your rent payment has been processed</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Your payment of ${amount.toLocaleString()} has been successfully processed. You will
              receive a receipt via email.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Pay Rent</CardTitle>
        <CardDescription>Pay ${amount.toLocaleString()} via Stripe</CardDescription>
      </CardHeader>
      <CardContent>
        {paymentError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{paymentError}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {!clientSecret && processing && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {clientSecret && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div id="payment-element" className="min-h-[200px]" />

            <div className="flex items-center justify-between pt-4 border-t border-border">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={!paymentElementReady || submitting}
                className="ml-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay ${amount.toLocaleString()}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
