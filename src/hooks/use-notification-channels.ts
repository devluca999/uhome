/**
 * Notification Channels Hook
 *
 * Manages user preferences for notification channels (email, push, in-app).
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'

export interface NotificationChannelPreferences {
  email: boolean
  push: boolean
  inApp: boolean
  emailDigest: boolean
  emailMarketing: boolean
}

export interface UseNotificationChannelsReturn {
  preferences: NotificationChannelPreferences | null
  loading: boolean
  error: string | null
  updatePreferences: (prefs: Partial<NotificationChannelPreferences>) => Promise<void>
  refresh: () => Promise<void>
}

const DEFAULT_PREFERENCES: NotificationChannelPreferences = {
  email: true,
  push: true,
  inApp: true,
  emailDigest: true,
  emailMarketing: false,
}

export function useNotificationChannels(): UseNotificationChannelsReturn {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<NotificationChannelPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch email preferences
      const { data: emailPrefs } = await supabase
        .from('email_preferences')
        .select('email_notifications_enabled, email_digest_enabled, email_marketing_enabled')
        .eq('user_id', user.id)
        .single()

      // Build preferences object
      const prefs: NotificationChannelPreferences = {
        email: emailPrefs?.email_notifications_enabled ?? DEFAULT_PREFERENCES.email,
        push: DEFAULT_PREFERENCES.push, // Push preferences managed separately
        inApp: DEFAULT_PREFERENCES.inApp, // In-app always enabled
        emailDigest: emailPrefs?.email_digest_enabled ?? DEFAULT_PREFERENCES.emailDigest,
        emailMarketing: emailPrefs?.email_marketing_enabled ?? DEFAULT_PREFERENCES.emailMarketing,
      }

      setPreferences(prefs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching notification preferences:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationChannelPreferences>) => {
      if (!user) {
        throw new Error('User must be logged in to update preferences')
      }

      try {
        setLoading(true)
        setError(null)

        // Update email preferences
        if ('email' in updates || 'emailDigest' in updates || 'emailMarketing' in updates) {
          const { error: emailError } = await supabase.from('email_preferences').upsert({
            user_id: user.id,
            email_notifications_enabled: updates.email ?? preferences?.email ?? true,
            email_digest_enabled: updates.emailDigest ?? preferences?.emailDigest ?? true,
            email_marketing_enabled: updates.emailMarketing ?? preferences?.emailMarketing ?? false,
            updated_at: new Date().toISOString(),
          })

          if (emailError) {
            throw emailError
          }
        }

        // Refresh preferences
        await fetchPreferences()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [user, preferences, fetchPreferences]
  )

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refresh: fetchPreferences,
  }
}
