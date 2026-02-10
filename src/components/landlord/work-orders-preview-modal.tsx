import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { ReflectiveGradient } from '@/components/ui/reflective-gradient'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import { motionTokens, createSpring, durationToSeconds } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { useModalScrollLock } from '@/hooks/use-modal-scroll-lock'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { cn } from '@/lib/utils'

// Simple time-ago formatter
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`

  const years = Math.floor(months / 12)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

interface WorkOrdersPreviewModalProps {
  isOpen: boolean
  onClose: () => void
}

// priorityConfig removed - priority field doesn't exist in schema

const statusConfig = {
  pending: { label: 'Pending', color: 'yellow' },
  in_progress: { label: 'In Progress', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  closed: { label: 'Closed', color: 'gray' },
  resolved: { label: 'Resolved', color: 'green' },
}

export function WorkOrdersPreviewModal({ isOpen, onClose }: WorkOrdersPreviewModalProps) {
  const navigate = useNavigate()
  const { requests: allRequests } = useMaintenanceRequests()
  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()

  // Lock body scroll when modal is open
  useModalScrollLock(isOpen)

  // Filter to open work orders and sort by priority and date
  const workOrders = useMemo(() => {
    const open = allRequests.filter(r => r.status !== 'closed' && r.status !== 'resolved')

    // Sort by date (newest first) - priority field doesn't exist in current schema
    return open
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      .slice(0, 10) // Show top 10
  }, [allRequests])

  const handleViewAll = () => {
    onClose()
    navigate('/landlord/operations')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.fast),
            ease: motionTokens.easing.standard,
          }}
          className="absolute inset-0 bg-background/90 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  type: 'spring',
                  ...cardSpring,
                }
          }
          className="relative z-10 w-full max-w-3xl"
          style={{ height: '90vh', maxHeight: '90vh' }}
        >
          <div
            className="h-full flex flex-col overflow-hidden rounded-xl border-2 bg-card/95 backdrop-blur-md text-card-foreground shadow-card relative"
            style={{ backgroundColor: 'hsl(var(--card) / 0.95)' }}
          >
            {/* Card styling elements */}
            <div className="absolute inset-0 pointer-events-none">
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <ReflectiveGradient />
            </div>
            <div className="relative z-10 h-full flex flex-col overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 flex-shrink-0 border-b border-border">
                <div className="flex-1 pr-2">
                  <CardTitle className="text-2xl">Open Work Orders</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {workOrders.length} {workOrders.length === 1 ? 'request' : 'requests'} requiring
                    attention
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-3 overflow-y-auto flex-1 min-h-0 pb-12 pr-4">
                {workOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up!</h3>
                    <p className="text-sm text-muted-foreground">
                      No open work orders at the moment.
                    </p>
                  </div>
                ) : (
                  <>
                    {workOrders.map((order, index) => {
                      const status = order.status || 'submitted'
                      const PriorityIcon = Clock // Priority field doesn't exist in current schema

                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: index * 0.05,
                            duration: prefersReducedMotion
                              ? 0
                              : durationToSeconds(motionTokens.duration.base),
                          }}
                        >
                          <div
                            className={cn(
                              'rounded-lg border-2 p-4 hover:border-primary/50 transition-colors cursor-pointer border-border'
                            )}
                            onClick={handleViewAll}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <PriorityIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                  {order.property?.name || 'Unknown Property'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Priority badge removed - priority field doesn't exist */}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    status === 'in_progress'
                                      ? 'border-blue-500/50 text-blue-600 dark:text-blue-400'
                                      : 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400'
                                  )}
                                >
                                  {statusConfig[status as keyof typeof statusConfig]?.label ||
                                    'Pending'}
                                </Badge>
                              </div>
                            </div>

                            <p className="text-sm text-foreground mb-2 line-clamp-2">
                              {order.public_description ||
                                order.description ||
                                'No description provided'}
                            </p>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Created {formatTimeAgo(new Date(order.created_at))}</span>
                              {order.created_by_role && (
                                <span className="capitalize">by {order.created_by_role}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </>
                )}
              </CardContent>

              {workOrders.length > 0 && (
                <div className="border-t border-border p-4 flex-shrink-0">
                  <Button onClick={handleViewAll} className="w-full" size="lg">
                    View All in Operations
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
