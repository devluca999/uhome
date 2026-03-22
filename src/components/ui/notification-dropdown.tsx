/**
 * In-app notification dropdown: bell icon, badge count, and panel listing
 * notifications with mark-as-read. Supports data visibility and cross-account
 * integrity (notifications scoped by user_id).
 */

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, MessageSquare, Info, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuth } from '@/contexts/auth-context'

function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function notificationLabel(type: string): string {
  return type === 'message' ? 'New message' : 'System notification'
}

export function NotificationDropdown({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { role } = useAuth()
  const {
    notifications,
    unreadCount,
    loading,
    error: notificationsError,
    markNotificationAsRead,
    markAllAsRead,
  } = useNotifications()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const messagesPath = role === 'landlord' ? '/landlord/messages' : '/tenant/messages'
  const linkPath = role === 'landlord' ? '/landlord/leases' : '/tenant/lease?tab=messages'

  return (
    <div className={cn('relative', className)} ref={panelRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 z-[200] flex flex-col glass-card rounded-lg shadow-xl border border-border overflow-hidden"
          style={{ maxHeight: 'min(28rem, calc(100vh - 80px))' }}
          role="menu"
        >
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notificationsError ? (
              <div className="p-4 text-sm text-muted-foreground">Unable to load notifications.</div>
            ) : loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.slice(0, 20).map(n => (
                  <li key={n.id}>
                    <Link
                      to={
                        n.type === 'message'
                          ? n.lease_id
                            ? `${messagesPath}/${n.lease_id}`
                            : messagesPath
                          : linkPath
                      }
                      className={cn(
                        'flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors',
                        !n.read && 'bg-primary/5'
                      )}
                      onClick={() => {
                        if (!n.read) markNotificationAsRead(n.id)
                        setOpen(false)
                      }}
                    >
                      <span className="flex-shrink-0 mt-0.5">
                        {n.type === 'message' ? (
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Info className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm text-foreground">{notificationLabel(n.type)}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {formatNotificationTime(n.created_at)}
                        </span>
                      </span>
                      {!n.read && (
                        <span
                          className="flex-shrink-0 w-2 h-2 rounded-full bg-primary"
                          aria-hidden
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-2 border-t border-border">
            <Link
              to={messagesPath}
              className="block text-center text-sm text-primary hover:underline py-1"
              onClick={() => setOpen(false)}
            >
              View all messages
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
