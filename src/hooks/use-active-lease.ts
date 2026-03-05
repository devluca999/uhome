import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { getTenantData } from '@/lib/data/tenant-data-service'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row'] & {
  property?: Database['public']['Tables']['properties']['Row']
  unit?: Database['public']['Tables']['units']['Row']
}

export function useActiveLease() {
  const { user } = useAuth()
  const [lease, setLease] = useState<Lease | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchActiveLease() {
      if (!user) {
        setLease(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Dev bypass: when signed in as demo tenant, use getTenantData so household shows (cross-account integrity)
        const devBypass =
          import.meta.env.DEV &&
          typeof window !== 'undefined' &&
          sessionStorage.getItem('dev_bypass') === 'true' &&
          sessionStorage.getItem('dev_role') === 'tenant'

        if (devBypass) {
          const tenantData = await getTenantData(user.id, 'tenant-demo', 'populated')
          const firstLease = tenantData?.leases?.[0]
          if (firstLease && tenantData?.property) {
            const leaseWithUnit = firstLease as typeof firstLease & { unit_id?: string }
            const synthetic: Lease = {
              ...firstLease,
              property: tenantData.property as Lease['property'],
              unit: leaseWithUnit.unit_id
                ? ({ id: leaseWithUnit.unit_id, unit_name: 'Unit' } as Lease['unit'])
                : undefined,
            } as Lease
            setLease(synthetic)
            setError(null)
            setLoading(false)
            return
          }
        }

        // Get tenant record (use limit(1) to avoid .single() error when multiple rows)
        const { data: tenantRows, error: tenantError } = await supabase
          .from('tenants')
          .select('id, lease_id')
          .eq('user_id', user.id)
          .limit(1)

        const tenant = tenantRows?.[0]
        if (tenantError || !tenant) {
          setLease(null)
          setLoading(false)
          return
        }

        if (!tenant.lease_id) {
          setLease(null)
          setLoading(false)
          return
        }

        // Fetch the lease using the tenant's lease_id foreign key
        const { data: leaseData, error: leaseError } = await supabase
          .from('leases')
          .select(
            `
            *,
            property:properties(*),
            unit:units(*)
          `
          )
          .eq('id', tenant.lease_id)
          .in('status', ['active', 'draft'])
          .maybeSingle()

        if (leaseError) {
          console.error('Error fetching active lease:', leaseError)
          setError(leaseError as Error)
          setLease(null)

          if (import.meta.env.DEV) {
            console.warn('[useActiveLease] Failed to resolve active lease for user:', user?.id)
          }
        } else {
          setLease(leaseData)
          setError(null)

          if (import.meta.env.DEV && leaseData) {
            console.log('[useActiveLease] Successfully resolved active lease:', {
              leaseId: leaseData.id,
              unitId: leaseData.unit_id,
              propertyName: (leaseData as Lease).property?.name,
              status: leaseData.status,
            })
          }
        }
      } catch (err) {
        console.error('Error in useActiveLease:', err)
        setError(err as Error)
        setLease(null)
      } finally {
        setLoading(false)
      }
    }

    fetchActiveLease()
  }, [user])

  return {
    lease,
    loading,
    error,
    hasLease: !!lease,
    isTenant: !!user,
  }
}
