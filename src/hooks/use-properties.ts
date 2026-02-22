import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { getProperties } from '@/lib/data/property-service'
import type { Database } from '@/types/database'

type Property = Database['public']['Tables']['properties']['Row']

function isDemoMode(viewMode: string, role: string | null): boolean {
  return role === 'admin' && (viewMode === 'landlord-demo' || viewMode === 'tenant-demo')
}

export function useProperties() {
  const { role, viewMode, demoState } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getProperties(viewMode, demoState)
      setProperties(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [viewMode, demoState])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProperties()
    }, 100)
    return () => clearTimeout(timer)
  }, [fetchProperties])

  async function createProperty(property: {
    name: string
    address?: string
    rent_amount: number
    rent_due_date?: number
    rules?: string
    property_type?: string | null
    group_ids?: string[]
  }) {
    if (isDemoMode(viewMode, role)) return Promise.resolve(null as any)
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
    if (isDemoMode(viewMode, role)) return Promise.resolve(null as any)
    const { group_ids, ...propertyUpdates } = updates

    // Filter out undefined values and null values for optional fields that might not exist in schema
    const cleanUpdates = Object.fromEntries(
      Object.entries(propertyUpdates).filter(([_, value]) => value !== undefined)
    )

    const { data, error } = await supabase
      .from('properties')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // If error is due to unknown column (e.g., late_fee_rules not migrated),
      // filter it out and retry
      if (error.code === '42703' && 'late_fee_rules' in cleanUpdates) {
        const { late_fee_rules, ...updatesWithoutLateFee } = cleanUpdates
        const { data: retryData, error: retryError } = await supabase
          .from('properties')
          .update(updatesWithoutLateFee)
          .eq('id', id)
          .select()
          .single()

        if (retryError) throw retryError
        // Update successful without late_fee_rules - log warning
        console.warn(
          'late_fee_rules column not found - update completed without it. Run migration add_late_fee_rules_to_properties.sql'
        )
        setProperties(properties.map(p => (p.id === id ? retryData : p)))
        return retryData
      }
      throw error
    }

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
    if (isDemoMode(viewMode, role)) return
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
