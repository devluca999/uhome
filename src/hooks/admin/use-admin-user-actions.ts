/**
 * Admin User Actions Hook
 *
 * React hook for performing admin actions on users (ban, lock, reset password, etc.)
 * All actions are logged to admin_audit_logs table for accountability.
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { checkAdminRateLimit, recordFailedAdminAttempt } from '@/middleware/admin-rate-limit'

export type AdminAction =
  | 'ban'
  | 'unban'
  | 'lock'
  | 'unlock'
  | 'suspend'
  | 'unsuspend'
  | 'reset_password'
  | 'force_logout'
  | 'delete'

export interface AdminActionParams {
  userId: string
  reason?: string
  duration?: number // Duration in milliseconds for lock action
  metadata?: Record<string, unknown>
}

export interface AdminActionResult {
  success: boolean
  action: AdminAction
  userId: string
  auditLogId?: string
  error?: string
}

export function useAdminUserActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()

  /**
   * Perform an admin action on a user
   */
  async function performAction(
    action: AdminAction,
    params: AdminActionParams
  ): Promise<AdminActionResult> {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        throw new Error('User not authenticated')
      }

      // Check rate limit before performing action
      const rateLimitCheck = checkAdminRateLimit(action)
      if (!rateLimitCheck.allowed) {
        const resetTime = rateLimitCheck.resetAt
          ? new Date(rateLimitCheck.resetAt).toLocaleTimeString()
          : 'soon'
        throw new Error(
          `Rate limit exceeded. Too many ${action} actions. Please try again after ${resetTime}`
        )
      }

      // Call Edge Function to perform action
      const { data, error: actionError } = await supabase.functions.invoke('admin-actions', {
        body: {
          action,
          userId: params.userId,
          reason: params.reason,
          duration: params.duration,
          metadata: params.metadata,
        },
      })

      if (actionError) {
        // Record failed attempt for rate limiting
        recordFailedAdminAttempt(action)
        throw actionError
      }

      if (!data || !data.success) {
        // Record failed attempt for rate limiting
        recordFailedAdminAttempt(action)
        throw new Error(data?.error || 'Failed to perform action')
      }

      return {
        success: true,
        action,
        userId: params.userId,
        auditLogId: data.auditLogId,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(err as Error)

      return {
        success: false,
        action,
        userId: params.userId,
        error: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Ban a user
   */
  async function banUser(userId: string, reason?: string): Promise<AdminActionResult> {
    return performAction('ban', { userId, reason })
  }

  /**
   * Unban a user
   */
  async function unbanUser(userId: string, reason?: string): Promise<AdminActionResult> {
    return performAction('unban', { userId, reason })
  }

  /**
   * Lock a user (temporary or indefinite)
   */
  async function lockUser(
    userId: string,
    reason?: string,
    duration?: number
  ): Promise<AdminActionResult> {
    return performAction('lock', { userId, reason, duration })
  }

  /**
   * Unlock a user
   */
  async function unlockUser(userId: string, reason?: string): Promise<AdminActionResult> {
    return performAction('unlock', { userId, reason })
  }

  /**
   * Suspend a user
   */
  async function suspendUser(userId: string, reason?: string): Promise<AdminActionResult> {
    return performAction('suspend', { userId, reason })
  }

  /**
   * Unsuspend a user
   */
  async function unsuspendUser(userId: string, reason?: string): Promise<AdminActionResult> {
    return performAction('unsuspend', { userId, reason })
  }

  /**
   * Reset user password (triggers password reset email)
   */
  async function resetPassword(userId: string, reason?: string): Promise<AdminActionResult> {
    return performAction('reset_password', { userId, reason })
  }

  /**
   * Force logout a user (invalidates all sessions)
   */
  async function forceLogout(userId: string, reason?: string): Promise<AdminActionResult> {
    return performAction('force_logout', { userId, reason })
  }

  /**
   * Delete a user (permanently deletes account and all data)
   */
  async function deleteUser(userId: string, reason?: string): Promise<AdminActionResult> {
    return performAction('delete', { userId, reason })
  }

  return {
    loading,
    error,
    performAction,
    banUser,
    unbanUser,
    lockUser,
    unlockUser,
    suspendUser,
    unsuspendUser,
    resetPassword,
    forceLogout,
    deleteUser,
  }
}
