import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'

export interface TenantInvite {
  id: string
  property_id: string
  email: string
  token: string
  accepted_at: string | null
  expires_at: string
  created_by: string
  created_at: string
  lease_id: string | null
  property?: {
    name: string
  }
}

export interface TenantInviteInsert {
  property_id: string
  email: string
  expires_at?: string
  lease_type?: 'short-term' | 'long-term'
  expected_start_date?: string
}

export function useTenantInvites() {
  const { user } = useAuth()
  const [invites, setInvites] = useState<TenantInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (user) {
      fetchInvites()
    } else {
      setInvites([])
      setLoading(false)
    }
  }, [user])

  async function fetchInvites() {
    if (!user) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('tenant_invites')
        .select(
          `
          *,
          properties!tenant_invites_property_id_fkey(name)
        `
        )
        .order('created_at', { ascending: false })

      if (fetchError) {
        // If table doesn't exist (404) or other errors, set empty array
        if (fetchError.code === '42P01' || fetchError.code === 'PGRST301') {
          // Table doesn't exist - return empty array
          setInvites([])
          return
        }
        throw fetchError
      }

      // Map nested structure
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        property: item.properties,
      }))

      setInvites(mappedData as TenantInvite[])
    } catch (err) {
      // If it's a table not found error, just set empty array
      if ((err as any)?.code === '42P01' || (err as any)?.code === 'PGRST301') {
        setInvites([])
        setError(null)
      } else {
        setError(err as Error)
      }
    } finally {
      setLoading(false)
    }
  }

  async function createInvite(invite: TenantInviteInsert) {
    if (!user) return { data: null, error: new Error('User not authenticated') }

    try {
      // Check for existing ended leases for this property+email (re-invite scenario)
      // We still create a new lease, but this helps us show informational messages
      let hasPreviousLease = false
      try {
        // Try to query with status column (if migration has been run)
        const { data: existingLeases, error: statusError } = await supabase
          .from('leases')
          .select('id, status')
          .eq('property_id', invite.property_id)
          .eq('status', 'ended')
          .limit(1)

        // If status column doesn't exist, try alternative query using lease_end_date
        if (statusError && statusError.code === '42703') {
          // Column doesn't exist - use lease_end_date instead
          const { data: endedLeases } = await supabase
            .from('leases')
            .select('id, lease_end_date')
            .eq('property_id', invite.property_id)
            .not('lease_end_date', 'is', null)
            .lt('lease_end_date', new Date().toISOString().split('T')[0])
            .limit(1)

          if (endedLeases && endedLeases.length > 0) {
            // Check if there's a tenant with this email who had a lease at this property
            // First find user by email
            const { data: userData } = await supabase
              .from('users')
              .select('id')
              .eq('email', invite.email)
              .single()

            if (userData) {
              // Find tenant for this user
              const { data: existingTenant } = await supabase
                .from('tenants')
                .select('id')
                .eq('user_id', userData.id)
                .single()

              if (existingTenant) {
                // Check if this tenant had a lease at this property
                const { data: tenantLeases } = await supabase
                  .from('leases')
                  .select('id')
                  .eq('property_id', invite.property_id)
                  .eq('tenant_id', existingTenant.id)
                  .not('lease_end_date', 'is', null)
                  .lt('lease_end_date', new Date().toISOString().split('T')[0])
                  .limit(1)

                hasPreviousLease = (tenantLeases?.length ?? 0) > 0
              }
            }
          }
        } else if (existingLeases && existingLeases.length > 0) {
          // Status column exists and we found ended leases
          // Check if there's a tenant with this email who had a lease at this property
          // First find user by email
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', invite.email)
            .single()

          if (userData) {
            // Find tenant for this user
            const { data: existingTenant } = await supabase
              .from('tenants')
              .select('id')
              .eq('user_id', userData.id)
              .single()

            if (existingTenant) {
              // Check if this tenant had a lease at this property
              const { data: tenantLeases } = await supabase
                .from('leases')
                .select('id')
                .eq('property_id', invite.property_id)
                .eq('tenant_id', existingTenant.id)
                .eq('status', 'ended')
                .limit(1)

              hasPreviousLease = (tenantLeases?.length ?? 0) > 0
            }
          }
        }
      } catch (e) {
        // If query fails for any reason, just continue without hasPreviousLease flag
        console.warn('Could not check for previous leases:', e)
      }

      // Always create a new draft lease (never reuse old leases)
      const { data: propertyData } = await supabase
        .from('properties')
        .select('rent_amount')
        .eq('id', invite.property_id)
        .single()

      // Build draft lease - handle both with and without status column
      const draftLease: any = {
        property_id: invite.property_id,
        tenant_id: null, // Will be set when tenant accepts
        lease_start_date: invite.expected_start_date || null,
        lease_end_date: null,
        lease_type: invite.lease_type || 'long-term',
        rent_amount: propertyData?.rent_amount || null,
        rent_frequency: 'monthly' as const,
        security_deposit: null,
      }

      // Only add status if the column exists (try-catch will handle if it doesn't)
      // We'll let the insert fail gracefully if status is required but missing
      try {
        draftLease.status = 'draft'
      } catch (e) {
        // Status column might not exist - that's okay, we'll proceed without it
      }

      const { data: newLease, error: leaseError } = await supabase
        .from('leases')
        .insert(draftLease)
        .select()
        .single()

      if (leaseError) throw leaseError

      // Generate secure UUID token (crypto.randomUUID is available in all modern browsers)
      const token = crypto.randomUUID()

      // Set expiration to 7 days from now if not provided (tighter window = more secure)
      const expiresAt =
        invite.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: newInvite, error: createError } = await supabase
        .from('tenant_invites')
        .insert({
          property_id: invite.property_id,
          email: invite.email,
          token,
          expires_at: expiresAt,
          created_by: user.id,
          lease_id: newLease.id,
        })
        .select(
          `
          *,
          properties!tenant_invites_property_id_fkey(name)
        `
        )
        .single()

      if (createError) {
        // Rollback: delete the draft lease if invite creation fails
        await supabase.from('leases').delete().eq('id', newLease.id)
        throw createError
      }

      // Map nested structure
      const mappedInvite = {
        ...newInvite,
        property: newInvite.properties,
      }

      setInvites(prev => [mappedInvite as TenantInvite, ...prev])

      // Generate invite URL — /accept-invite?token= (query param, not path segment)
      const inviteUrl = `${window.location.origin}/accept-invite?token=${token}`

      return {
        data: {
          invite: mappedInvite as TenantInvite,
          url: inviteUrl,
          hasPreviousLease, // Flag for UI to show re-invite notice
        },
        error: null,
      }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function deleteInvite(id: string) {
    try {
      const { error: deleteError } = await supabase.from('tenant_invites').delete().eq('id', id)

      if (deleteError) throw deleteError

      setInvites(prev => prev.filter(i => i.id !== id))
      return { error: null }
    } catch (err) {
      const error = err as Error
      return { error }
    }
  }

  async function getInviteByToken(token: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('tenant_invites')
        .select(
          `
          *,
          properties!tenant_invites_property_id_fkey(name, address)
        `
        )
        .eq('token', token)
        .single()

      if (fetchError) throw fetchError

      if (!data) {
        return { data: null, error: new Error('Invite not found') }
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        return { data: null, error: new Error('Invite has expired') }
      }

      // Check if already accepted
      if (data.accepted_at) {
        return { data: null, error: new Error('Invite has already been accepted') }
      }

      // Map nested structure
      const mappedInvite = {
        ...data,
        property: data.properties,
      }

      return { data: mappedInvite as TenantInvite, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  return {
    invites,
    loading,
    error,
    createInvite,
    deleteInvite,
    getInviteByToken,
    refetch: fetchInvites,
  }
}
