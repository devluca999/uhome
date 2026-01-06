import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuth } from '@/contexts/auth-context'

interface NotificationBadgeProps {
  className?: string
}

export function NotificationBadge({ className }: NotificationBadgeProps) {
  const { unreadCount, loading } = useNotifications()
  const { role } = useAuth()

  const linkPath = role === 'landlord' ? '/landlord/leases' : '/tenant/lease?tab=messages'

  if (loading) {
    return null
  }

  if (unreadCount === 0) {
    return null
  }

  return (
    <Button variant="ghost" size="sm" asChild className={cn('relative', className)}>
      <Link to={linkPath}>
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Link>
    </Button>
  )
}
