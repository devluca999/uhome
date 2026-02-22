import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { getUnits } from '@/lib/data/unit-service'
import type { Database } from '@/types/database'

type Unit = Database['public']['Tables']['units']['Row']
type UnitInsert = Database['public']['Tables']['units']['Insert']
type UnitUpdate = Database['public']['Tables']['units']['Update']

function isDemoMode(viewMode: string, role: string | null): boolean {
  return role === 'admin' && (viewMode === 'landlord-demo' || viewMode === 'tenant-demo')
}

export function useUnits(propertyId?: string) {
  const { user, role, viewMode, demoState } = useAuth()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUnits = useCallback(async () => {
    if (!propertyId) return

    try {
      setLoading(true)
      const data = await getUnits(propertyId, viewMode, demoState)
      setUnits(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [propertyId, viewMode, demoState])

  useEffect(() => {
    if (propertyId && (user || isDemoMode(viewMode, role))) {
      fetchUnits()
    } else {
      setUnits([])
      setLoading(false)
    }
  }, [propertyId, user, role, viewMode, fetchUnits])

  async function createUnit(unit: Omit<UnitInsert, 'property_id'>) {
    if (!propertyId) return { data: null, error: new Error('No property ID') }
    if (isDemoMode(viewMode, role)) return { data: null, error: null }

    try {
      const { data: newUnit, error: createError } = await supabase
        .from('units')
        .insert({ ...unit, property_id: propertyId })
        .select()
        .single()

      if (createError) throw createError

      setUnits(prev => [...prev, newUnit].sort((a, b) => a.unit_name.localeCompare(b.unit_name)))
      return { data: newUnit, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function updateUnit(id: string, updates: UnitUpdate) {
    if (isDemoMode(viewMode, role)) return { data: null, error: null }
    try {
      const { data: updatedUnit, error: updateError } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setUnits(prev => prev.map(u => (u.id === id ? updatedUnit : u)))
      return { data: updatedUnit, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function deleteUnit(id: string) {
    if (isDemoMode(viewMode, role)) return { error: null }
    try {
      const { error: deleteError } = await supabase.from('units').delete().eq('id', id)

      if (deleteError) throw deleteError

      setUnits(prev => prev.filter(u => u.id !== id))
      return { error: null }
    } catch (err) {
      const error = err as Error
      return { error }
    }
  }

  return {
    units,
    loading,
    error,
    createUnit,
    updateUnit,
    deleteUnit,
    refetch: fetchUnits,
  }
}
