import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface ConversationThread {
  lease_id: string
  property_name?: string
  property_id?: string
  tenant_emails: string[]
  landlord_emails: string[]
  last_message_at: string | null
  message_count: number
}

export interface ConversationMessage {
  id: string
  lease_id: string
  sender_id: string | null
  sender_role: 'tenant' | 'landlord' | 'system'
  sender_email?: string | null
  body: string
  intent: 'general' | 'maintenance' | 'billing' | 'notice'
  status: 'open' | 'acknowledged' | 'resolved' | null
  created_at: string
  soft_deleted_at: string | null
}

export function useAdminConversations() {
  const [conversations, setConversations] = useState<ConversationThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    try {
      setLoading(true)
      setError(null)

      // Fetch all messages grouped by lease_id
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(
          '*, leases!messages_lease_id_fkey(property_id, tenant_id, properties!leases_property_id_fkey(name, owner_id))'
        )
        .is('soft_deleted_at', null)
        .order('created_at', { ascending: false })

      if (messagesError) throw messagesError

      // Group messages by lease_id
      const threadsMap = new Map<string, ConversationThread>()

      // Also fetch leases separately to ensure we have all leases with conversations
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('id, property_id, tenant_id, properties!leases_property_id_fkey(name, owner_id)')

      if (leasesError) throw leasesError

      // Initialize threads for all leases
      for (const lease of leases || []) {
        const property = (lease as any).properties
        if (!threadsMap.has(lease.id)) {
          threadsMap.set(lease.id, {
            lease_id: lease.id,
            property_id: lease.property_id,
            property_name: property?.name || undefined,
            tenant_emails: [],
            landlord_emails: [],
            last_message_at: null,
            message_count: 0,
          })
        }
      }

      // Process messages to build thread data
      const messageGroups = new Map<string, typeof messages>()
      for (const message of messages || []) {
        const leaseId = message.lease_id
        if (!messageGroups.has(leaseId)) {
          messageGroups.set(leaseId, [])
        }
        messageGroups.get(leaseId)!.push(message)
      }

      // Fetch participant emails
      for (const [leaseId, leaseMessages] of messageGroups.entries()) {
        const firstMessage = leaseMessages[0]
        const lease = (firstMessage as any).leases
        const property = lease?.properties

        // Get tenant emails
        const tenantIds = new Set<string>()
        if (lease?.tenant_id) {
          tenantIds.add(lease.tenant_id)
        }
        // Get landlord emails
        const landlordIds = new Set<string>()
        if (property?.owner_id) {
          landlordIds.add(property.owner_id)
        }

        // Fetch emails for tenants and landlords
        const tenantEmails: string[] = []
        const landlordEmails: string[] = []

        for (const tenantId of tenantIds) {
          const { data: tenantData } = await supabase
            .from('users')
            .select('email')
            .eq('id', tenantId)
            .maybeSingle()
          if (tenantData?.email) {
            tenantEmails.push(tenantData.email)
          }
        }

        for (const landlordId of landlordIds) {
          const { data: landlordData } = await supabase
            .from('users')
            .select('email')
            .eq('id', landlordId)
            .maybeSingle()
          if (landlordData?.email) {
            landlordEmails.push(landlordData.email)
          }
        }

        // Calculate last message timestamp and count
        const sortedMessages = leaseMessages.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const lastMessage = sortedMessages[0]
        const messageCount = leaseMessages.length

        const thread: ConversationThread = {
          lease_id: leaseId,
          property_id: lease?.property_id,
          property_name: property?.name || undefined,
          tenant_emails: tenantEmails,
          landlord_emails: landlordEmails,
          last_message_at: lastMessage?.created_at || null,
          message_count: messageCount,
        }

        threadsMap.set(leaseId, thread)
      }

      // Convert map to array and sort by last message timestamp
      const threadsArray = Array.from(threadsMap.values()).sort((a, b) => {
        if (!a.last_message_at) return 1
        if (!b.last_message_at) return -1
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      })

      setConversations(threadsArray)
    } catch (err) {
      console.error('Error fetching admin conversations:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessagesForLease(leaseId: string): Promise<ConversationMessage[]> {
    try {
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('lease_id', leaseId)
        .is('soft_deleted_at', null)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      // Fetch sender emails
      const messagesWithSenders = await Promise.all(
        (messages || []).map(async msg => {
          if (msg.sender_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('email')
              .eq('id', msg.sender_id)
              .maybeSingle()
            return {
              ...msg,
              sender_email: userData?.email || null,
            } as ConversationMessage
          }
          return {
            ...msg,
            sender_email: null,
          } as ConversationMessage
        })
      )

      return messagesWithSenders
    } catch (err) {
      console.error('Error fetching messages for lease:', err)
      throw err
    }
  }

  return { conversations, loading, error, refetch: fetchConversations, fetchMessagesForLease }
}
