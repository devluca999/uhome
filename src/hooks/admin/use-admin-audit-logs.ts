/**
 * Admin Audit Logs Hook — reads from compliance_audit_log table directly.
 * Replaced edge-function call (fetch-audit-logs) which doesn't exist in this environment.
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
  const [paginationData, setPaginationData] = useState<PaginatedAuditLogs['pagination'] | null>(null)

  useEffect(() => { fetchLogs() }, [
    filters.adminId, filters.targetUserId, filters.actionType,
    filters.startDate, filters.endDate, filters.searchEmail,
    pagination.page, pagination.pageSize,
  ])

  async function fetchLogs() {
    try {
      setLoading(true)
      setError(null)

      const page = pagination.page || 1
      const pageSize = pagination.pageSize || 50
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Query compliance_audit_log (the actual table that exists)
      let q = supabase
        .from('compliance_audit_log')
        .select('id, action, user_id, actor_id, timestamp, metadata, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filters.startDate) q = q.gte('created_at', filters.startDate)
      if (filters.endDate)   q = q.lte('created_at', filters.endDate)

      const { data, error: qErr, count } = await q
      if (qErr) throw qErr

      // Map compliance_audit_log shape to AdminAuditLog shape
      const mapped: AdminAuditLog[] = (data || []).map((row: any) => ({
        id: row.id,
        admin_id: row.actor_id || '',
        admin_email: row.metadata?.actor_email || null,
        action_type: row.action || 'unknown',
        target_user_id: row.user_id || '',
        target_user_email: row.metadata?.target_email || null,
        target_user_role: row.metadata?.target_role || null,
        reason: row.metadata?.reason || null,
        metadata: row.metadata || {},
        ip_address: row.metadata?.ip_address || null,
        user_agent: row.metadata?.user_agent || null,
        created_at: row.created_at,
      }))

      const total = count || 0
      const totalPages = Math.ceil(total / pageSize)

      setLogs(mapped)
      setPaginationData({
        page, pageSize, total, totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      })
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      setError(err as Error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  return { logs, loading, error, pagination: paginationData, refetch: fetchLogs }
}
