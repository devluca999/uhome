import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { useTasks, type TaskInsert, type TaskUpdate } from '@/hooks/use-tasks'
import { useUrlParams } from '@/lib/url-params'
import { useProperties } from '@/hooks/use-properties'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { TaskCard } from '@/components/ui/task-card'
import { TaskForm } from '@/components/landlord/task-form'
import { NotesPanel } from '@/components/landlord/notes-panel'
import { WorkOrderExpensePrompt } from '@/components/landlord/work-order-expense-prompt'
import { WorkOrderForm } from '@/components/landlord/work-order-form'
import { Wrench, Plus, X, Filter, AlertTriangle } from 'lucide-react'
import { motionTokens } from '@/lib/motion'
import { cn } from '@/lib/utils'
import {
  getStatusDisplayName,
  getStatusBadgeVariant,
  type WorkOrderStatus,
} from '@/lib/work-order-status'
import { MobileFab } from '@/components/ui/mobile-fab'
import type { Database } from '@/types/database'

// Use the type from the hook, but convert to database type when needed
type MaintenanceRequestFromHook = {
  id: string
  property_id: string
  tenant_id: string | null
  lease_id: string | null
  status: 'submitted' | 'seen' | 'scheduled' | 'in_progress' | 'resolved' | 'closed'
  category?: string
  description: string
  public_description?: string | null
  internal_notes?: string | null
  scheduled_date?: string | null
  created_by_role: 'landlord' | 'tenant'
  visibility_to_tenants: boolean
  created_at: string
  updated_at: string
  created_by?: string
  property?: {
    name: string
  }
  tenant?: {
    user?: {
      email: string
    }
  }
}

type MaintenanceRequestForPrompt = Omit<
  Database['public']['Tables']['maintenance_requests']['Row'],
  'tenant_id'
> & {
  tenant_id: string | null
  property?: { id: string; name: string } | null
}

type RecencyFilter = 'newest' | 'oldest' | 'last7days' | 'last30days' | 'all'
type UrgencyFilter = 'urgent' | 'normal' | 'all'
type StatusFilter =
  | 'submitted'
  | 'seen'
  | 'scheduled'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'all'
type CategoryFilter = string | 'all'

