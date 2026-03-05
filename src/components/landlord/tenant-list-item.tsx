import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { navigateToTenantMessaging } from '@/lib/messaging-helpers'
import { MapPin, Eye, Trash2, MessageSquare } from 'lucide-react'
import type { Tenant } from '@/hooks/use-tenants'

interface TenantListItemProps {
  tenant: Tenant
  onDelete?: (id: string) => void
  onView?: (tenant: Tenant) => void
}

export function TenantListItem({ tenant, onDelete, onView }: TenantListItemProps) {
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

  const isLeaseActive = tenant.lease_end_date ? new Date(tenant.lease_end_date) > new Date() : true

  return (
    <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-foreground truncate">
              {tenant.user?.email || 'Tenant'}
            </h3>
            <Badge variant={isLeaseActive ? 'default' : 'secondary'} className="shrink-0">
              {isLeaseActive ? 'Active' : 'Ended'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {tenant.property && (
              <Link
                to={`/landlord/properties/${tenant.property_id}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <MapPin className="w-3 h-3" />
                <span className="truncate">{tenant.property.name}</span>
              </Link>
            )}
            <span>Move-in: {moveInDate}</span>
            <span>Lease ends: {leaseEndDate}</span>
            {tenant.phone && <span>{tenant.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(tenant)}>
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          )}
          {messagingEnabled && tenant.property_id && (
            <Button variant="outline" size="sm" onClick={handleMessage} title="Message tenant">
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
