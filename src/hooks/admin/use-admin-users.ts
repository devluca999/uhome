import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface AdminUser {
  id: string
  email: string | null
  role: 'landlord' | 'tenant' | 'admin'
  created_at: string
  updated_at: string
  last_sign_in_at?: string | null
  auth_provider?: string | null
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      setLoading(true)
      setError(null)

      // Fetch users from public.users table
      const { data, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Try to get auth metadata (may not be accessible depending on RLS)
      // For now, we'll use what we have from public.users
      const usersWithAuth: AdminUser[] = (data || []).map(user => ({
        id: user.id,
        email: user.email,
        role: user.role as 'landlord' | 'tenant' | 'admin',
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
