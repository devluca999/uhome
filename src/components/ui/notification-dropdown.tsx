/**
 * In-app notification dropdown: bell icon, badge count, and panel listing
 * notifications with mark-as-read. Panel is portaled to document.body with
 * fixed positioning so it is not clipped by sidebar/header overflow.
 */

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, MessageSquare, Info, CheckCheck, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuth } from '@/contexts/auth-context'

const PANEL_WIDTH = 320

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

export function NotificationDropdown({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
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

  const notificationsPath =
    role === 'landlord' ? '/landlord/notifications' : '/tenant/notifications'

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const updatePosition = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const margin = 8
      let left = r.right - PANEL_WIDTH
      left = Math.max(margin, Math.min(left, window.innerWidth - PANEL_WIDTH - margin))
      const top = r.bottom + margin
      const maxPanelH = Math.min(28 * 16, window.innerHeight - top - margin)
      setPanelStyle({
        position: 'fixed',
        top,
        left,
        width: PANEL_WIDTH,
        zIndex: 300,
        maxHeight: maxPanelH,
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, notifications.length, unreadCount])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const panel = open && (
    <div
      ref={panelRef}
      className="flex flex-col glass-card rounded-lg shadow-xl border border-border overflow-hidden"
      style={panelStyle}
      role="menu"
    >
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
        <span className="text-sm font-medium text-foreground">Notifications</span>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllAsRead()}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Mark all read
          </Button>
        )}
      </div>
      <div className="overflow-y-auto flex-1 min-h-0">
        {notificationsError ? (
          <div className="p-4 text-sm text-muted-foreground">Unable to load notifications.</div>
        ) : loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.slice(0, 20).map(n => {
              const href = notificationHref(n.type, n.lease_id, role)
              const isWorkOrder = n.type === 'work_order'
              return (
                <li key={n.id} className="flex items-stretch">
                  <Link
                    to={href}
                    className={cn(
                      'flex flex-1 items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors min-w-0',
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
                    <div className="flex items-center pr-2 shrink-0 border-l border-border">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={e => {
                          e.preventDefault()
                          e.stopPropagation()
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
      <div className="p-2 border-t border-border shrink-0">
        <Link
          to={notificationsPath}
          className="block text-center text-sm text-primary hover:underline py-1"
          onClick={() => setOpen(false)}
        >
          View all notifications
        </Link>
      </div>
    </div>
  )

  return (
    <>
      <div className={cn('relative inline-flex', className)}>
        <Button
          ref={triggerRef}
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
      </div>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </>
  )
}
