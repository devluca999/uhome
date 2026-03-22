// P2 PATCH — FIX 3: Proper chat bubble layout with sender/receiver alignment.
// Sent messages: right-aligned green bubble. Received: left-aligned muted bubble.
// System messages: centered. Intent badges preserved.

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'
import { Bot } from 'lucide-react'

type Message = Database['public']['Tables']['messages']['Row']

interface MessageBubbleProps {
  message: Message & {
    sender?: {
      email: string | null
    }
  }
  currentUserId?: string
  className?: string
}

const INTENT_LABELS: Record<Message['intent'], string> = {
  general: 'General',
  maintenance: '🔧 Maintenance',
  billing: '💳 Billing',
  notice: '📋 Notice',
}

const STATUS_LABELS: Record<NonNullable<Message['status']>, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
}

export function MessageBubble({ message, currentUserId, className }: MessageBubbleProps) {
  const isSystem = message.sender_role === 'system'
  const isCurrentUser = message.sender_id === currentUserId && !isSystem
  const isLandlord = message.sender_role === 'landlord' && !isSystem
  const isTenant = message.sender_role === 'tenant' && !isSystem

  const formattedTime = new Date(message.created_at).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  // System messages: centered pill
  if (isSystem) {
    return (
      <div className={cn('flex justify-center my-3', className)}>
        <div className="flex items-center gap-1.5 bg-muted/60 border border-border rounded-full px-3 py-1">
          <Bot className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{message.body}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex mb-2 px-2',
        isCurrentUser ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div className={cn('flex flex-col max-w-[75%]', isCurrentUser ? 'items-end' : 'items-start')}>

        {/* Sender label for received messages */}
        {!isCurrentUser && (
          <div className="flex items-center gap-1.5 mb-0.5 px-1">
            <span className="text-xs font-semibold text-muted-foreground">
              {isLandlord ? 'Landlord' : isTenant ? 'Tenant' : message.sender?.email || 'Unknown'}
            </span>
            {isLandlord && (
              <Badge variant="default" className="text-[10px] h-4 px-1 py-0">
                Landlord
              </Badge>
            )}
          </div>
        )}

        {/* Intent badge (non-general only) */}
        {message.intent !== 'general' && (
          <span
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full mb-1',
              isCurrentUser ? 'bg-primary/20 text-primary-foreground/80' : 'bg-muted text-muted-foreground'
            )}
          >
            {INTENT_LABELS[message.intent]}
          </span>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm break-words',
            isCurrentUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          )}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>

          {message.status && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <Badge variant="secondary" className="text-[10px]">
                {STATUS_LABELS[message.status]}
              </Badge>
            </div>
          )}

          <p className={cn(
            'text-[10px] mt-1.5 text-right',
            isCurrentUser ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )}>
            {formattedTime}
          </p>
        </div>
      </div>
    </div>
  )
}
