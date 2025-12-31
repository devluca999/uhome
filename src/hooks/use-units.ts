import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type { Database } from '@/types/database'

type Unit = Database['public']['Tables']['units']['Row']
type UnitInsert = Database['public']['Tables']['units']['Insert']
type UnitUpdate = Database['public']['Tables']['units']['Update']

export function useUnits(propertyId?: string) {
  const { user } = useAuth()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (propertyId && user) {
      fetchUnits()
    } else {
      setUnits([])
      setLoading(false)
    }
  }, [propertyId, user])

  async function fetchUnits() {
    if (!propertyId) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', propertyId)
        .order('unit_name', { ascending: true })

      if (fetchError) throw fetchError
      setUnits(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createUnit(unit: Omit<UnitInsert, 'property_id'>) {
    if (!propertyId) return { data: null, error: new Error('No property ID') }

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
