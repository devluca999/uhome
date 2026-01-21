/**
 * Admin Audit Logs Hook
 *
 * React hook for fetching admin audit logs with filtering capabilities.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface AdminAuditLog {
  id: string
  admin_id: string
  admin_email: string | null
  action_type: string
  target_user_id: string
  target_user_email: string | null
  target_user_role: string | null
  reason: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogFilters {
  adminId?: string
  targetUserId?: string
  actionType?: string
  startDate?: string
  endDate?: string
  searchEmail?: string
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedAuditLogs {
  data: AdminAuditLog[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function useAdminAuditLogs(
  filters: AuditLogFilters = {},
  pagination: PaginationParams = {}
) {
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [paginationData, setPaginationData] = useState<PaginatedAuditLogs['pagination'] | null>(
    null
  )

  useEffect(() => {
    fetchLogs()
  }, [
    filters.adminId,
    filters.targetUserId,
    filters.actionType,
    filters.startDate,
    filters.endDate,
    filters.searchEmail,
    pagination.page,
    pagination.pageSize,
  ])

  async function fetchLogs() {
    try {
      setLoading(true)
      setError(null)

      // Get session for auth token
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Build query parameters
      const params = new URLSearchParams()

      if (filters.adminId) params.set('adminId', filters.adminId)
      if (filters.targetUserId) params.set('targetUserId', filters.targetUserId)
      if (filters.actionType) params.set('actionType', filters.actionType)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.searchEmail) params.set('searchEmail', filters.searchEmail)

      params.set('page', String(pagination.page || 1))
      params.set('pageSize', String(pagination.pageSize || 50))

      // Construct function URL with query params
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const functionUrl = `${supabaseUrl}/functions/v1/fetch-audit-logs?${params.toString()}`

      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch audit logs')
      }

      const result: PaginatedAuditLogs = await response.json()

      setLogs(result.data)
      setPaginationData(result.pagination)
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return {
    logs,
    loading,
    error,
    pagination: paginationData,
    refetch: fetchLogs,
  }
}
