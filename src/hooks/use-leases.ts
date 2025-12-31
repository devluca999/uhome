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
