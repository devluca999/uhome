import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { MaintenanceRequestForm } from '@/components/tenant/maintenance-request-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Plus, Wrench } from 'lucide-react'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'

export function TenantMaintenance() {
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const {
    requests,
    loading: requestsLoading,
    refetch,
  } = useMaintenanceRequests(tenantData?.property.id)
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit() {
    await refetch()
    setShowForm(false)
  }

  function getStatusBadge(status: string) {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
    }
    return variants[status as keyof typeof variants] || 'bg-stone-100 text-stone-800'
  }

  if (tenantLoading || requestsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <div className="text-center py-12 relative z-10">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <Card className="relative z-10">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No property assigned</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl relative">
        <GrainOverlay />
        <div className="relative z-10">
          <MaintenanceRequestForm
            propertyId={tenantData.property.id}
            tenantId={tenantData.tenant.id}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-foreground mb-2">Maintenance Requests</h1>
            <p className="text-muted-foreground">Submit and track maintenance requests</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-8 w-8" />}
            title="No maintenance requests"
            description="Submit a maintenance request if you need repairs or have any issues with your property."
            action={{
              label: 'Submit Your First Request',
              onClick: () => setShowForm(true),
            }}
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {requests.map(request => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
                  animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                  exit={{ opacity: motionTokens.opacity.hidden, y: -4 }}
                  whileHover={{
                    y: -1,
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  }}
                  transition={{
                    duration: durationToSeconds(motionTokens.duration.base),
                    ease: motionTokens.ease.standard,
                  }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg" id={`tenant-request-${request.id}-title`}>
                            {request.category || 'Maintenance Request'}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Submitted {new Date(request.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusBadge(request.status)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground whitespace-pre-wrap">{request.description}</p>
                      {request.updated_at !== request.created_at && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Last updated: {new Date(request.updated_at).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
