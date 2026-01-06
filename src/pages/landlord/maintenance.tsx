import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Wrench } from 'lucide-react'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'

type MaintenanceRequest = {
  id: string
  property_id: string
  tenant_id: string
  status: 'pending' | 'in_progress' | 'completed'
  category?: string
  description: string
  created_at: string
  updated_at: string
  property?: {
    name: string
  }
  tenant?: {
    user?: {
      email: string
    }
  }
}

export function LandlordMaintenance() {
  const { requests, loading, updateRequestStatus } = useMaintenanceRequests()
  const [updating, setUpdating] = useState<string | null>(null)

  const submittedRequests = requests.filter(r => r.status === 'submitted')
  const seenRequests = requests.filter(r => r.status === 'seen')
  const scheduledRequests = requests.filter(r => r.status === 'scheduled')
  const inProgressRequests = requests.filter(r => r.status === 'in_progress')
  const resolvedRequests = requests.filter(r => r.status === 'resolved')
  const closedRequests = requests.filter(r => r.status === 'closed')

  async function handleStatusUpdate(
    id: string,
    status: 'submitted' | 'seen' | 'scheduled' | 'in_progress' | 'resolved' | 'closed'
  ) {
    setUpdating(id)
    try {
      await updateRequestStatus(id, status)
    } catch (error) {
      console.error('Error updating request:', error)
    } finally {
      setUpdating(null)
    }
  }

  function getStatusBadge(status: string) {
    const { getStatusBadgeVariant } = require('@/lib/work-order-status')
    return getStatusBadgeVariant(status as any)
  }

  function RequestCard({ request }: { request: MaintenanceRequest }) {
    return (
      <motion.div
        initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
        animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
        exit={{ opacity: motionTokens.opacity.hidden, y: -4 }}
        whileHover={{
          y: -2,
        }}
        transition={{
          duration: durationToSeconds(motionTokens.duration.base),
          ease: motionTokens.ease.standard,
        }}
      >
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg" id={`request-${request.id}-title`}>
                  {request.property?.name || 'Unknown Property'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {request.tenant?.user?.email || 'Unknown Tenant'}
                </CardDescription>
              </div>
              <Badge className={getStatusBadge(request.status)}>
                {request.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {request.category && (
                <div>
                  <span className="text-xs text-muted-foreground">Category</span>
                  <p className="text-sm font-medium text-foreground">{request.category}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground">Description</span>
                <p className="text-sm text-foreground mt-1">{request.description}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Submitted {new Date(request.created_at).toLocaleDateString()}</span>
              </div>
              {request.status !== 'closed' && (
                <div className="flex gap-2 pt-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Update Status
                    </label>
                    <select
                      value={request.status}
                      onChange={e => {
                        const newStatus = e.target.value as any
                        handleStatusUpdate(request.id, newStatus)
                      }}
                      disabled={updating === request.id}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value={request.status}>{request.status.replace('_', ' ')}</option>
                      {['seen', 'scheduled', 'in_progress', 'resolved', 'closed']
                        .filter(s => s !== request.status)
                        .map(nextStatus => (
                          <option key={nextStatus} value={nextStatus}>
                            → {nextStatus.replace('_', ' ')}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-foreground mb-2">Maintenance Requests</h1>
          <p className="text-muted-foreground">View and manage maintenance requests</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-8 w-8" />}
            title="No maintenance requests"
            description="Maintenance requests from tenants will appear here once submitted."
          />
        ) : (
          <div className="space-y-8">
            {submittedRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Submitted ({submittedRequests.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {submittedRequests.map(request => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {seenRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Seen ({seenRequests.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {seenRequests.map(request => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {scheduledRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Scheduled ({scheduledRequests.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {scheduledRequests.map(request => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {inProgressRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  In Progress ({inProgressRequests.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {inProgressRequests.map(request => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {resolvedRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Resolved ({resolvedRequests.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {resolvedRequests.map(request => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {closedRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Closed ({closedRequests.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {closedRequests.map(request => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
