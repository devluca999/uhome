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
          user:users(email, role),
          property:properties(name, address)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      setTenants(data || [])
    } catch (err) {
      setError(err as Error)
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
      .select(
        `
        *,
        user:users(email, role),
        property:properties(name, address)
      `
      )
      .single()

    if (error) throw error
    setTenants([data, ...tenants])
    return data
  }

  async function updateTenant(id: string, updates: Partial<Tenant>) {
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        user:users(email, role),
        property:properties(name, address)
      `
      )
      .single()

    if (error) throw error
    setTenants(tenants.map(t => (t.id === id ? data : t)))
    return data
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
