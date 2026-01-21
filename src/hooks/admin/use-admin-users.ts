import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export type AccountStatus = 'active' | 'suspended' | 'banned' | 'locked'

export interface AdminUser {
  id: string
  email: string | null
  role: 'landlord' | 'tenant' | 'admin'
  account_status: AccountStatus | null
  is_locked: boolean | null
  locked_until: string | null
  banned_at: string | null
  suspended_at: string | null
  created_at: string
  updated_at: string
  last_sign_in_at?: string | null
  auth_provider?: string | null
}

export interface UserFilters {
  role?: 'landlord' | 'tenant' | 'admin'
  accountStatus?: AccountStatus | 'suspended_or_banned_or_locked' // Special filter for suspended/flagged tab
}

export function useAdminUsers(filters: UserFilters = {}) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchUsers()
    // Only refetch when filters actually change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role, filters.accountStatus])

  async function fetchUsers() {
    try {
      setLoading(true)
      setError(null)

      // Build query
      let query = supabase.from('users').select('*').order('created_at', { ascending: false })

      // Apply filters
      if (filters.role) {
        query = query.eq('role', filters.role)
      }

      if (filters.accountStatus) {
        if (filters.accountStatus === 'suspended_or_banned_or_locked') {
          // Special filter for suspended/flagged tab
          query = query.or(
            'account_status.eq.suspended,account_status.eq.banned,account_status.eq.locked'
          )
        } else {
          query = query.eq('account_status', filters.accountStatus)
        }
      }

      const { data, error: usersError } = await query

      if (usersError) throw usersError

      // Map users to AdminUser interface
      const usersWithAuth: AdminUser[] = (data || []).map(user => ({
        id: user.id,
        email: user.email,
        role: user.role as 'landlord' | 'tenant' | 'admin',
        account_status: (user.account_status as AccountStatus) || 'active',
        is_locked: user.is_locked || false,
        locked_until: user.locked_until || null,
        banned_at: user.banned_at || null,
        suspended_at: user.suspended_at || null,
        created_at: user.created_at,
        updated_at: user.updated_at,
        // Note: last_sign_in_at and auth_provider would need to come from auth.users
        // which may not be directly accessible. These fields are optional.
        last_sign_in_at: null,
        auth_provider: null,
      }))

      setUsers(usersWithAuth)
    } catch (err) {
      console.error('Error fetching admin users:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return { users, loading, error, refetch: fetchUsers }
}
