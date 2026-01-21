/**
 * Security Scanner
 *
 * Security monitoring utilities for logging failed logins, invalid API calls,
 * suspicious activity, and rate limit violations.
 */

import { supabase } from '@/lib/supabase/client'
import { anonymizeUserId, anonymizeEmail, anonymizeIpAddress } from '@/lib/admin/data-anonymizer'

export type SecurityEventType =
  | 'failed_login'
  | 'invalid_api_call'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
export type SecuritySeverity = 'low' | 'medium' | 'high'

export interface SecurityLog {
  user_id?: string // Anonymized, nullable for anonymous events
  user_role?: 'tenant' | 'landlord' | 'admin'
  event_type: SecurityEventType
  severity: SecuritySeverity
  ip_address?: string // Hashed
  user_agent?: string
  details?: Record<string, unknown>
}

/**
 * Log failed login attempt
 */
export async function logFailedLogin(email: string, reason: string, ipAddress?: string) {
  try {
    const log: SecurityLog = {
      event_type: 'failed_login',
      severity: 'medium',
      ip_address: ipAddress ? anonymizeIpAddress(ipAddress) : undefined,
      user_agent: navigator.userAgent,
      details: {
        email: anonymizeEmail(email),
        reason,
        timestamp: new Date().toISOString(),
      },
    }

    await logSecurityEvent(log)
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

/**
 * Log invalid API call
 */
export async function logInvalidAPICall(
  endpoint: string,
  userId: string | null,
  details: Record<string, unknown>
) {
  try {
    let userRole: 'tenant' | 'landlord' | 'admin' | undefined

    if (userId) {
      // Fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (userData) {
        userRole = userData.role as 'tenant' | 'landlord' | 'admin'
      }
    }

    const log: SecurityLog = {
      user_id: userId ? anonymizeUserId(userId) : undefined,
      user_role: userRole,
      event_type: 'invalid_api_call',
      severity: 'low',
      user_agent: navigator.userAgent,
      details: {
        endpoint,
        ...details,
        timestamp: new Date().toISOString(),
      },
    }

    await logSecurityEvent(log)
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  userId: string,
  activity: string,
  details: Record<string, unknown>
) {
  try {
    // Fetch user role
    const { data: userData } = await supabase.from('users').select('role').eq('id', userId).single()

    const userRole = userData?.role as 'tenant' | 'landlord' | 'admin' | undefined

    const log: SecurityLog = {
      user_id: anonymizeUserId(userId),
      user_role: userRole,
      event_type: 'suspicious_activity',
      severity: 'high',
      user_agent: navigator.userAgent,
      details: {
        activity,
        ...details,
        timestamp: new Date().toISOString(),
      },
    }

    await logSecurityEvent(log)
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

/**
 * Log rate limit violation
 */
export async function logRateLimitViolation(
  userId: string,
  actionType: string,
  details: Record<string, unknown>
) {
  try {
    // Fetch user role
    const { data: userData } = await supabase.from('users').select('role').eq('id', userId).single()

    const userRole = userData?.role as 'tenant' | 'landlord' | 'admin' | undefined

    const log: SecurityLog = {
      user_id: anonymizeUserId(userId),
      user_role: userRole,
      event_type: 'rate_limit_exceeded',
      severity: 'medium',
      user_agent: navigator.userAgent,
      details: {
        action_type: actionType,
        ...details,
        timestamp: new Date().toISOString(),
      },
    }

    await logSecurityEvent(log)
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

/**
 * Check for rate limit violations in recent history
 */
export async function checkRateLimitViolation(
  userId: string,
  actionType: string
): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    // Check rate_limit_tracking table
    const { count } = await supabase
      .from('rate_limit_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .gte('created_at', oneHourAgo)

    // If more than 50 actions in last hour, consider it suspicious
    return (count || 0) > 50
  } catch (error) {
    console.error('Failed to check rate limit violation:', error)
    return false
  }
}

/**
 * Log security event to database via Edge Function
 */
async function logSecurityEvent(log: SecurityLog) {
  try {
    // Call Edge Function to insert security log (service role access)
    const { error } = await supabase.functions.invoke('log-security-event', {
      body: { log },
    })

    if (error) {
      console.error('Failed to log security event:', error)
    }
  } catch (error) {
    console.error('Error logging security event:', error)
  }
}
