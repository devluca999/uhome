import { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MessageBubble } from '@/components/ui/message-bubble'
import { MessageComposer } from '@/components/ui/message-composer'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { useLeaseMessages } from '@/hooks/use-lease-messages'
import { useAuth } from '@/contexts/auth-context'
import { MessageSquare } from 'lucide-react'

interface LeaseThreadProps {
  leaseId: string
  isLeaseActive: boolean
  defaultIntent?: 'general' | 'maintenance' | 'billing' | 'notice'
  showStatusSelector?: boolean
  emptyStateTitle?: string
  emptyStateDescription?: string
  className?: string
  leaseStatus?: 'draft' | 'active' | 'ended'
  messageType?: 'landlord_tenant' | 'household'
}

export function LeaseThread({
  leaseId,
  isLeaseActive,
  defaultIntent = 'general',
  showStatusSelector = false,
  emptyStateTitle = 'No messages yet',
  emptyStateDescription = 'Start the conversation.',
  className,
  leaseStatus,
  messageType,
}: LeaseThreadProps) {
  const { messages, loading, sendMessage, refetch } = useLeaseMessages(leaseId, messageType)
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSendMessage(
    body: string,
    intent: 'general' | 'maintenance' | 'billing' | 'notice',
    status?: 'open' | 'acknowledged' | 'resolved' | null
  ) {
    const result = await sendMessage(body, intent, status, messageType)
    if (!result.error) {
      refetch()
    }
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col h-[500px]">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={<MessageSquare className="h-8 w-8" />}
                  title={emptyStateTitle}
                  description={emptyStateDescription}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                {messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={message as any}
                    currentUserId={user?.id}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {isLeaseActive && (
              <div className="border-t border-border pt-4 mt-4">
                <MessageComposer
                  onSend={handleSendMessage}
                  defaultIntent={defaultIntent}
                  showStatusSelector={showStatusSelector}
                  disabled={!isLeaseActive}
                />
              </div>
            )}

            {(!isLeaseActive || leaseStatus === 'ended') && (
              <div className="border-t border-border pt-4 mt-4">
                <p className="text-sm text-muted-foreground text-center">
                  {leaseStatus === 'ended'
                    ? 'This lease has ended. This conversation is now read-only.'
                    : 'Messaging is not available for this lease.'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
