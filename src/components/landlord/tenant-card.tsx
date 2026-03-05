import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { navigateToTenantMessaging } from '@/lib/messaging-helpers'
import { MapPin, Eye, MessageSquare } from 'lucide-react'
import type { Tenant } from '@/hooks/use-tenants'

interface TenantCardProps {
  tenant: Tenant
  onDelete?: (id: string) => void
  onView?: (tenant: Tenant) => void
}

export function TenantCard({ tenant, onDelete, onView }: TenantCardProps) {
  const navigate = useNavigate()
  const messagingEnabled = isFeatureEnabled('ENABLE_MESSAGING_ENTRY_POINTS')

  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove this tenant?`)) {
      onDelete?.(tenant.id)
    }
  }

  const handleMessage = async () => {
    if (!tenant.property_id) return
    await navigateToTenantMessaging(tenant.id, tenant.property_id, 'general', 'landlord', url => {
      navigate(url)
    })
  }

  const moveInDate = new Date(tenant.move_in_date).toLocaleDateString()
  const leaseEndDate = tenant.lease_end_date
    ? new Date(tenant.lease_end_date).toLocaleDateString()
    : 'No end date'

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      exit={{ opacity: motionTokens.opacity.hidden, y: -4 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{tenant.user?.email || 'Tenant'}</CardTitle>
          {tenant.property && (
            <CardDescription>
              <Link
                to={`/landlord/properties/${tenant.property_id}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <MapPin className="w-3 h-3" />
                {tenant.property.name}
                {tenant.property.address && ` - ${tenant.property.address}`}
              </Link>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Move-in Date</span>
              <span className="text-sm font-medium text-foreground">{moveInDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lease End</span>
              <span className="text-sm font-medium">{leaseEndDate}</span>
            </div>
            {tenant.phone && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm font-medium text-foreground">{tenant.phone}</span>
              </div>
            )}
            {tenant.notes && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Notes</span>
                <div className="bg-muted/50 p-2 rounded-md">
                  <MarkdownRenderer content={tenant.notes} />
                </div>
              </div>
            )}
            <div className="pt-2 flex gap-2">
              {onView && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onView(tenant)}
                  className="flex-1"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              )}
              {messagingEnabled && tenant.property_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMessage}
                  className="flex-1"
                  title="Message tenant"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Message
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className={
                    onView || messagingEnabled
                      ? 'flex-1'
                      : 'w-full text-destructive hover:text-destructive/90'
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
