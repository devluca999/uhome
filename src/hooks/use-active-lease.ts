import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
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

        // Get tenant record for this user
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (tenantError) {
          // User is not a tenant (not invited yet)
          setLease(null)
          setLoading(false)
          return
        }

        // Get active lease for this tenant
        const { data: leaseData, error: leaseError } = await supabase
          .from('leases')
          .select(
            `
            *,
            property:properties(*),
            unit:units(*)
          `
          )
          .eq('tenant_id', tenant.id)
          .in('status', ['active', 'draft']) // Include draft leases where tenant is assigned
          .neq('status', 'ended')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (leaseError) {
          console.error('Error fetching active lease:', leaseError)
          setError(leaseError as Error)
          setLease(null)

          // Dev-mode logging for lease resolution failure
          if (process.env.NODE_ENV === 'development') {
            console.warn('[useActiveLease] Failed to resolve active lease for user:', user?.id)
          }
        } else {
          setLease(leaseData)
          setError(null)

          // Dev-mode logging for lease resolution
          if (process.env.NODE_ENV === 'development') {
            console.log('[useActiveLease] Successfully resolved active lease:', {
              leaseId: leaseData.id,
              unitId: leaseData.unit_id,
              propertyName: leaseData.property?.name,
              unitName: leaseData.unit?.unit_name,
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
    isTenant: !!user, // If user exists, they might be a tenant
  }
}
