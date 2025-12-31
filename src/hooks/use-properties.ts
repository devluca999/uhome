import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Property = Database['public']['Tables']['properties']['Row']

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Wait a bit for auth to initialize
    const timer = setTimeout(() => {
      fetchProperties()
    }, 100)
    return () => clearTimeout(timer)
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
    property_type?: string | null
    group_ids?: string[]
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { property_type, group_ids, ...propertyData } = property

    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        property_type: property_type || null,
        owner_id: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Handle group assignments if provided
    if (group_ids && group_ids.length > 0) {
      const { error: assignmentError } = await supabase.from('property_group_assignments').insert(
        group_ids.map(groupId => ({
          property_id: data.id,
          group_id: groupId,
        }))
      )

      if (assignmentError) {
        console.error('Error assigning groups:', assignmentError)
        // Continue anyway - property was created
      }
    }

    setProperties([data, ...properties])
    return data
  }

  async function updateProperty(id: string, updates: Partial<Property & { group_ids?: string[] }>) {
    const { group_ids, ...propertyUpdates } = updates

    const { data, error } = await supabase
      .from('properties')
      .update(propertyUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Handle group assignments if provided
    if (group_ids !== undefined) {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from('property_group_assignments')
        .delete()
        .eq('property_id', id)

      if (deleteError) {
        console.error('Error deleting group assignments:', deleteError)
      }

      // Insert new assignments
      if (group_ids.length > 0) {
        const { error: insertError } = await supabase.from('property_group_assignments').insert(
          group_ids.map(groupId => ({
            property_id: id,
            group_id: groupId,
          }))
        )

        if (insertError) {
          console.error('Error inserting group assignments:', insertError)
        }
      }
    }

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
