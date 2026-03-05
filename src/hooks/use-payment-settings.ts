import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type PaymentSettings = Database['public']['Tables']['payment_settings']['Row']
type PaymentSettingsUpdate = Database['public']['Tables']['payment_settings']['Update']
export function usePaymentSettings(propertyId: string | undefined) {
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!propertyId) {
      setLoading(false)
      return
    }

    fetchSettings()
  }, [propertyId])

  async function fetchSettings() {
    if (!propertyId) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('property_id', propertyId)
        .maybeSingle()

      if (fetchError) throw fetchError

      // If no settings exist, create default ones
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('payment_settings')
          .insert({
            property_id: propertyId,
            refunds_enabled: true,
            grace_period_days: 5,
            auto_withdraw_enabled: false,
            withdraw_schedule: 'manual',
          })
          .select()
          .single()

        if (insertError) throw insertError
        setSettings(newSettings)
      } else {
        setSettings(data)
      }
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching payment settings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function updateSettings(updates: PaymentSettingsUpdate) {
    if (!propertyId || !settings)
      return { data: null, error: new Error('No property ID or settings') }

    try {
      setError(null)

      const { data: updated, error: updateError } = await supabase
        .from('payment_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id)
        .select()
        .single()

      if (updateError) throw updateError

      setSettings(updated)
      return { data: updated, error: null }
    } catch (err) {
      const error = err as Error
      setError(error)
      console.error('Error updating payment settings:', err)
      return { data: null, error }
    }
  }

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
  }
}
