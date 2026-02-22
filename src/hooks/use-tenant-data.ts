import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useTenantDevMode } from '@/contexts/tenant-dev-mode-context'
import { useAuth } from '@/contexts/auth-context'
import { getTenantData } from '@/lib/data/tenant-data-service'

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
  const { role, user, viewMode, demoState } = useAuth()

  const isAdminTenantDemo = role === 'admin' && viewMode === 'tenant-demo'

  const fetchTenantData = useCallback(async () => {
    try {
      setLoading(true)

      // Admin viewing as tenant (demo): use demo data
      if (isAdminTenantDemo) {
        const demoData = await getTenantData(user?.id || '', viewMode, demoState)
        setData(demoData)
        setLoading(false)
        return
      }

      // Check if Tenant Dev Mode is active (URL-based dev mode)
      if (devMode?.isActive && devMode.state) {
        setData(devMode.state.tenantData)
        setLoading(false)
        return
      }

      // Block if landlord (and not admin in tenant-demo)
      if (role === 'landlord') {
        setData(null)
        setLoading(false)
        return
      }

      // Production flow: fetch from Supabase
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
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
        .eq('user_id', authUser.id)
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
  }, [role, isAdminTenantDemo, user?.id, viewMode, demoState, devMode?.isActive, devMode?.state])

  useEffect(() => {
    if (role === 'landlord' && !isAdminTenantDemo) {
      setLoading(false)
      setData(null)
      return
    }
    if (role === 'tenant' || isAdminTenantDemo) {
      fetchTenantData()
    } else if (role === null) {
      setLoading(true)
    }
  }, [role, isAdminTenantDemo, fetchTenantData])

  return {
    data,
    loading,
    error,
    refetch: fetchTenantData,
  }
}
