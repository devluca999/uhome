import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row']
type LeaseInsert = Database['public']['Tables']['leases']['Insert']
type LeaseUpdate = Database['public']['Tables']['leases']['Update']

export function useLeases(propertyId?: string, tenantId?: string) {
  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchLeases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, tenantId])

  async function fetchLeases() {
    try {
      setLoading(true)
      let query = supabase
        .from('leases')
        .select('*')
        .order('lease_start_date', { ascending: false })

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setLeases(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createLease(data: LeaseInsert) {
    try {
      const { data: newLease, error: createError } = await supabase
        .from('leases')
        .insert(data)
        .select()
        .single()

      if (createError) throw createError

      setLeases(prev => [newLease, ...prev])
      return { data: newLease, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function updateLease(id: string, data: LeaseUpdate) {
    try {
      // Check if lease is ended before attempting update (if status column exists)
      try {
        const { data: existingLease, error: fetchError } = await supabase
          .from('leases')
          .select('status')
          .eq('id', id)
          .single()

        if (!fetchError && existingLease?.status === 'ended') {
          return {
            data: null,
            error: new Error(
              'This lease has ended and cannot be modified. Ended leases are immutable.'
            ),
          }
        }
        // If status column doesn't exist (42703), continue without the check
        if (fetchError && fetchError.code !== '42703') {
          throw fetchError
        }
      } catch (e) {
        // If status column doesn't exist, continue without the check
        if ((e as any)?.code !== '42703') {
          throw e
        }
      }

      const { data: updatedLease, error: updateError } = await supabase
        .from('leases')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setLeases(prev => prev.map(l => (l.id === id ? updatedLease : l)))
      return { data: updatedLease, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function deleteLease(id: string) {
    try {
      // Check if lease is ended before attempting delete (if status column exists)
      try {
        const { data: existingLease, error: fetchError } = await supabase
          .from('leases')
          .select('status')
          .eq('id', id)
          .single()

        if (!fetchError && existingLease?.status === 'ended') {
          return {
            error: new Error(
              'This lease has ended and cannot be deleted. Ended leases are immutable for historical record preservation.'
            ),
          }
        }
        // If status column doesn't exist (42703), continue without the check
        if (fetchError && fetchError.code !== '42703') {
          throw fetchError
        }
      } catch (e) {
        // If status column doesn't exist, continue without the check
        if ((e as any)?.code !== '42703') {
          throw e
        }
      }

      const { error: deleteError } = await supabase.from('leases').delete().eq('id', id)

      if (deleteError) throw deleteError

      setLeases(prev => prev.filter(l => l.id !== id))
      return { error: null }
    } catch (err) {
      const error = err as Error
      return { error }
    }
  }

  return {
    leases,
    loading,
    error,
    createLease,
    updateLease,
    deleteLease,
    refetch: fetchLeases,
  }
}
