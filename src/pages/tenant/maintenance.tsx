import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { useLeases } from '@/hooks/use-leases'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { MaintenanceRequestForm } from '@/components/tenant/maintenance-request-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Link } from 'react-router-dom'
import { Plus, Wrench, MessageSquare, CheckCircle, XCircle } from 'lucide-react'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import {
  getStatusDisplayName,
  getStatusBadgeVariant,
  canTenantConfirmResolution,
  type WorkOrderStatus,
} from '@/lib/work-order-status'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'

export function TenantMaintenance() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'TenantMaintenance' })
  const { user } = useAuth()
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const { leases } = useLeases(undefined, tenantData?.tenant.id)
  // Get first active lease for the tenant (tenants typically have one active lease)
  const activeLease = leases?.find(
    l => !l.lease_end_date || new Date(l.lease_end_date) > new Date()
  )
  const {
    requests,
    loading: requestsLoading,
    confirmResolution,
    refetch,
  } = useMaintenanceRequests(tenantData?.property.id, true, true) // Property-scoped, tenant-visible only
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit() {
    await refetch()
    setShowForm(false)
  }

  const [confirming, setConfirming] = useState<string | null>(null)
  const [flagging, setFlagging] = useState<string | null>(null)

  async function handleConfirmResolution(requestId: string) {
    setConfirming(requestId)
    try {
      await confirmResolution(requestId)
      await refetch()
    } catch (error) {
      console.error('Error confirming resolution:', error)
      alert('Failed to confirm resolution. Please try again.')
    } finally {
      setConfirming(null)
    }
  }

  async function handleFlagIssue(requestId: string) {
    if (!user) {
      alert('You must be logged in')
      return
    }

    setFlagging(requestId)
    try {
      // Create a note on the work order to notify the landlord
      // The note trigger will automatically notify landlords
      const { error } = await supabase.from('notes').insert({
        user_id: user.id,
        entity_type: 'work_order',
        entity_id: requestId,
        content: '⚠️ **Still an issue** - The problem has not been resolved.',
      })

      if (error) throw error

      // Show success message
      alert('Issue flagged. Your landlord has been notified.')
    } catch (error) {
      console.error('Error flagging issue:', error)
      alert('Failed to flag issue. Please try again.')
    } finally {
      setFlagging(null)
    }
  }

  if (tenantLoading || requestsLoading) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative">
        <GrainOverlay />
        <div className="text-center py-12 relative z-10">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative">
        <GrainOverlay />
        <Card className="relative z-10">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You&apos;ll be able to submit maintenance requests once your landlord adds you to a
              lease.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 max-w-2xl relative">
        <GrainOverlay />
        <div className="relative z-10">
          <MaintenanceRequestForm
            leaseId={activeLease?.id}
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
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-foreground mb-2">Maintenance Requests</h1>
            <p className="text-muted-foreground">Submit and track maintenance requests</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/tenant/messages?intent=maintenance">
                <MessageSquare className="mr-2 h-4 w-4" />
                Messages
              </Link>
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </div>
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
                  <Card data-testid={`work-order-card-${request.id}`}>
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
                        <Badge
                          className={getStatusBadgeVariant(request.status as WorkOrderStatus)}
                          data-testid={`work-order-status-badge-${request.id}`}
                        >
                          {getStatusDisplayName(request.status as WorkOrderStatus, 'tenant')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground whitespace-pre-wrap">
                        {request.public_description || request.description}
                      </p>
                      {request.scheduled_date && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Scheduled: {new Date(request.scheduled_date).toLocaleString()}
                        </p>
                      )}
                      {request.updated_at !== request.created_at && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Last updated: {new Date(request.updated_at).toLocaleDateString()}
                        </p>
                      )}

                      {/* Resolution Confirmation UI */}
                      {canTenantConfirmResolution(request.status as WorkOrderStatus) && (
                        <div className="mt-4 pt-4 border-t border-border space-y-2">
                          <p className="text-sm font-medium text-foreground mb-2">
                            Is this issue resolved?
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleConfirmResolution(request.id)}
                              disabled={confirming === request.id || flagging === request.id}
                              className="flex-1"
                              data-testid={`confirm-resolution-btn-${request.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {confirming === request.id ? 'Confirming...' : 'Confirm Resolved'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFlagIssue(request.id)}
                              disabled={confirming === request.id || flagging === request.id}
                              className="flex-1"
                              data-testid={`flag-issue-btn-${request.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              {flagging === request.id ? 'Flagging...' : 'Still an Issue'}
                            </Button>
                          </div>
                        </div>
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
