import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { createSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useSettings } from '@/contexts/settings-context'

interface ToastNotificationProps {
  message: string
  onDismiss?: () => void
  duration?: number
}

export function ToastNotification({ message, onDismiss, duration = 3000 }: ToastNotificationProps) {
  const { settings } = useSettings()
  const buttonSpring = createSpring('button')

  useEffect(() => {
    if (duration > 0 && onDismiss) {
      const timer = setTimeout(onDismiss, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onDismiss])

  // Don't show toast if toast reminders are disabled
  if (!settings.toastReminders) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        type: 'spring',
        ...buttonSpring,
      }}
      className={cn(
        'fixed top-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg backdrop-blur-md',
        'bg-card border border-border',
        'flex items-center gap-3 min-w-[300px] max-w-md'
      )}
    >
      <p className="flex-1 text-sm text-foreground">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}
