import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useTenantDevMode } from '@/contexts/tenant-dev-mode-context'
import { useAuth } from '@/contexts/auth-context'

type TenantData = {
  tenant: {
    id: string
    property_id: string
    move_in_date: string
    lease_end_date?: string
  }
  property: {
    id: string
    name: string
    address?: string
    rent_amount: number
    rent_due_date?: number
    rules?: string
  }
  leases?: Array<{
    id: string
    property_id: string
    tenant_id: string
    lease_start_date: string
    lease_end_date: string | null
    lease_type: 'short-term' | 'long-term'
    rent_amount: number
    rent_frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly'
    security_deposit: number | null
  }>
}

export function useTenantData() {
  const [data, setData] = useState<TenantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const devMode = useTenantDevMode()
  const { role } = useAuth()

  useEffect(() => {
    // Don't fetch tenant data if user is a landlord
    // This is a defensive guard in case the component somehow renders for a landlord
    if (role === 'landlord') {
      console.log('[useTenantData] Role is landlord - blocking tenant queries')
      setLoading(false)
      setData(null)
      return
    }

    // Only fetch if role is explicitly 'tenant'
    // If role is null, wait - don't make queries until we know the role
    // This prevents queries from being made for landlords during the role loading phase
    if (role === 'tenant') {
      console.log('[useTenantData] Role is tenant - fetching tenant data')
      fetchTenantData()
    } else if (role === null) {
      // Role is still loading - keep loading state but don't make queries yet
      // This prevents race conditions where queries are made before role is determined
      console.log('[useTenantData] Role is null - waiting for role to load')
      setLoading(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  async function fetchTenantData() {
    try {
      setLoading(true)

      // Check if Tenant Dev Mode is active
      if (devMode?.isActive && devMode.state) {
        // Return mock data from dev mode context
        setData(devMode.state.tenantData)
        setLoading(false)
        return
      }

      // Production flow: fetch from Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select(
          `
          id,
          property_id,
          move_in_date,
          lease_end_date,
          properties(*)
        `
        )
        .eq('user_id', user.id)
        .single()

      if (tenantError) {
        if (tenantError.code === 'PGRST116') {
          // No tenant record found
          setData(null)
          setLoading(false)
          return
        }
        throw tenantError
      }

      const property = Array.isArray(tenantData.properties)
        ? tenantData.properties[0]
        : tenantData.properties

      // Fetch leases for this tenant
      const { data: leasesData } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .order('lease_start_date', { ascending: false })

      setData({
        tenant: {
          id: tenantData.id,
          property_id: tenantData.property_id,
          move_in_date: tenantData.move_in_date,
          lease_end_date: tenantData.lease_end_date,
        },
        property: property as TenantData['property'],
        leases: leasesData || [],
      })
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    refetch: fetchTenantData,
  }
}
