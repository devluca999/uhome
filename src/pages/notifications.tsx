import { Link } from 'react-router-dom'
import { MessageSquare, Info, CheckCheck, Wrench } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useNotifications } from '@/hooks/use-notifications'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  if (type === 'message') return 'New message'
  if (type === 'work_order') return 'Maintenance update'
  return 'System notification'
}

function notificationHref(
  type: string,
  leaseId: string | null,
  role: 'tenant' | 'landlord' | 'admin' | null | undefined
): string {
  const messagesPath = role === 'landlord' ? '/landlord/messages' : '/tenant/messages'
  const defaultNonMessagePath =
    role === 'landlord' ? '/landlord/leases' : '/tenant/lease?tab=messages'
  if (type === 'message') {
    return leaseId ? `${messagesPath}/${leaseId}` : messagesPath
  }
  if (type === 'work_order') {
    return role === 'landlord' ? '/landlord/maintenance' : '/tenant/maintenance'
  }
  return defaultNonMessagePath
}

export function NotificationsPage() {
  usePerformanceTracker({ componentName: 'NotificationsPage' })
  const { role } = useAuth()
  const {
    notifications,
    unreadCount,
    loading,
    error: notificationsError,
    markNotificationAsRead,
    markNotificationDismissed,
    markAllAsRead,
  } = useNotifications()

  const messagesPath = role === 'landlord' ? '/landlord/messages' : '/tenant/messages'

  return (
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Alerts and messages for your account
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="glass-card rounded-lg border border-border overflow-hidden">
          {notificationsError ? (
            <div className="p-6 text-sm text-muted-foreground">Unable to load notifications.</div>
          ) : loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map(n => {
                const href = notificationHref(n.type, n.lease_id, role)
                const isWorkOrder = n.type === 'work_order'
                return (
                  <li key={n.id} className="flex items-stretch">
                    <Link
                      to={href}
                      className={cn(
                        'flex flex-1 items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors min-w-0',
                        !n.read && 'bg-primary/5'
                      )}
                      onClick={() => {
                        if (!n.read) void markNotificationAsRead(n.id)
                      }}
                    >
                      <span className="flex-shrink-0 mt-0.5">
                        {n.type === 'message' ? (
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        ) : n.type === 'work_order' ? (
                          <Wrench className="h-4 w-4 text-muted-foreground" />
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
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1" aria-hidden />
                      )}
                    </Link>
                    {isWorkOrder && (
                      <div className="flex items-center pr-3 shrink-0 border-l border-border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={e => {
                            e.preventDefault()
                            markNotificationDismissed(n.id)
                          }}
                        >
                          Mark as seen
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          <Link to={messagesPath} className="text-primary hover:underline">
            Open messages
          </Link>{' '}
          for full conversation threads.
        </p>
      </div>
    </div>
  )
}
