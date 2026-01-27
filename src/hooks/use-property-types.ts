import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type { Database } from '@/types/database'

type UserPropertyType = Database['public']['Tables']['user_property_types']['Row']
// UserPropertyTypeInsert removed - not used

const PREDEFINED_TYPES = ['studio', '1-bedroom', '2-bedroom', 'house', 'other'] as const

export function usePropertyTypes() {
  const { user } = useAuth()
  const [customTypes, setCustomTypes] = useState<UserPropertyType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (user) {
      fetchCustomTypes()
    }
  }, [user])

  async function fetchCustomTypes() {
    if (!user) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('user_property_types')
        .select('*')
        .eq('user_id', user.id)
        .order('type_name', { ascending: true })

      if (fetchError) throw fetchError
      setCustomTypes(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createCustomType(typeName: string) {
    if (!user) return { data: null, error: new Error('Not authenticated') }

    try {
      const { data, error: createError } = await supabase
        .from('user_property_types')
        .insert({
          user_id: user.id,
          type_name: typeName.trim(),
        })
        .select()
        .single()

      if (createError) throw createError

      setCustomTypes(prev => [...prev, data].sort((a, b) => a.type_name.localeCompare(b.type_name)))
      return { data, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function deleteCustomType(id: string) {
    try {
      const { error: deleteError } = await supabase
        .from('user_property_types')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setCustomTypes(prev => prev.filter(t => t.id !== id))
      return { error: null }
    } catch (err) {
      const error = err as Error
      return { error }
    }
  }

  const allTypes = [...PREDEFINED_TYPES, ...customTypes.map(t => t.type_name)]

  return {
    predefinedTypes: PREDEFINED_TYPES,
    customTypes,
    allTypes,
    loading,
    error,
    createCustomType,
    deleteCustomType,
    refetch: fetchCustomTypes,
  }
}
