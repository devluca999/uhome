import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { MessageIntent, MessageStatus } from '@/hooks/use-lease-messages'
import { Send } from 'lucide-react'

interface MessageComposerProps {
  onSend: (body: string, intent: MessageIntent, status?: MessageStatus) => Promise<void>
  defaultIntent?: MessageIntent
  defaultStatus?: MessageStatus
  disabled?: boolean
  showStatusSelector?: boolean
  className?: string
}

const INTENT_OPTIONS: Array<{ value: MessageIntent; label: string }> = [
  { value: 'general', label: 'General' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'billing', label: 'Billing' },
  { value: 'notice', label: 'Notice' },
]

const STATUS_OPTIONS: Array<{ value: MessageStatus; label: string }> = [
  { value: null, label: 'None' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
]

export function MessageComposer({
  onSend,
  defaultIntent = 'general',
  defaultStatus,
  disabled = false,
  showStatusSelector = false,
  className,
}: MessageComposerProps) {
  const [body, setBody] = useState('')
  const [intent, setIntent] = useState<MessageIntent>(defaultIntent)
  const [status, setStatus] = useState<MessageStatus>(defaultStatus || null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || sending || disabled) return

    setSending(true)
    try {
      await onSend(body.trim(), intent, status)
      setBody('')
      // Reset intent to general after sending (unless it was explicitly set)
      if (intent !== defaultIntent) {
        setIntent(defaultIntent)
      }
      if (status !== defaultStatus) {
        setStatus(defaultStatus || null)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="message-intent" className="text-xs text-muted-foreground mb-1 block">
              Category
            </Label>
            <select
              id="message-intent"
              value={intent}
              onChange={e => setIntent(e.target.value as MessageIntent)}
              disabled={disabled || sending}
              className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {INTENT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {showStatusSelector && (
            <div className="flex-1">
              <Label htmlFor="message-status" className="text-xs text-muted-foreground mb-1 block">
                Status (Optional)
              </Label>
              <select
                id="message-status"
                value={status || ''}
                onChange={e => setStatus((e.target.value as MessageStatus) || null)}
                disabled={disabled || sending}
                className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value || 'null'} value={option.value || ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Type your message..."
            disabled={disabled || sending}
            className="min-h-[80px] resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e)
              }
            }}
          />
          <Button
            type="submit"
            disabled={!body.trim() || sending || disabled}
            size="icon"
            className="self-end h-[80px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
