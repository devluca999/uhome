import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Property = Database['public']['Tables']['properties']['Row']

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchProperties()
  }, [])

  async function fetchProperties() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProperties(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createProperty(property: {
    name: string
    address?: string
    rent_amount: number
    rent_due_date?: number
    rules?: string
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...property,
        owner_id: user.id,
      })
      .select()
      .single()

    if (error) throw error
    setProperties([data, ...properties])
    return data
  }

  async function updateProperty(id: string, updates: Partial<Property>) {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setProperties(properties.map(p => (p.id === id ? data : p)))
    return data
  }

  async function deleteProperty(id: string) {
    const { error } = await supabase.from('properties').delete().eq('id', id)

    if (error) throw error
    setProperties(properties.filter(p => p.id !== id))
  }

  return {
    properties,
    loading,
    error,
    createProperty,
    updateProperty,
    deleteProperty,
    refetch: fetchProperties,
  }
}
