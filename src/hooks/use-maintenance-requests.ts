import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  canTransitionTo,
  canTenantConfirmResolution,
  getValidNextStatuses as getValidNextStatusesFromLib,
  type WorkOrderStatus,
  // CreatorRole removed - not used
} from '@/lib/work-order-status'
import { useAuth } from '@/contexts/auth-context'
import { logLandlordDataOwner, useLandlordDataOwnerId } from '@/lib/landlord-data-owner-id'
import { useTenantDevMode } from '@/contexts/tenant-dev-mode-context'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'
// isDevModeActive removed - not used

type MaintenanceRequest = {
  id: string
  property_id: string | null
  tenant_id: string | null
  lease_id: string | null
  status: 'submitted' | 'seen' | 'scheduled' | 'in_progress' | 'resolved' | 'closed'
  category?: string
  description: string
  created_at: string
  updated_at: string
  created_by?: string
  created_by_role: 'landlord' | 'tenant'
  scheduled_date?: string | null
  visibility_to_tenants: boolean
  internal_notes?: string | null
  public_description?: string | null
  property?: {
    name: string
  }
  tenant?: {
    user?: {
      email: string
    }
  }
}

export type UseMaintenanceRequestsOptions = {
  /** When false, clears requests and skips fetch (avoids unscoped queries when no property/lease id). */
  enabled?: boolean
}

