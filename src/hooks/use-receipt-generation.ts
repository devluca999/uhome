import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useReceiptGeneration() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  async function generateReceipt(rentRecordId: string) {
    setGenerating(true)
    setError(null)

    try {
      // Get the current session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      // Call the edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const functionUrl = `${supabaseUrl}/functions/v1/generate-receipt`
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ rent_record_id: rentRecordId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate receipt')
      }

      // Receipt generated successfully, edge function updates the rent record
      // Return the receipt URL from the response
      return { receipt_url: data.receipt_url, error: null }
    } catch (err) {
      const error = err as Error
      setError(error)
      return { receipt_url: null, error }
    } finally {
      setGenerating(false)
    }
  }

  return {
    generateReceipt,
    generating,
    error,
  }
}
