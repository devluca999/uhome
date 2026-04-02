import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

/** Non-null means open failed; UI should show a fixed message, not this value. */
const STRIPE_PORTAL_FAILED = 'STRIPE_PORTAL_FAILED'

type PortalResponse = { url?: string; error?: string }

export function useStripePortal() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPortal() {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.error('Error opening Stripe portal: not authenticated')
        setError(STRIPE_PORTAL_FAILED)
        return
      }

      const { data, error: fnError } = await supabase.functions.invoke<PortalResponse>(
        'create-portal-session',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (fnError) {
        console.error('Error opening Stripe portal:', fnError)
        setError(STRIPE_PORTAL_FAILED)
        return
      }

      const url = data?.url
      if (!url || typeof url !== 'string') {
        console.error('Error opening Stripe portal: no URL in response', data)
        setError(STRIPE_PORTAL_FAILED)
        return
      }

      window.location.href = url
    } catch (err) {
      console.error('Error opening Stripe portal:', err)
      setError(STRIPE_PORTAL_FAILED)
    } finally {
      setLoading(false)
    }
  }

  return {
    openPortal,
    loading,
    error,
  }
}
