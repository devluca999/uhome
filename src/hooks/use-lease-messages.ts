import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { useAuth } from '@/contexts/auth-context'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'

type Message = Database['public']['Tables']['messages']['Row']
type MessageInsert = Database['public']['Tables']['messages']['Insert']
// MessageUpdate removed - not used

export type MessageIntent = 'general' | 'maintenance' | 'billing' | 'notice'
export type MessageStatus = 'open' | 'acknowledged' | 'resolved' | null

// Hook to resolve active lease for current user
export function useActiveLease() {
  const [lease, setLease] = useState<Database['public']['Tables']['leases']['Row'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user, role } = useAuth()

  useEffect(() => {
    if (!user || role !== 'tenant') {
      setLease(null)
      setLoading(false)
      return
    }

    async function fetchActiveLease() {
      try {
        setLoading(true)

        // Get tenant record
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (tenantError || !tenant) {
          setLease(null)
          setLoading(false)
          return
        }

        // Get active lease for this tenant
        const { data: activeLease, error: leaseError } = await supabase
          .from('leases')
          .select('*')
          .eq('tenant_id', tenant.id)
          .or('status.eq.active,status.eq.draft')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (leaseError) throw leaseError

        setLease(activeLease)
      } catch (err) {
        setError(err as Error)
        console.error('Error fetching active lease:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchActiveLease()
  }, [user, role])

  return { lease, loading, error }
}

export function useLeaseMessages(leaseId: string, messageType?: 'landlord_tenant' | 'household') {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user, role } = useAuth()

  useEffect(() => {
    if (leaseId) {
      fetchMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId])

  async function fetchMessages() {
    if (!leaseId) return

    try {
      setLoading(true)

      // Build query with message type filter
      let query = supabase
        .from('messages')
        .select('*')
        .eq('lease_id', leaseId)
        .is('soft_deleted_at', null) // Only fetch non-deleted messages

      // Apply message type filter if specified
      if (messageType) {
        query = query.eq('message_type', messageType)
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      const filteredMessages = data || []

      // Dev-mode validation: ensure messages match requested type
      if (process.env.NODE_ENV === 'development' && messageType && filteredMessages.length > 0) {
        const mismatchedMessages = filteredMessages.filter(msg => msg.message_type !== messageType)
        if (mismatchedMessages.length > 0) {
          console.warn('[useLeaseMessages] Message type mismatch detected:', {
            requestedType: messageType,
            mismatchedCount: mismatchedMessages.length,
            leaseId,
            sampleMismatched: mismatchedMessages
              .slice(0, 2)
              .map(m => ({ id: m.id, type: m.message_type })),
          })
        }
      }

      // Fetch sender information for non-system messages
      const messagesWithSenders = await Promise.all(
        filteredMessages.map(async msg => {
          if (msg.sender_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('email')
              .eq('id', msg.sender_id)
              .maybeSingle()
            return {
              ...msg,
              sender: userData ? { email: userData.email } : undefined,
            }
          }
          return msg
        })
      )

      setMessages(messagesWithSenders as Message[])
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }

  // Set up realtime subscription for multi-tab sync (dev mode only)
  useRealtimeSubscription({
    table: 'messages',
    filter: leaseId ? { lease_id: leaseId } : undefined,
    events: ['INSERT', 'UPDATE'],
    onInsert: async payload => {
      if (
        payload.new &&
        payload.new.lease_id === leaseId &&
        !payload.new.soft_deleted_at &&
        (!messageType || payload.new.message_type === messageType)
      ) {
        // Fetch sender information for new message
        let messageWithSender = payload.new as Message
        if (payload.new.sender_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', payload.new.sender_id)
            .maybeSingle()
          messageWithSender = {
            ...payload.new,
            sender: userData ? { email: userData.email } : undefined,
          } as Message
        }

        setMessages(prev => {
          // Check if already exists
          if (prev.some(m => m.id === messageWithSender.id)) {
            return prev
          }
          // Insert in chronological order
          return [...prev, messageWithSender].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })
      }
    },
    onUpdate: payload => {
      if (
        payload.new &&
        payload.new.lease_id === leaseId &&
        (!messageType || payload.new.message_type === messageType)
      ) {
        setMessages(prev => prev.map(m => (m.id === payload.new.id ? (payload.new as Message) : m)))
      }
    },
  })

  async function sendMessage(
    body: string,
    intent: MessageIntent = 'general',
    status?: MessageStatus,
    messageType?: 'landlord_tenant' | 'household'
  ) {
    if (!user || !role || !leaseId) {
      throw new Error('User must be authenticated to send messages')
    }

    try {
      // Check lease status before allowing message send
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('status, tenant_id')
        .eq('id', leaseId)
        .single()

      if (leaseError) throw leaseError

      // Block sends if lease is ended
      if (lease.status === 'ended') {
        return {
          data: null,
          error: new Error('This lease has ended. Messages are read-only.'),
        }
      }

      // Block sends if lease is draft and tenant_id is not set (tenant hasn't accepted yet)
      if (lease.status === 'draft' && !lease.tenant_id) {
        return {
          data: null,
          error: new Error('Messaging is not available until the tenant accepts the invite.'),
        }
      }

      const finalMessageType = messageType || 'landlord_tenant' // Default to landlord_tenant for backward compatibility

      // Dev-mode validation: ensure role and message type are compatible
      if (process.env.NODE_ENV === 'development') {
        if (role === 'tenant' && finalMessageType === 'landlord_tenant') {
          // Valid: tenant sending to landlord
        } else if (role === 'tenant' && finalMessageType === 'household') {
          // Valid: tenant sending household message
        } else if (role === 'landlord' && finalMessageType === 'landlord_tenant') {
          // Valid: landlord sending to tenant
        } else {
          console.warn('[useLeaseMessages] Invalid message type for role:', {
            role,
            messageType: finalMessageType,
            leaseId,
          })
        }
      }

      const messageData: MessageInsert = {
        lease_id: leaseId,
        sender_id: user.id,
        sender_role: role === 'tenant' ? 'tenant' : 'landlord',
        body,
        intent,
        status: status || null,
        message_type: finalMessageType,
      }

      const { data: newMessage, error: insertError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (insertError) throw insertError

      setMessages(prev => [...prev, newMessage])
      return { data: newMessage, error: null }
    } catch (err) {
      const error = err as Error
      console.error('Error sending message:', err)
      return { data: null, error }
    }
  }

  async function softDeleteMessage(messageId: string) {
    if (!user) {
      throw new Error('User must be authenticated to delete messages')
    }

    try {
      const { data: updatedMessage, error: updateError } = await supabase
        .from('messages')
        .update({ soft_deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', user.id) // Only allow deleting own messages
        .select()
        .single()

      if (updateError) throw updateError

      setMessages(prev => prev.filter(m => m.id !== messageId))
      return { data: updatedMessage, error: null }
    } catch (err) {
      const error = err as Error
      console.error('Error soft-deleting message:', err)
      return { data: null, error }
    }
  }

  async function updateMessageStatus(messageId: string, status: MessageStatus) {
    try {
      const { data: updatedMessage, error: updateError } = await supabase
        .from('messages')
        .update({ status })
        .eq('id', messageId)
        .select()
        .single()

      if (updateError) throw updateError

      setMessages(prev => prev.map(m => (m.id === messageId ? updatedMessage : m)))
      return { data: updatedMessage, error: null }
    } catch (err) {
      const error = err as Error
      console.error('Error updating message status:', err)
      return { data: null, error }
    }
  }

  return {
    messages,
    loading,
    error,
    sendMessage,
    softDeleteMessage,
    updateMessageStatus,
    refetch: fetchMessages,
  }
}
