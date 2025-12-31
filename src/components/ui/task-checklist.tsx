import { motion } from 'framer-motion'
import { CheckCircle2, Circle } from 'lucide-react'
import { motionTokens, createSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

interface TaskChecklistProps {
  items: ChecklistItem[]
  onToggle: (itemId: string, completed: boolean) => void
  disabled?: boolean
}

export function TaskChecklist({ items, onToggle, disabled = false }: TaskChecklistProps) {
  const spring = createSpring('soft')

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: motionTokens.opacity.hidden, x: -8 }}
          animate={{ opacity: motionTokens.opacity.visible, x: 0 }}
          transition={{
            duration: motionTokens.duration.fast,
            delay: index * 0.05,
            ease: motionTokens.easing.standard,
          }}
          className="flex items-center gap-3"
        >
          <motion.button
            type="button"
            onClick={() => !disabled && onToggle(item.id, !item.completed)}
            disabled={disabled}
            whileHover={disabled ? {} : { scale: 1.1 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            transition={{
              type: 'spring',
              ...spring,
            }}
            className="p-0 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground" />
            )}
          </motion.button>
          <span
            className={cn('text-sm flex-1', item.completed && 'line-through text-muted-foreground')}
          >
            {item.text}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
