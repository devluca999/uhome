import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'
import { MessageSquare, Bot } from 'lucide-react'

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
  maintenance: 'Maintenance',
  billing: 'Billing',
  notice: 'Notice',
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

  const formattedDate = new Date(message.created_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        isCurrentUser ? 'items-end' : isSystem ? 'items-center' : 'items-start',
        className
      )}
    >
      {!isSystem && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <span>{message.sender?.email || 'Unknown'}</span>
          {isLandlord && (
            <Badge variant="default" className="text-xs">
              Landlord
            </Badge>
          )}
          {isTenant && (
            <Badge variant="secondary" className="text-xs">
              Tenant
            </Badge>
          )}
          {message.intent !== 'general' && (
            <Badge variant="outline" className="text-xs">
              {INTENT_LABELS[message.intent]}
            </Badge>
          )}
        </div>
      )}

      <div
        className={cn(
          'rounded-lg px-4 py-2 max-w-[80%] break-words',
          isSystem
            ? 'bg-muted/50 border border-border text-foreground'
            : isCurrentUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
        )}
      >
        {isSystem && (
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4" />
            <span className="text-xs font-semibold">System</span>
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap">{message.body}</p>

        {message.status && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <Badge variant="secondary" className="text-xs">
              {STATUS_LABELS[message.status]}
            </Badge>
          </div>
        )}
      </div>

      <span className="text-xs text-muted-foreground px-2">{formattedDate}</span>
    </div>
  )
}
