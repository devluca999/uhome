import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type { Database } from '@/types/database'

type ReceiptSettings = Database['public']['Tables']['receipt_settings']['Row']
type ReceiptSettingsInsert = Database['public']['Tables']['receipt_settings']['Insert']
type ReceiptSettingsUpdate = Database['public']['Tables']['receipt_settings']['Update']

const DEFAULT_SETTINGS: Omit<ReceiptSettingsInsert, 'user_id'> = {
  header_text: null,
  logo_url: null,
  footer_note: null,
  currency: 'USD',
  date_format: 'MM/DD/YYYY',
}

export function useReceiptSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<ReceiptSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user])

  async function fetchSettings() {
    if (!user) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('receipt_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine (use defaults)
        throw fetchError
      }

      if (data) {
        setSettings(data)
      } else {
        // No settings exist, use defaults
        setSettings(null)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createOrUpdateSettings(data: ReceiptSettingsUpdate) {
    if (!user) return { data: null, error: new Error('Not authenticated') }

    try {
      // Try to update first
      const { data: updated, error: updateError } = await supabase
        .from('receipt_settings')
        .update(data)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError && updateError.code === 'PGRST116') {
        // No existing settings, create new
        const { data: created, error: createError } = await supabase
          .from('receipt_settings')
          .insert({
            ...DEFAULT_SETTINGS,
            ...data,
            user_id: user.id,
          })
          .select()
          .single()

        if (createError) throw createError
        setSettings(created)
        return { data: created, error: null }
      }

      if (updateError) throw updateError
      setSettings(updated)
      return { data: updated, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  const effectiveSettings =
    settings ||
    ({
      ...DEFAULT_SETTINGS,
      user_id: user?.id || '',
      id: '',
      created_at: '',
      updated_at: '',
    } as ReceiptSettings)

  return {
    settings: effectiveSettings,
    loading,
    error,
    createOrUpdateSettings,
    refetch: fetchSettings,
  }
}
