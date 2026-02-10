/**
 * Opt-In Logic
 * 
 * Handles opt-in/opt-out preferences for lead enrollment.
 */

import { supabase } from '@/lib/supabase/client'

export type OptInStatus = 'opted_in' | 'opted_out' | 'pending' | 'unknown'

export interface OptInCheck {
  canEnroll: boolean
  status: OptInStatus
  reason?: string
}

/**
 * Check if user can be enrolled (respects opt-out)
 */
export async function checkOptIn(email: string): Promise<OptInCheck> {
  try {
    // Check email preferences
    const { data: emailPrefs } = await supabase
      .from('email_preferences')
      .select('email_notifications_enabled')
      .eq('user_id', email) // Note: This assumes email is used as identifier
      .single()

    // If user exists and has opted out, don't enroll
    if (emailPrefs && !emailPrefs.email_notifications_enabled) {
      return {
        canEnroll: false,
        status: 'opted_out',
        reason: 'User has opted out of email notifications',
      }
    }

    // Check if lead already exists and has opt-out status
    const { data: existingLead } = await supabase
      .from('leads')
      .select('opt_in_status')
      .eq('normalized_email', email.toLowerCase().trim())
      .limit(1)
      .maybeSingle()

    if (existingLead?.opt_in_status === 'opted_out') {
      return {
        canEnroll: false,
        status: 'opted_out',
        reason: 'Lead has previously opted out',
      }
    }

    // Default: can enroll (no explicit opt-out found)
    return {
      canEnroll: true,
      status: existingLead?.opt_in_status || 'unknown',
    }
  } catch (error) {
    console.error('Error checking opt-in:', error)
    // Fail open: allow enrollment if check fails
    return {
      canEnroll: true,
      status: 'unknown',
      reason: 'Opt-in check failed, defaulting to allow',
    }
  }
}

/**
 * Determine opt-in status for a new lead
 */
export function determineOptInStatus(
  explicitOptIn?: boolean,
  existingStatus?: OptInStatus
): OptInStatus {
  if (explicitOptIn === true) {
    return 'opted_in'
  }
  if (explicitOptIn === false) {
    return 'opted_out'
  }
  if (existingStatus) {
    return existingStatus
  }
  return 'unknown'
}
