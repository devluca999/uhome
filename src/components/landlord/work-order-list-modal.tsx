import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Drawer } from '@/components/ui/drawer'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { useProperties } from '@/hooks/use-properties'
import { useUrlParams } from '@/lib/url-params'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getStatusDisplayName,
  getStatusBadgeVariant,
  type WorkOrderStatus,
} from '@/lib/work-order-status'

interface WorkOrderListModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
}

export function WorkOrderListModal({ isOpen, onClose, propertyId }: WorkOrderListModalProps) {
  const navigate = useNavigate()
  const { setFilterParam } = useUrlParams()
  const { requests } = useMaintenanceRequests(propertyId, true) // true = isPropertyId
  const { properties } = useProperties()

  const property = useMemo(() => {
    return properties.find(p => p.id === propertyId)
  }, [properties, propertyId])

  const statusCounts = useMemo(() => {
    return {
      submitted: requests.filter(r => r.status === 'submitted').length,
      seen: requests.filter(r => r.status === 'seen').length,
      scheduled: requests.filter(r => r.status === 'scheduled').length,
      in_progress: requests.filter(r => r.status === 'in_progress').length,
      resolved: requests.filter(r => r.status === 'resolved').length,
      closed: requests.filter(r => r.status === 'closed').length,
    }
  }, [requests])

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={property ? `Work Orders - ${property.name}` : 'Work Orders'}
      description={property ? property.address || undefined : 'All work orders for this property'}
      side="right"
    >
      <div className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">
                  {statusCounts.submitted}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Submitted</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">
                  {statusCounts.in_progress}
                </div>
                <div className="text-xs text-muted-foreground mt-1">In Progress</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">
                  {statusCounts.resolved + statusCounts.closed}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Resolved/Closed</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No work orders for this property</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                onClose()
                navigate('/landlord/operations')
              }}
            >
              Create Work Order
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {requests.map(request => {
                const createdDate = new Date(request.created_at).toLocaleDateString()
                const updatedDate =
                  request.updated_at !== request.created_at
                    ? new Date(request.updated_at).toLocaleDateString()
                    : null

                return (
                  <Card key={request.id} className="hover:bg-muted/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {request.category || 'Maintenance Request'}
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            <span>Created: {createdDate}</span>
                            {updatedDate && <span>• Updated: {updatedDate}</span>}
                          </CardDescription>
                        </div>
                        <Badge
                          className={cn(
                            'text-xs',
                            getStatusBadgeVariant(request.status as WorkOrderStatus)
                          )}
                        >
                          {getStatusDisplayName(request.status as WorkOrderStatus, 'landlord')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">
                        {request.public_description || request.description}
                      </p>
                      {request.tenant?.user?.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>Tenant: {request.tenant.user.email}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <div className="pt-4 border-t border-border">
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  onClose()
                  setFilterParam('propertyId', propertyId)
                  navigate('/landlord/operations')
                }}
              >
                View All Work Orders
              </Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}
