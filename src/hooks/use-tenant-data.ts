import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

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
}

export function useTenantData() {
  const [data, setData] = useState<TenantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchTenantData()
  }, [])

  async function fetchTenantData() {
    try {
      setLoading(true)
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
          property:properties(*)
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

      const property = Array.isArray(tenantData.property)
        ? tenantData.property[0]
        : tenantData.property

      setData({
        tenant: {
          id: tenantData.id,
          property_id: tenantData.property_id,
          move_in_date: tenantData.move_in_date,
          lease_end_date: tenantData.lease_end_date,
        },
        property: property as TenantData['property'],
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