export function LandlordOperations() {
  const { getFilterParam, clearFilterParam, setFilterParam } = useUrlParams()
  const { properties } = useProperties()
  const propertyIdFilter = getFilterParam('propertyId')
  const workOrderIdParam = getFilterParam('workOrderId')
  const { requests, loading, updateRequestStatus, getNextValidStatuses, refetch } =
    useMaintenanceRequests(propertyIdFilter || undefined, !!propertyIdFilter)
  const { tasks, createTask, toggleTaskStatus, updateChecklistItem } = useTasks('work_order')
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false)
  const [expensePromptWorkOrder, setExpensePromptWorkOrder] =
    useState<MaintenanceRequestForPrompt | null>(null)

  // Filter states
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>('newest')
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  // Deep link: open a specific work order from elsewhere (e.g. dashboard activity feed).
  useEffect(() => {
    if (!workOrderIdParam) return
    setSelectedRequest(workOrderIdParam)
    // Ensure the card is visible (avoid filters hiding it).
    setStatusFilter('all')
    setUrgencyFilter('all')
    setRecencyFilter('newest')
    setCategoryFilter('all')
  }, [workOrderIdParam])

  useEffect(() => {
    if (!workOrderIdParam) return
    // Scroll once requests have likely rendered.
    const el = document.getElementById(`workorder-${workOrderIdParam}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [workOrderIdParam, requests.length])

  const filteredProperty = propertyIdFilter
    ? properties.find((p: { id: string }) => p.id === propertyIdFilter)
    : null

  // Get unique categories from requests
  const categories = useMemo(() => {
    const cats = new Set<string>()
    requests.forEach(r => {
      if (r.category) cats.add(r.category)
    })
    return Array.from(cats).sort()
  }, [requests])

  // Calculate urgency based on age of submitted requests
  const getUrgency = (request: MaintenanceRequestFromHook): 'urgent' | 'normal' => {
    if (request.status !== 'submitted') return 'normal'
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSinceCreation >= 7 ? 'urgent' : 'normal'
  }

  // Apply all filters
  const filteredRequests = useMemo(() => {
    // Filter out requests with null property_id and convert to MaintenanceRequestFromHook
    let filtered = requests
      .filter(
        (r): r is MaintenanceRequestFromHook & { property_id: string } => r.property_id !== null
      )
      .map(r => r as MaintenanceRequestFromHook)

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    // Property filter (already applied via hook, but keep for consistency)
    if (propertyIdFilter) {
      filtered = filtered.filter(r => r.property_id === propertyIdFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter)
    }

    // Urgency filter
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(r => getUrgency(r) === urgencyFilter)
    }

    // Recency filter
    if (recencyFilter === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (recencyFilter === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (recencyFilter === 'last7days') {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      filtered = filtered.filter(r => new Date(r.created_at).getTime() >= sevenDaysAgo)
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (recencyFilter === 'last30days') {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      filtered = filtered.filter(r => new Date(r.created_at).getTime() >= thirtyDaysAgo)
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return filtered
  }, [requests, statusFilter, propertyIdFilter, categoryFilter, urgencyFilter, recencyFilter])

  const submittedRequests = filteredRequests.filter(r => r.status === 'submitted')
  const seenRequests = filteredRequests.filter(r => r.status === 'seen')
  const scheduledRequests = filteredRequests.filter(r => r.status === 'scheduled')
  const inProgressRequests = filteredRequests.filter(r => r.status === 'in_progress')
  const resolvedRequests = filteredRequests.filter(r => r.status === 'resolved')
  const closedRequests = filteredRequests.filter(r => r.status === 'closed')

  async function handleStatusUpdate(
    id: string,
    status: WorkOrderStatus,
    scheduledDate?: string | null
  ) {
    setUpdating(id)
    try {
      await updateRequestStatus(id, status, scheduledDate)

      // Show expense prompt when work order is closed
      if (status === 'closed') {
        const workOrder = requests.find(r => r.id === id)
        if (workOrder && workOrder.property_id) {
          // Convert hook type to prompt type, ensuring all optional fields are null instead of undefined
          setExpensePromptWorkOrder({
            ...workOrder,
            category: workOrder.category ?? null,
            created_by: workOrder.created_by ?? null,
            scheduled_date: workOrder.scheduled_date ?? null,
            internal_notes: workOrder.internal_notes ?? null,
            public_description: workOrder.public_description ?? null,
            property: workOrder.property
              ? { id: workOrder.property_id, name: workOrder.property.name }
              : null,
          } as MaintenanceRequestForPrompt)
        }
      }
    } catch (error) {
      console.error('Error updating request:', error)
    } finally {
      setUpdating(null)
    }
  }

  async function handleCreateTask(data: TaskInsert | TaskUpdate) {
    // TaskForm can pass either TaskInsert or TaskUpdate, but we only create new tasks here
    if (
      'assigned_to_type' in data &&
      'assigned_to_id' in data &&
      'linked_context_type' in data &&
      'linked_context_id' in data
    ) {
      const result = await createTask(data as TaskInsert)
      if (!result.error) {
        setShowTaskForm(false)
      }
      return result
    }
    // If it's TaskUpdate, we shouldn't be here for creating new tasks
    return { data: null, error: new Error('Invalid task data for creation') }
  }

  function getStatusBadge(status: string) {
    return getStatusBadgeVariant(status as WorkOrderStatus)
  }

  function WorkOrderCard({ request }: { request: MaintenanceRequestFromHook }) {
    const requestTasks = tasks.filter(t => t.linked_context_id === request.id)
    const isExpanded = selectedRequest === request.id

    return (
      <motion.div
        initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
        animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
        exit={{ opacity: motionTokens.opacity.hidden, y: -4 }}
        transition={{
          duration: motionTokens.duration.normal,
          ease: motionTokens.easing.standard,
        }}
      >
        <div id={`workorder-${request.id}`} />
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg" id={`request-${request.id}-title`}>
                    {request.property?.name || 'Unknown Property'}
                  </CardTitle>
                  {getUrgency(request) === 'urgent' && request.status === 'submitted' && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Urgent
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-1">
                  {request.tenant?.user?.email || request.tenant_id
                    ? 'Unknown Tenant'
                    : 'No tenant assigned'}
                </CardDescription>
              </div>
              <Badge className={getStatusBadge(request.status)}>
                {getStatusDisplayName(request.status, 'landlord')}
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
                <p className="text-sm text-foreground mt-1">
                  {request.public_description || request.description}
                </p>
              </div>
              {request.scheduled_date && (
                <div>
                  <span className="text-xs text-muted-foreground">Scheduled Date</span>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {new Date(request.scheduled_date).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Created {new Date(request.created_at).toLocaleDateString()}</span>
                {request.status === 'submitted' && (
                  <span
                    className={cn(
                      getUrgency(request) === 'urgent' && 'text-destructive font-medium'
                    )}
                  >
                    {Math.floor(
                      (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
                    )}{' '}
                    days ago
                  </span>
                )}
              </div>

              {/* Tasks Section */}
              {requestTasks.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">
                    Tasks ({requestTasks.length})
                  </h4>
                  <div className="space-y-2">
                    {requestTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleStatus={() => toggleTaskStatus(task.id)}
                        onUpdateChecklist={(taskId, itemId, completed) =>
                          updateChecklistItem(taskId, itemId, completed)
                        }
                        className="text-sm"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {request.status !== 'closed' && (
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Update Status
                    </label>
                    <select
                      value={request.status}
                      onChange={e => {
                        const newStatus = e.target.value as WorkOrderStatus
                        if (newStatus === 'scheduled') {
                          // Prompt for scheduled date
                          const date = prompt('Enter scheduled date/time (YYYY-MM-DDTHH:mm):')
                          if (date) {
                            handleStatusUpdate(request.id, newStatus, date)
                          }
                        } else {
                          handleStatusUpdate(request.id, newStatus)
                        }
                      }}
                      disabled={updating === request.id}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value={request.status}>
                        {getStatusDisplayName(request.status, 'landlord')}
                      </option>
                      {getNextValidStatuses(request.id).map(nextStatus => (
                        <option key={nextStatus} value={nextStatus}>
                          → {getStatusDisplayName(nextStatus, 'landlord')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedRequest(isExpanded ? null : request.id)
                    setShowTaskForm(false)
                  }}
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <Plus className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-45')} />
                </Button>
              </div>

              {/* Expanded Section */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                      duration: motionTokens.duration.normal,
                      ease: motionTokens.easing.standard,
                    }}
                    className="pt-4 border-t border-border space-y-4"
                  >
                    {!showTaskForm ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTaskForm(true)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <TaskForm
                          contextType="work_order"
                          contextId={request.id}
                          onSubmit={handleCreateTask}
                          onCancel={() => setShowTaskForm(false)}
                        />
                      </div>
                    )}
                    {/* Internal Notes Section */}
                    {request.internal_notes && (
                      <div className="pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-foreground mb-2">Internal Notes</h4>
                        <p className="text-sm text-muted-foreground">{request.internal_notes}</p>
                      </div>
                    )}
                    {/* Notes Section */}
                    <div className="pt-4 border-t border-border">
                      <NotesPanel entityType="work_order" entityId={request.id} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen bg-background [isolation:isolate]">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: motionTokens.duration.normal,
            ease: motionTokens.easing.standard,
          }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-semibold text-foreground mb-2">Operations</h1>
              <p className="text-muted-foreground">
                {filteredProperty
                  ? `Work orders for ${filteredProperty.name}`
                  : 'Manage work orders, tasks, and execution'}
              </p>
            </div>
            <Button onClick={() => setShowWorkOrderForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Work Order
            </Button>
          </div>

          {/* Filter Bar */}
          <Card className="glass-card mb-6 max-w-4xl mx-auto">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Filters:</span>
                </div>

                {/* Property Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">
                    Property:
                  </label>
                  <select
                    value={propertyIdFilter || 'all'}
                    onChange={e => {
                      if (e.target.value === 'all') {
                        clearFilterParam('propertyId')
                      } else {
                        setFilterParam('propertyId', e.target.value)
                      }
                    }}
                    className="flex h-8 min-w-[120px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">All Properties</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                    className="flex h-8 min-w-[100px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="seen">Seen</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Category Filter */}
                {categories.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">
                      Category:
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="flex h-8 min-w-[110px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Urgency Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">
                    Urgency:
                  </label>
                  <select
                    value={urgencyFilter}
                    onChange={e => setUrgencyFilter(e.target.value as UrgencyFilter)}
                    className="flex h-8 min-w-[100px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">All</option>
                    <option value="urgent">Urgent (7+ days)</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>

                {/* Recency Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">
                    Sort by:
                  </label>
                  <select
                    value={recencyFilter}
                    onChange={e => setRecencyFilter(e.target.value as RecencyFilter)}
                    className="flex h-8 min-w-[110px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="last7days">Last 7 Days</option>
                    <option value="last30days">Last 30 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                {/* Clear All Filters */}
                {(propertyIdFilter ||
                  statusFilter !== 'all' ||
                  categoryFilter !== 'all' ||
                  urgencyFilter !== 'all' ||
                  recencyFilter !== 'newest') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearFilterParam('propertyId')
                      setStatusFilter('all')
                      setCategoryFilter('all')
                      setUrgencyFilter('all')
                      setRecencyFilter('newest')
                    }}
                    className="ml-auto h-8 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {showWorkOrderForm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-8"
          >
            <WorkOrderForm
              onSubmit={() => {
                setShowWorkOrderForm(false)
                refetch()
              }}
              onCancel={() => setShowWorkOrderForm(false)}
              propertyId={propertyIdFilter || undefined}
            />
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading work orders...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-8 w-8" />}
            title="No work orders match filters"
            description={
              requests.length === 0
                ? 'Work orders from tenants will appear here once submitted.'
                : 'Try adjusting your filters to see more results.'
            }
          />
        ) : statusFilter !== 'all' ? (
          // When status filter is active, show single filtered list
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {statusFilter === 'submitted' && `Submitted Work Orders (${filteredRequests.length})`}
              {statusFilter === 'seen' && `Seen Work Orders (${filteredRequests.length})`}
              {statusFilter === 'scheduled' && `Scheduled Work Orders (${filteredRequests.length})`}
              {statusFilter === 'in_progress' &&
                `In Progress Work Orders (${filteredRequests.length})`}
              {statusFilter === 'resolved' && `Resolved Work Orders (${filteredRequests.length})`}
              {statusFilter === 'closed' && `Closed Work Orders (${filteredRequests.length})`}
            </h2>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <AnimatePresence initial={false}>
                {filteredRequests.map(request => (
                  <WorkOrderCard key={request.id} request={request} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          // When status filter is 'all', show grouped by status
          <div className="space-y-8">
            {submittedRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Submitted ({submittedRequests.length})
                </h2>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {submittedRequests.map(request => (
                      <WorkOrderCard key={request.id} request={request} />
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
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {seenRequests.map(request => (
                      <WorkOrderCard key={request.id} request={request} />
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
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {scheduledRequests.map(request => (
                      <WorkOrderCard key={request.id} request={request} />
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
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {inProgressRequests.map(request => (
                      <WorkOrderCard key={request.id} request={request} />
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
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {resolvedRequests.map(request => (
                      <WorkOrderCard key={request.id} request={request} />
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
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {closedRequests.map(request => (
                      <WorkOrderCard key={request.id} request={request} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expense Prompt Modal */}
      {expensePromptWorkOrder && (
        <WorkOrderExpensePrompt
          workOrder={expensePromptWorkOrder}
          onClose={() => setExpensePromptWorkOrder(null)}
        />
      )}
      <MobileFab label="New work order" onClick={() => setShowWorkOrderForm(true)} />
    </div>
  )
}
