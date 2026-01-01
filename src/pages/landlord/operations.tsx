import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { useTasks, type TaskInsert, type TaskUpdate } from '@/hooks/use-tasks'
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
import { Wrench, Plus } from 'lucide-react'
import { motionTokens } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

// Use the type from the hook, but convert to database type when needed
type MaintenanceRequestFromHook = {
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

type MaintenanceRequestForPrompt = Database['public']['Tables']['maintenance_requests']['Row'] & {
  property?: { id: string; name: string } | null
}

export function LandlordOperations() {
  const { requests, loading, updateRequestStatus } = useMaintenanceRequests()
  const { tasks, createTask, toggleTaskStatus, updateChecklistItem } = useTasks('work_order')
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [expensePromptWorkOrder, setExpensePromptWorkOrder] =
    useState<MaintenanceRequestForPrompt | null>(null)

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const inProgressRequests = requests.filter(r => r.status === 'in_progress')
  const completedRequests = requests.filter(r => r.status === 'completed')

  async function handleStatusUpdate(id: string, status: 'pending' | 'in_progress' | 'completed') {
    setUpdating(id)
    try {
      await updateRequestStatus(id, status)

      // Show expense prompt when work order is completed
      if (status === 'completed') {
        const workOrder = requests.find(r => r.id === id)
        if (workOrder) {
          // Convert hook type to prompt type
          setExpensePromptWorkOrder({
            ...workOrder,
            category: workOrder.category ?? null,
            property: workOrder.property
              ? { id: workOrder.property_id, name: workOrder.property.name }
              : null,
          })
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
    const variants = {
      pending:
        'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30 dark:border-yellow-500/20 font-medium',
      in_progress:
        'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 dark:border-blue-500/20 font-medium',
      completed:
        'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30 dark:border-green-500/20 font-medium',
    }
    return (
      variants[status as keyof typeof variants] ||
      'bg-stone-500/20 text-stone-700 dark:text-stone-300 border-stone-500/30 dark:border-stone-500/20 font-medium'
    )
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
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
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
                {request.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(request.id, 'in_progress')}
                      disabled={updating === request.id}
                      className="flex-1"
                      aria-label={`Mark work order as in progress`}
                    >
                      Mark In Progress
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(request.id, 'completed')}
                      disabled={updating === request.id}
                      className="flex-1"
                      aria-label={`Mark work order as completed`}
                    >
                      Complete
                    </Button>
                  </>
                )}
                {request.status === 'in_progress' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate(request.id, 'completed')}
                    disabled={updating === request.id}
                    className="w-full"
                    aria-label={`Mark work order as completed`}
                  >
                    <motion.span
                      animate={updating === request.id ? {} : {}}
                      transition={{
                        type: 'spring',
                        ...motionTokens.spring.soft,
                      }}
                    >
                      Mark Complete
                    </motion.span>
                  </Button>
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
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
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
          <h1 className="text-4xl font-semibold text-foreground mb-2">Operations</h1>
          <p className="text-muted-foreground">Manage work orders, tasks, and execution</p>
        </motion.div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading work orders...</p>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-8 w-8" />}
            title="No work orders"
            description="Work orders from tenants will appear here once submitted."
          />
        ) : (
          <div className="space-y-8">
            {pendingRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Pending ({pendingRequests.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {pendingRequests.map(request => (
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
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {inProgressRequests.map(request => (
                      <WorkOrderCard key={request.id} request={request} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {completedRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Completed ({completedRequests.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {completedRequests.map(request => (
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
    </div>
  )
}
