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
  property?: {
    name: string
  }
}

export interface TenantInviteInsert {
  property_id: string
  email: string
  expires_at?: string
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

      if (fetchError) throw fetchError

      // Map nested structure
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        property: item.properties,
      }))

      setInvites(mappedData as TenantInvite[])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createInvite(invite: TenantInviteInsert) {
    if (!user) return { data: null, error: new Error('User not authenticated') }

    try {
      // Generate unique token
      const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

      // Set expiration to 30 days from now if not provided
      const expiresAt =
        invite.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: newInvite, error: createError } = await supabase
        .from('tenant_invites')
        .insert({
          ...invite,
          token,
          expires_at: expiresAt,
          created_by: user.id,
        })
        .select(
          `
          *,
          properties!tenant_invites_property_id_fkey(name)
        `
        )
        .single()

      if (createError) throw createError

      // Map nested structure
      const mappedInvite = {
        ...newInvite,
        property: newInvite.properties,
      }

      setInvites(prev => [mappedInvite as TenantInvite, ...prev])

      // Generate invite URL
      const inviteUrl = `${window.location.origin}/accept-invite/${token}`

      return { data: { invite: mappedInvite as TenantInvite, url: inviteUrl }, error: null }
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
