import { motion, AnimatePresence } from 'framer-motion'
import type { Task } from '@/hooks/use-tasks'
import { motionTokens, createSpring } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Calendar, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/contexts/settings-context'

interface TaskReminderToastProps {
  task: Task
  onDismiss: () => void
  onView?: () => void
  onComplete?: () => void
}

export function TaskReminderToast({ task, onDismiss, onView, onComplete }: TaskReminderToastProps) {
  const { settings } = useSettings()
  const spring = createSpring('soft')
  const hasDeadline = task.deadline !== null
  const deadlineDate = hasDeadline ? new Date(task.deadline) : null
  const isOverdue =
    hasDeadline && deadlineDate && deadlineDate < new Date() && task.status === 'pending'

  // Don't show toast if toast reminders are disabled
  if (!settings.toastReminders) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: motionTokens.opacity.hidden, y: -20, scale: 0.95 }}
        animate={{ opacity: motionTokens.opacity.visible, y: 0, scale: 1 }}
        exit={{ opacity: motionTokens.opacity.hidden, y: -20, scale: 0.95 }}
        transition={{
          type: 'spring',
          ...spring,
        }}
        className={cn(
          'fixed top-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg backdrop-blur-md',
          'bg-card border border-border',
          'flex flex-col gap-3 min-w-[300px] max-w-md'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{task.title}</p>
            {hasDeadline && (
              <div className="flex items-center gap-2 mt-1">
                <Calendar
                  className={cn('w-4 h-4', isOverdue ? 'text-red-500' : 'text-muted-foreground')}
                />
                <span
                  className={cn('text-xs', isOverdue ? 'text-red-500' : 'text-muted-foreground')}
                >
                  {deadlineDate?.toLocaleDateString()}
                  {isOverdue && ' (Overdue)'}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-auto p-1"
            aria-label="Dismiss reminder"
          >
            ×
          </Button>
        </div>
        <div className="flex gap-2">
          {onComplete && task.status === 'pending' && (
            <Button variant="default" size="sm" onClick={onComplete} className="flex-1">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete
            </Button>
          )}
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className={onComplete ? 'flex-1' : 'w-full'}
            >
              View Task
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
