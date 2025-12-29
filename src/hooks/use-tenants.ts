import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

type Tenant = {
  id: string
  user_id: string
  property_id: string
  move_in_date: string
  lease_end_date?: string
  created_at: string
  updated_at: string
  user?: {
    email: string
    role: string
  }
  property?: {
    name: string
    address?: string
  }
}

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tenants')
        .select(
          `
          *,
          users!tenants_user_id_fkey(email, role),
          properties!tenants_property_id_fkey(name, address)
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
        // Fallback to simpler query if nested select fails
        console.warn('Nested query failed, trying simple query:', error)
        const { data: simpleData, error: simpleError } = await supabase
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false })

        if (simpleError) throw simpleError

        // Fetch related data separately
        const tenantsWithRelations = await Promise.all(
          (simpleData || []).map(async tenant => {
            const [userData, propertyData] = await Promise.all([
              supabase.from('users').select('email, role').eq('id', tenant.user_id).single(),
              supabase.from('properties').select('name, address').eq('id', tenant.property_id).single(),
            ])

            return {
              ...tenant,
              user: userData.data || undefined,
              property: propertyData.data || undefined,
            }
          })
        )

        setTenants(tenantsWithRelations)
        return
      }

      // Map the nested structure to match our type
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        user: item.users,
        property: item.properties,
      }))

      setTenants(mappedData)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching tenants:', err)
    } finally {
      setLoading(false)
    }
  }

  async function createTenant(tenant: {
    user_id: string
    property_id: string
    move_in_date: string
    lease_end_date?: string
  }) {
    const { data, error } = await supabase
      .from('tenants')
      .insert(tenant)
      .select('*')
      .single()

    if (error) throw error

    // Fetch related data
    const [userData, propertyData] = await Promise.all([
      supabase.from('users').select('email, role').eq('id', data.user_id).single(),
      supabase.from('properties').select('name, address').eq('id', data.property_id).single(),
    ])

    const tenantWithRelations = {
      ...data,
      user: userData.data || undefined,
      property: propertyData.data || undefined,
    }

    setTenants([tenantWithRelations, ...tenants])
    return tenantWithRelations
  }

  async function updateTenant(id: string, updates: Partial<Tenant>) {
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    // Fetch related data
    const [userData, propertyData] = await Promise.all([
      supabase.from('users').select('email, role').eq('id', data.user_id).single(),
      supabase.from('properties').select('name, address').eq('id', data.property_id).single(),
    ])

    const tenantWithRelations = {
      ...data,
      user: userData.data || undefined,
      property: propertyData.data || undefined,
    }

    setTenants(tenants.map(t => (t.id === id ? tenantWithRelations : t)))
    return tenantWithRelations
  }

  async function deleteTenant(id: string) {
    const { error } = await supabase.from('tenants').delete().eq('id', id)

    if (error) throw error
    setTenants(tenants.filter(t => t.id !== id))
  }

  return {
    tenants,
    loading,
    error,
    createTenant,
    updateTenant,
    deleteTenant,
    refetch: fetchTenants,
  }
}
