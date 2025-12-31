import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type { Database } from '@/types/database'

type PropertyGroup = Database['public']['Tables']['property_groups']['Row']
type PropertyGroupInsert = Database['public']['Tables']['property_groups']['Insert']
type PropertyGroupUpdate = Database['public']['Tables']['property_groups']['Update']

export function usePropertyGroups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<PropertyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (user) {
      fetchGroups()
    }
  }, [user])

  async function fetchGroups() {
    if (!user) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('property_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (fetchError) throw fetchError
      setGroups(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createGroup(data: PropertyGroupInsert) {
    if (!user) return { data: null, error: new Error('Not authenticated') }

    try {
      const { data: newGroup, error: createError } = await supabase
        .from('property_groups')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single()

      if (createError) throw createError

      setGroups(prev => [...prev, newGroup].sort((a, b) => a.name.localeCompare(b.name)))
      return { data: newGroup, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function updateGroup(id: string, data: PropertyGroupUpdate) {
    try {
      const { data: updatedGroup, error: updateError } = await supabase
        .from('property_groups')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setGroups(prev => prev.map(g => (g.id === id ? updatedGroup : g)))
      return { data: updatedGroup, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function deleteGroup(id: string) {
    try {
      const { error: deleteError } = await supabase.from('property_groups').delete().eq('id', id)

      if (deleteError) throw deleteError

      setGroups(prev => prev.filter(g => g.id !== id))
      return { error: null }
    } catch (err) {
      const error = err as Error
      return { error }
    }
  }

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    refetch: fetchGroups,
  }
}

export function usePropertyGroupAssignments(propertyId?: string) {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Array<{ group_id: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (propertyId && user) {
      fetchAssignments()
    }
  }, [propertyId, user])

  async function fetchAssignments() {
    if (!propertyId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('property_group_assignments')
        .select('group_id')
        .eq('property_id', propertyId)

      if (error) throw error
      setAssignments(data || [])
    } catch (err) {
      console.error('Error fetching assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  async function setAssignmentsForProperty(groupIds: string[]) {
    if (!propertyId) return { error: new Error('No property ID') }

    try {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from('property_group_assignments')
        .delete()
        .eq('property_id', propertyId)

      if (deleteError) throw deleteError

      // Insert new assignments
      if (groupIds.length > 0) {
        const { error: insertError } = await supabase
          .from('property_group_assignments')
          .insert(groupIds.map(groupId => ({ property_id: propertyId, group_id: groupId })))

        if (insertError) throw insertError
      }

      await fetchAssignments()
      return { error: null }
    } catch (err) {
      const error = err as Error
      return { error }
    }
  }

  return {
    assignments: assignments.map(a => a.group_id),
    loading,
    setAssignments: setAssignmentsForProperty,
    refetch: fetchAssignments,
  }
}
