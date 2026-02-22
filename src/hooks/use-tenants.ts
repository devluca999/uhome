import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { getTenants } from '@/lib/data/tenant-service'
import { landlordDemoProperties } from '@/demo-data/landlordDemoData'

export type Tenant = {
  id: string
  user_id: string
  property_id: string
  move_in_date: string
  lease_end_date?: string | null
  phone?: string | null
  notes?: string | null
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

function isDemoMode(viewMode: string, role: string | null): boolean {
  return role === 'admin' && (viewMode === 'landlord-demo' || viewMode === 'tenant-demo')
}

export function useTenants() {
  const { role, viewMode, demoState } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true)
      if (isDemoMode(viewMode, role)) {
        const rawTenants = await getTenants(viewMode, demoState)
        const enriched = rawTenants.map(t => {
          const prop = landlordDemoProperties.find(p => p.id === t.property_id)
          return {
            ...t,
            property_id: t.property_id || '',
            user: { email: 'demo@example.com', role: 'tenant' },
            property: prop ? { name: prop.name, address: prop.address ?? undefined } : undefined,
          }
        })
        setTenants(enriched)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select(
          `
          *,
          users!tenants_user_id_fkey(email, role),
          properties!tenants_property_id_fkey(name, address)
        `
        )
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.warn('Nested query failed, trying simple query:', fetchError)
        const { data: simpleData, error: simpleError } = await supabase
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false })
        if (simpleError) throw simpleError
        const tenantsWithRelations = await Promise.all(
          (simpleData || []).map(async tenant => {
            const [userData, propertyData] = await Promise.all([
              supabase.from('users').select('email, role').eq('id', tenant.user_id).single(),
              tenant.property_id
                ? supabase
                    .from('properties')
                    .select('name, address')
                    .eq('id', tenant.property_id)
                    .single()
                : Promise.resolve({ data: null }),
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
  }, [viewMode, demoState, role])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  async function createTenant(tenant: {
    user_id: string
    property_id: string
    move_in_date: string
    lease_end_date?: string
    phone?: string
    notes?: string
  }) {
    if (isDemoMode(viewMode, role)) return null as any
    const { data, error } = await supabase.from('tenants').insert(tenant).select('*').single()

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
    if (isDemoMode(viewMode, role)) return null as any
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
    if (isDemoMode(viewMode, role)) return
    const { error } = await supabase.from('tenants').delete().eq('id', id)

    if (error) throw error
    setTenants(tenants.filter(t => t.id !== id))
  }

  async function unlinkTenant(id: string) {
    if (isDemoMode(viewMode, role)) return
    // Set property_id to null to unlink tenant from property
    // Tenant record persists (per tenant lifecycle docs)
    const { data, error } = await supabase
      .from('tenants')
      .update({ property_id: null })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    // Fetch related data for updated tenant
    const [userData] = await Promise.all([
      supabase.from('users').select('email, role').eq('id', data.user_id).single(),
    ])

    const tenantWithRelations = {
      ...data,
      user: userData.data || undefined,
      property: undefined, // No property after unlink
    }

    // Update local state
    setTenants(tenants.map(t => (t.id === id ? tenantWithRelations : t)))
  }

  return {
    tenants,
    loading,
    error,
    createTenant,
    updateTenant,
    deleteTenant,
    unlinkTenant,
    refetch: fetchTenants,
  }
}
