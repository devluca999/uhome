import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Calendar, Image as ImageIcon } from 'lucide-react'
import type { Task } from '@/hooks/use-tasks'
import { motionTokens, createSpring } from '@/lib/motion'
import { TaskChecklist } from './task-checklist'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  task: Task
  onToggleStatus?: (id: string) => void
  onUpdateChecklist?: (taskId: string, itemId: string, completed: boolean) => void
  onView?: (id: string) => void
  className?: string
}

export function TaskCard({
  task,
  onToggleStatus,
  onUpdateChecklist,
  onView,
  className,
}: TaskCardProps) {
  const cardSpring = createSpring('card')
  const isCompleted = task.status === 'completed'
  const hasDeadline = task.deadline !== null && task.deadline !== undefined
  const deadlineDate = hasDeadline && task.deadline ? new Date(task.deadline) : null
  const isOverdue = hasDeadline && deadlineDate && deadlineDate < new Date() && !isCompleted
  const hasImages = task.image_urls && task.image_urls.length > 0

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      exit={{ opacity: motionTokens.opacity.hidden, y: -8 }}
      transition={{
        duration: motionTokens.duration.normal,
        ease: motionTokens.easing.standard,
      }}
      className={className}
    >
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle
                className={cn('text-lg', isCompleted && 'line-through text-muted-foreground')}
              >
                {task.title}
              </CardTitle>
              {hasDeadline && (
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span
                    className={cn('text-sm', isOverdue ? 'text-red-500' : 'text-muted-foreground')}
                  >
                    {deadlineDate?.toLocaleDateString()}
                  </span>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      Overdue
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{
                type: 'spring',
                ...motionTokens.spring.soft,
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleStatus?.(task.id)}
                className="p-0 h-auto"
                aria-label={isCompleted ? 'Mark as pending' : 'Mark as completed'}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </Button>
            </motion.div>
          </div>
        </CardHeader>
        <CardContent>
          {task.checklist_items && task.checklist_items.length > 0 && (
            <div className="mb-4">
              <TaskChecklist
                items={task.checklist_items}
                onToggle={(itemId, completed) => onUpdateChecklist?.(task.id, itemId, completed)}
                disabled={isCompleted}
              />
            </div>
          )}
          {hasImages && (
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              <ImageIcon className="w-4 h-4" />
              <span>
                {task.image_urls.length} image{task.image_urls.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(task.id)} className="w-full">
              View Details
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
