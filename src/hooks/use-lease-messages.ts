import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { useAuth } from '@/contexts/auth-context'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'

type Message = Database['public']['Tables']['messages']['Row']
type MessageInsert = Database['public']['Tables']['messages']['Insert']
type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type MessageIntent = 'general' | 'maintenance' | 'billing' | 'notice'
export type MessageStatus = 'open' | 'acknowledged' | 'resolved' | null

export function useLeaseMessages(leaseId: string) {
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
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('lease_id', leaseId)
        .is('soft_deleted_at', null) // Only fetch non-deleted messages
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      // Fetch sender information for non-system messages
      const messagesWithSenders = await Promise.all(
        (data || []).map(async msg => {
          if (msg.sender_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('email')
              .eq('id', msg.sender_id)
              .single()
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
      if (payload.new && payload.new.lease_id === leaseId && !payload.new.soft_deleted_at) {
        // Fetch sender information for new message
        let messageWithSender = payload.new as Message
        if (payload.new.sender_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', payload.new.sender_id)
            .single()
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
      if (payload.new && payload.new.lease_id === leaseId) {
        setMessages(prev => prev.map(m => (m.id === payload.new.id ? (payload.new as Message) : m)))
      }
    },
  })

  async function sendMessage(
    body: string,
    intent: MessageIntent = 'general',
    status?: MessageStatus
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

      const messageData: MessageInsert = {
        lease_id: leaseId,
        sender_id: user.id,
        sender_role: role === 'tenant' ? 'tenant' : 'landlord',
        body,
        intent,
        status: status || null,
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