export function useMaintenanceRequests(
  leaseIdOrPropertyId?: string,
  isPropertyId = false,
  filterTenantVisible = false,
  options?: UseMaintenanceRequestsOptions
) {
  const enabled = options?.enabled !== false
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user, role, viewMode, demoState } = useAuth()
  const { ownerId, loading: ownerLoading } = useLandlordDataOwnerId()
  const devMode = useTenantDevMode()

  useEffect(() => {
    if (!enabled) {
      setRequests([])
      setLoading(false)
      return
    }
    if (!leaseIdOrPropertyId && ownerLoading) {
      setLoading(true)
      return
    }
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    leaseIdOrPropertyId,
    isPropertyId,
    devMode?.isActive,
    devMode?.state,
    enabled,
    ownerLoading,
    ownerId,
    role,
    viewMode,
    demoState,
  ])

  async function fetchRequests() {
    if (!enabled) {
      return
    }
    if (!leaseIdOrPropertyId && ownerLoading) {
      return
    }
    try {
      setLoading(true)

      // In extended dev mode, always use staging DB (not mock data)
      // Mock data is only for UI-only state, core data comes from DB

      // Production/dev mode flow: fetch from Supabase (staging DB in dev mode)
      let data: any[] | null = null

      if (leaseIdOrPropertyId) {
        if (isPropertyId) {
          // Explicitly a property ID - query by property_id only
          // First try without lease_id filter (simpler, works for all schemas)
          let propertyData: any[] = []
          const { data: propertyResults, error: propertyError } = await supabase
            .from('maintenance_requests')
            .select('*')
            .eq('property_id', leaseIdOrPropertyId)
            .order('created_at', { ascending: false })

          if (!propertyError && propertyResults) {
            propertyData = propertyResults
            // If lease_id column exists, filter out lease-scoped requests (we'll get those separately)
            // But only if the column exists - check by trying to access it
            try {
              // Check if any result has lease_id property (column exists)
              const hasLeaseIdColumn = propertyResults.some(r => 'lease_id' in r)
              if (hasLeaseIdColumn) {
                // Filter to only property-scoped requests (lease_id is null)
                propertyData = propertyResults.filter(r => !r.lease_id)
              }
            } catch (e) {
              // If checking fails, just use all results
            }
          } else if (propertyError && propertyError.code !== 'PGRST116') {
            // PGRST116 = no rows, which is fine
            // Other errors should be thrown
            throw propertyError
          }

          // Also get lease-scoped requests for this property (via leases)
          // Only if lease_id column exists
          try {
            const { data: leases } = await supabase
              .from('leases')
              .select('id')
              .eq('property_id', leaseIdOrPropertyId)

            if (leases && leases.length > 0) {
              const leaseIds = leases.map(l => l.id)
              const { data: leaseScopedResults } = await supabase
                .from('maintenance_requests')
                .select('*')
                .in('lease_id', leaseIds)
                .order('created_at', { ascending: false })

              if (leaseScopedResults) {
                // Deduplicate by combining with property-scoped requests
                const allIds = new Set(propertyData.map(r => r.id))
                const uniqueLeaseScoped = leaseScopedResults.filter(r => !allIds.has(r.id))
                propertyData = [...propertyData, ...uniqueLeaseScoped]
              }
            }
          } catch (e) {
            // If lease_id column doesn't exist (42703), ignore this query
            // Other errors should be logged but not thrown (graceful degradation)
            if ((e as any)?.code !== '42703') {
              console.warn('Error fetching lease-scoped maintenance requests:', e)
            }
          }

          data = propertyData
        } else {
          // Could be lease_id or property_id - try both
          let leaseData: any[] = []
          try {
            const { data: leaseResults, error: leaseError } = await supabase
              .from('maintenance_requests')
              .select('*')
              .eq('lease_id', leaseIdOrPropertyId)
              .order('created_at', { ascending: false })

            if (!leaseError && leaseResults) {
              leaseData = leaseResults
            } else if (
              leaseError &&
              leaseError.code !== 'PGRST116' &&
              leaseError.code !== '42703'
            ) {
              // PGRST116 = no rows (fine)
              // 42703 = column doesn't exist (lease_id column not migrated yet)
              // Silently continue to property_id query
            }
          } catch (e) {
            // If lease_id column doesn't exist, ignore
            if ((e as any)?.code !== '42703') {
              // Only ignore column doesn't exist errors
            }
          }

          let propertyData: any[] = []
          const { data: propertyResults, error: propertyError } = await supabase
            .from('maintenance_requests')
            .select('*')
            .eq('property_id', leaseIdOrPropertyId)
            .order('created_at', { ascending: false })

          if (!propertyError && propertyResults) {
            propertyData = propertyResults
          } else if (propertyError && propertyError.code !== 'PGRST116') {
            throw propertyError
          }

          // Combine results, deduplicate by id
          const combined = [...leaseData, ...propertyData]
          const unique = combined.filter(
            (r, index, self) => index === self.findIndex(t => t.id === r.id)
          )
          data = unique
        }
      } else {
        // Landlord-wide list: scope to resolved owner (admin + landlord-demo + populated → demo landlord)
        logLandlordDataOwner('useMaintenanceRequests', {
          ownerId,
          sessionUserId: user?.id,
          role,
          viewMode,
          demoState,
        })
        if (role === 'admin' && viewMode === 'tenant-demo') {
          data = []
        } else if (role === 'admin' && viewMode === 'landlord-demo' && demoState === 'empty') {
          data = []
        } else if (!ownerId) {
          data = []
        } else {
          const { data: ownedProps, error: propErr } = await supabase
            .from('properties')
            .select('id')
            .eq('owner_id', ownerId)

          if (propErr) throw propErr
          const propertyIds = (ownedProps ?? []).map(p => p.id)

          if (propertyIds.length === 0) {
            data = []
          } else {
            let propertyData: any[] = []
            const { data: propertyResults, error: propertyError } = await supabase
              .from('maintenance_requests')
              .select('*')
              .in('property_id', propertyIds)
              .order('created_at', { ascending: false })

            if (propertyError && propertyError.code !== 'PGRST116') throw propertyError
            if (propertyResults) {
              propertyData = propertyResults
              const hasLeaseIdColumn = propertyResults.some(r => 'lease_id' in r)
              if (hasLeaseIdColumn) {
                propertyData = propertyResults.filter(r => !r.lease_id)
              }
            }

            try {
              const { data: leases } = await supabase
                .from('leases')
                .select('id')
                .in('property_id', propertyIds)

              if (leases && leases.length > 0) {
                const leaseIds = leases.map(l => l.id)
                const { data: leaseScopedResults } = await supabase
                  .from('maintenance_requests')
                  .select('*')
                  .in('lease_id', leaseIds)
                  .order('created_at', { ascending: false })

                if (leaseScopedResults) {
                  const allIds = new Set(propertyData.map(r => r.id))
                  const uniqueLeaseScoped = leaseScopedResults.filter(r => !allIds.has(r.id))
                  propertyData = [...propertyData, ...uniqueLeaseScoped]
                }
              }
            } catch (e) {
              if ((e as any)?.code !== '42703') {
                console.warn('Error fetching lease-scoped maintenance requests:', e)
              }
            }

            data = propertyData
          }
        }
      }

      // Fetch related data separately to avoid nested FK issues
      const requestsWithRelations = await Promise.all(
        (data || []).map(async (request: any) => {
          // Get property from lease if available, otherwise from property_id
          let propertyData = null
          if (request.lease_id) {
            const { data: leaseData } = await supabase
              .from('leases')
              .select('*')
              .eq('id', request.lease_id)
              .single()
            if (leaseData?.property_id) {
              const { data } = await supabase
                .from('properties')
                .select('name')
                .eq('id', leaseData.property_id)
                .single()
              propertyData = data
            }
          } else if (request.property_id) {
            const { data } = await supabase
              .from('properties')
              .select('name')
              .eq('id', request.property_id)
              .single()
            propertyData = data
          }

          // Get tenant from lease if available, otherwise from tenant_id
          let tenantData = null
          if (request.lease_id) {
            const { data: leaseData } = await supabase
              .from('leases')
              .select('*')
              .eq('id', request.lease_id)
              .single()
            if (leaseData?.tenant_id) {
              const { data } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', leaseData.tenant_id)
                .single()
              tenantData = data
            }
          } else if (request.tenant_id) {
            const { data } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', request.tenant_id)
              .single()
            tenantData = data
          }

          let userEmail = null
          if (tenantData?.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('email')
              .eq('id', tenantData.user_id)
              .single()
            userEmail = userData?.email
          }

          return {
            ...request,
            property: propertyData || undefined,
            tenant: tenantData
              ? {
                  user: userEmail ? { email: userEmail } : undefined,
                }
              : undefined,
          }
        })
      )

      // Filter tenant-visible work orders if requested
      // P2 FIX 4: Tenants see their own submissions + landlord-created orders where visibility_to_tenants=true
      let filteredRequests = requestsWithRelations
      if (filterTenantVisible) {
        filteredRequests = requestsWithRelations.filter(r => {
          // Tenant's own submissions are always visible
          if (r.created_by_role === 'tenant') return true
          // Landlord-created: only if flagged visible
          return r.visibility_to_tenants === true
        })
        // Always use public_description for tenant-facing display
        filteredRequests = filteredRequests.map(r => ({
          ...r,
          description: r.public_description || r.description,
        }))
      }

      setRequests(filteredRequests)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching maintenance requests:', err)
    } finally {
      setLoading(false)
    }
  }

  // Set up realtime subscription for multi-tab sync (dev mode only)
  const propertyIdForRealtime =
    leaseIdOrPropertyId && isPropertyId ? leaseIdOrPropertyId : requests[0]?.property_id || null

  useRealtimeSubscription({
    table: 'maintenance_requests',
    enabled,
    filter: propertyIdForRealtime ? { property_id: propertyIdForRealtime } : undefined,
    events: ['INSERT', 'UPDATE', 'DELETE'],
    onInsert: payload => {
      if (payload.new) {
        setRequests(prev => {
          // Check if already exists (avoid duplicates)
          if (prev.some(r => r.id === payload.new.id)) {
            return prev
          }
          // Apply filters
          const newRequest = payload.new as MaintenanceRequest
          if (filterTenantVisible && !newRequest.visibility_to_tenants) {
            return prev
          }
          return [newRequest, ...prev]
        })
      }
    },
    onUpdate: payload => {
      if (payload.new) {
        setRequests(prev =>
          prev.map(r => (r.id === payload.new.id ? (payload.new as MaintenanceRequest) : r))
        )
      }
    },
    onDelete: payload => {
      if (payload.old) {
        if (payload.old) {
          const oldId = (payload.old as { id?: string }).id
          if (oldId) {
            setRequests(prev => prev.filter(r => r.id !== oldId))
          }
        }
      }
    },
  })

  async function updateRequestStatus(
    id: string,
    status: MaintenanceRequest['status'],
    scheduledDate?: string | null
  ) {
    // Get current request to validate transition
    const currentRequest = requests.find(r => r.id === id)
    if (!currentRequest) {
      throw new Error('Work order not found')
    }

    // Validate status transition
    if (!canTransitionTo(currentRequest.status, status, currentRequest.created_by_role)) {
      throw new Error(`Invalid status transition from ${currentRequest.status} to ${status}`)
    }

    // Check if Tenant Dev Mode is active
    if (devMode?.isActive) {
      // Update mock state
      devMode.updateMockWorkOrderStatus(id, status, scheduledDate)

      // Re-fetch to get updated state
      await fetchRequests()

      const updatedRequest = requests.find(r => r.id === id)
      if (!updatedRequest) {
        throw new Error('Work order not found after update')
      }
      return updatedRequest
    }

    // Production flow: update in Supabase
    // Build update payload
    const updatePayload: any = { status }
    if (scheduledDate !== undefined) {
      updatePayload.scheduled_date = scheduledDate
    }

    const { data, error } = await supabase
      .from('maintenance_requests')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    // Fetch related data
    const [propertyData, tenantData] = await Promise.all([
      supabase.from('properties').select('name').eq('id', data.property_id).single(),
      data.tenant_id
        ? supabase.from('tenants').select('user_id').eq('id', data.tenant_id).single()
        : Promise.resolve({ data: null, error: null }),
    ])

    let userEmail = null
    if (tenantData.data?.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', tenantData.data.user_id)
        .single()
      userEmail = userData?.email
    }

    const updatedRequest: MaintenanceRequest = {
      ...data,
      property: propertyData.data || undefined,
      tenant: tenantData.data
        ? {
            user: userEmail ? { email: userEmail } : undefined,
          }
        : undefined,
    }

    setRequests(requests.map(r => (r.id === id ? updatedRequest : r)))
    return updatedRequest
  }

  /**
   * Tenant-only function to confirm resolution
   * Only works when status is 'resolved'
   */
  async function confirmResolution(id: string) {
    const currentRequest = requests.find(r => r.id === id)
    if (!currentRequest) {
      throw new Error('Work order not found')
    }

    if (!canTenantConfirmResolution(currentRequest.status)) {
      throw new Error('Work order is not in a state that can be confirmed by tenant')
    }

    // Check if user is a tenant
    if (!user) {
      throw new Error('User must be logged in')
    }

    // Skip permission check in dev mode (already scoped to tenant)
    if (!devMode?.isActive) {
      // Verify user is a tenant for this property
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('property_id')
        .eq('user_id', user.id)
        .eq('property_id', currentRequest.property_id)
        .single()

      if (!tenantData) {
        throw new Error('You do not have permission to confirm this work order')
      }
    }

    // Transition to closed
    return updateRequestStatus(id, 'closed')
  }

  /**
   * Get valid next statuses for a work order
   */
  function getNextValidStatuses(id: string): WorkOrderStatus[] {
    const request = requests.find(r => r.id === id)
    if (!request) return []

    return getValidNextStatusesFromLib(request.status, request.created_by_role)
  }

  return {
    requests,
    loading,
    error,
    updateRequestStatus,
    confirmResolution,
    getNextValidStatuses,
    refetch: fetchRequests,
  }
}
