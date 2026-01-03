import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { HeroGreeting } from '@/components/ui/hero-greeting'
import { PaymentCard } from '@/components/ui/payment-card'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useRentRecords } from '@/hooks/use-rent-records'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { useTenantTasks } from '@/hooks/use-tasks'
import { TaskCard } from '@/components/ui/task-card'
import { TaskReminderToast } from '@/components/ui/task-reminder-toast'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, MessageSquare, ChevronDown, ChevronUp, CheckSquare } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'

export function TenantDashboard() {
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const { records: rentRecords, loading: rentLoading } = useRentRecords(tenantData?.tenant.id)
  const { requests, loading: maintenanceLoading } = useMaintenanceRequests(tenantData?.property.id)
  const {
    tasks,
    loading: tasksLoading,
    toggleTaskStatus,
    updateChecklistItem,
  } = useTenantTasks(tenantData?.tenant.id)
  const { user } = useAuth()
  const [announcementsOpen, setAnnouncementsOpen] = useState(false)
  const [showTaskReminder, setShowTaskReminder] = useState<string | null>(null)
  const cardSpring = createSpring('card')

  // Show toast reminder for tasks with deadlines approaching
  useEffect(() => {
    const now = new Date()
    const pendingTasks = tasks.filter(t => t.status === 'pending' && t.deadline)

    const upcomingTask = pendingTasks.find(task => {
      if (!task.deadline) return false
      const deadline = new Date(task.deadline)
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil <= 3 && daysUntil >= 0
    })

    if (upcomingTask && !showTaskReminder) {
      setShowTaskReminder(upcomingTask.id)
    }
  }, [tasks, showTaskReminder])

  const pendingRent = rentRecords.filter(
    r => r.status === 'pending' || r.status === 'overdue'
  ).length
  const pendingMaintenance = requests.filter(r => r.status === 'pending').length
  const nextRentRecord = rentRecords.find(r => r.status === 'pending')
  const overdueRent = rentRecords.filter(r => r.status === 'overdue').length

  if (tenantLoading) {
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
        <div className="mb-8 relative z-10">
          <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back</p>
        </div>
        <EmptyState
          icon={<Home className="h-8 w-8" />}
          title="No property assigned yet"
          description="Contact your landlord to be assigned to a property and start managing your rental information."
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />

      <div className="relative z-10">
        {user && <HeroGreeting name={user.email?.split('@')[0] || 'User'} />}

        {nextRentRecord && (
          <div className="mb-6">
            <PaymentCard
              amount={nextRentRecord.amount}
              dueDate={new Date(nextRentRecord.due_date).toLocaleDateString()}
              status={nextRentRecord.status === 'overdue' ? 'overdue' : 'pending'}
            />
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{
              type: 'spring',
              ...cardSpring,
              delay: 0.1,
            }}
          >
            <Card className="glass-card relative overflow-hidden">
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <CardHeader>
                <CardTitle>Maintenance Requests</CardTitle>
                <CardDescription>Your maintenance status</CardDescription>
              </CardHeader>
              <CardContent>
                {maintenanceLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <div className="space-y-3">
                    <div className="pt-2">
                      <p className="text-3xl font-semibold text-foreground">{pendingMaintenance}</p>
                      <p className="text-xs text-muted-foreground mt-1">Pending requests</p>
                    </div>
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/tenant/maintenance">View All Requests</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{
              type: 'spring',
              ...cardSpring,
              delay: 0.15,
            }}
          >
            <Card className="glass-card relative overflow-hidden">
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <CardHeader>
                <CardTitle>Rent Status</CardTitle>
                <CardDescription>Current rent information</CardDescription>
              </CardHeader>
              <CardContent>
                {rentLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : rentRecords.length === 0 ? (
                  <p className="text-muted-foreground">No rent records yet</p>
                ) : (
                  <div className="space-y-3">
                    {overdueRent > 0 && (
                      <div className="p-2 bg-destructive/20 border border-destructive/30 rounded-md">
                        <p className="text-sm text-destructive">
                          {overdueRent} payment{overdueRent > 1 ? 's' : ''} overdue
                        </p>
                      </div>
                    )}
                    <div className="pt-2">
                      <p className="text-3xl font-semibold text-foreground">{pendingRent}</p>
                      <p className="text-xs text-muted-foreground mt-1">Pending/Overdue</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Active Tasks Section */}
        {tasks.length > 0 && (
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: motionTokens.duration.normal,
              delay: 0.2,
              ease: motionTokens.easing.standard,
            }}
            className="mb-6"
          >
            <Card className="glass-card relative overflow-hidden">
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  Active Tasks ({tasks.filter(t => t.status === 'pending').length})
                </CardTitle>
                <CardDescription>Tasks assigned to you</CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <p className="text-muted-foreground">Loading tasks...</p>
                ) : (
                  <div className="space-y-3">
                    {tasks
                      .filter(t => t.status === 'pending')
                      .slice(0, 3)
                      .map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggleStatus={() => toggleTaskStatus(task.id)}
                          onUpdateChecklist={(taskId, itemId, completed) =>
                            updateChecklistItem(taskId, itemId, completed)
                          }
                        />
                      ))}
                    {tasks.filter(t => t.status === 'pending').length > 3 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{tasks.filter(t => t.status === 'pending').length - 3} more task
                        {tasks.filter(t => t.status === 'pending').length - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Task Reminder Toast */}
        <AnimatePresence>
          {showTaskReminder &&
            (() => {
              const task = tasks.find(t => t.id === showTaskReminder)
              if (!task) return null
              return (
                <TaskReminderToast
                  key={task.id}
                  task={task}
                  onDismiss={() => setShowTaskReminder(null)}
                  onComplete={() => {
                    toggleTaskStatus(task.id)
                    setShowTaskReminder(null)
                  }}
                />
              )
            })()}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: durationToSeconds(motionTokens.duration.base),
            delay: 0.2,
            ease: motionTokens.easing.standard,
          }}
        >
          <Card className="glass-card relative overflow-hidden mb-6">
            <GrainOverlay />
            <MatteLayer intensity="subtle" />
            <CardHeader>
              <button
                onClick={() => setAnnouncementsOpen(!announcementsOpen)}
                className="flex items-center justify-between w-full text-left"
              >
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Messages / Announcements
                </CardTitle>
                {announcementsOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            <motion.div
              initial={false}
              animate={{
                height: announcementsOpen ? 'auto' : 0,
                opacity: announcementsOpen ? 1 : 0,
              }}
              transition={{
                type: 'spring',
                ...cardSpring,
              }}
              style={{ overflow: 'hidden' }}
            >
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No new messages or announcements at this time.
                </p>
              </CardContent>
            </motion.div>
          </Card>
        </motion.div>

        <div className="flex gap-4">
          <Button asChild>
            <Link to="/tenant/maintenance">Submit Request</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/tenant/documents">View Documents</Link>
          </Button>
        </div>

        {tenantData.property.rules && (
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              delay: 0.25,
              ease: motionTokens.ease.standard,
            }}
            className="mt-6"
          >
            <Card className="glass-card relative overflow-hidden">
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <CardHeader>
                <CardTitle>House Rules / Considerations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{tenantData.property.rules}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
