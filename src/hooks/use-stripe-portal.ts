import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { appEnvironment } from '@/config/environment'

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
        throw new Error('Not authenticated')
      }

      const supabaseUrl = appEnvironment.supabaseUrl
      const response = await fetch(`${supabaseUrl}/functions/v1/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      if (data.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url
      } else {
        throw new Error('No portal URL returned')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open billing portal'
      setError(errorMessage)
      console.error('Error opening Stripe portal:', err)
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
