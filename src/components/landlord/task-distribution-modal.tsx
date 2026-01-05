import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BreakdownModal, type BreakdownSection } from '@/components/ui/breakdown-modal'
import { useProperties } from '@/hooks/use-properties'
import { useTasks } from '@/hooks/use-tasks'
import { useTenants } from '@/hooks/use-tenants'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Wrench, FileText, Calendar, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskDistributionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TaskDistributionModal({ isOpen, onClose }: TaskDistributionModalProps) {
  const navigate = useNavigate()
  const { properties } = useProperties()
  const { tasks } = useTasks()
  const { tenants } = useTenants()
  const { requests: workOrders } = useMaintenanceRequests()

  // Filter pending tasks
  const pendingTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'pending')
  }, [tasks])

  // Group tasks by property
  const tasksByProperty = useMemo(() => {
    const grouped: Record<string, typeof pendingTasks> = {}

    pendingTasks.forEach(task => {
      // Get property ID from linked context
      let propertyId: string | null = null

      if (task.linked_context_type === 'property') {
        propertyId = task.linked_context_id
      } else if (task.linked_context_type === 'work_order') {
        // Find work order to get property_id
        const workOrder = workOrders.find(wo => wo.id === task.linked_context_id)
        if (workOrder) {
          propertyId = workOrder.property_id
        }
      } else if (task.linked_context_type === 'rent_record') {
        // Rent records have property_id, but we'd need to fetch them
        // For MVP, we'll try to get from tenant
      }

      // If we can't determine property from context, try to get it from assigned tenant
      if (!propertyId && task.assigned_to_type === 'tenant') {
        const tenant = tenants.find(t => t.id === task.assigned_to_id)
        if (tenant) {
          propertyId = tenant.property_id
        }
      }

      const key = propertyId || 'unknown'
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(task)
    })

    return grouped
  }, [pendingTasks, tenants, workOrders])

  // Categorize tasks by overdue vs upcoming
  const categorizeTasks = (taskList: typeof pendingTasks) => {
    const now = new Date()
    const overdue: typeof taskList = []
    const upcoming: typeof taskList = []

    taskList.forEach(task => {
      if (task.deadline) {
        const deadline = new Date(task.deadline)
        if (deadline < now) {
          overdue.push(task)
        } else {
          upcoming.push(task)
        }
      } else {
        upcoming.push(task)
      }
    })

    return { overdue, upcoming }
  }

  const sections = useMemo((): BreakdownSection[] => {
    const { overdue, upcoming } = categorizeTasks(pendingTasks)
    const total = pendingTasks.length

    return [
      {
        label: 'Overdue Tasks',
        value: overdue.length,
        percentage: total > 0 ? (overdue.length / total) * 100 : 0,
        color: 'red',
        breakdown: overdue.slice(0, 5).map(task => ({
          label: task.title,
          value: 1,
        })),
      },
      {
        label: 'Upcoming Tasks',
        value: upcoming.length,
        percentage: total > 0 ? (upcoming.length / total) * 100 : 0,
        color: 'blue',
        breakdown: upcoming.slice(0, 5).map(task => ({
          label: task.title,
          value: 1,
        })),
      },
    ]
  }, [pendingTasks])

  const getContextIcon = (contextType: string) => {
    switch (contextType) {
      case 'work_order':
        return <Wrench className="w-4 h-4" />
      case 'property':
        return <Home className="w-4 h-4" />
      case 'rent_record':
        return <Calendar className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getContextLink = (task: (typeof pendingTasks)[0]) => {
    switch (task.linked_context_type) {
      case 'work_order':
        return `/landlord/operations`
      case 'property':
        return `/landlord/properties`
      case 'rent_record':
        return `/landlord/finances`
      default:
        return null
    }
  }

  const breakdownComponent = (
    <div className="space-y-4">
      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">Tasks by Property</h3>
        {Object.keys(tasksByProperty).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(tasksByProperty).map(([propertyKey, taskList]) => {
              const property = properties.find(p => p.id === propertyKey)
              const { overdue, upcoming } = categorizeTasks(taskList)

              return (
                <div key={propertyKey} className="p-3 rounded-md border border-border bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">
                      {property?.name || 'Unknown Property'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {taskList.length} task{taskList.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1 mt-2">
                    {taskList.slice(0, 3).map(task => {
                      const link = getContextLink(task)
                      return (
                        <div key={task.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getContextIcon(task.linked_context_type)}
                            <span className="text-foreground">{task.title}</span>
                          </div>
                          {link && (
                            <Link
                              to={link}
                              onClick={onClose}
                              className="text-xs text-primary hover:underline"
                            >
                              View
                            </Link>
                          )}
                        </div>
                      )
                    })}
                    {taskList.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{taskList.length - 3} more task{taskList.length - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No pending tasks</p>
        )}
      </div>
    </div>
  )

  return (
    <BreakdownModal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Distribution"
      description="Pending tasks grouped by property and status"
      sections={sections}
      breakdownComponent={breakdownComponent}
      cta={{
        label: 'View all tasks',
        action: () => {
          onClose()
          navigate('/landlord/operations')
        },
      }}
    />
  )
}
