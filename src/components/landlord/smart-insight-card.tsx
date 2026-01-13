import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Info, X } from 'lucide-react'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SmartInsightCardProps {
  message: string
  type?: 'info' | 'warning' | 'success'
  className?: string
  index?: number
  onDismiss?: () => void
}

export function SmartInsightCard({
  message,
  type = 'info',
  className,
  index = 0,
  onDismiss,
}: SmartInsightCardProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    if (onDismiss) {
      onDismiss()
    }
    // Persist dismissal state to localStorage for this session
    const dismissalKey = `insight-dismissed-${message.substring(0, 50)}`
    localStorage.setItem(dismissalKey, 'true')
  }

  // Check if this insight was previously dismissed
  const dismissalKey = `insight-dismissed-${message.substring(0, 50)}`
  if (isDismissed || localStorage.getItem(dismissalKey) === 'true') {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        className={cn('relative', className)}
        initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
        animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
        exit={{ opacity: motionTokens.opacity.hidden, x: -100, height: 0, marginBottom: 0 }}
        transition={{
          duration: durationToSeconds(motionTokens.duration.base),
          delay: index * 0.1,
          ease: motionTokens.ease.standard,
        }}
      >
        <Card className={cn('glass-card border', getTypeStyles())}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium flex-1">{message}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 hover:bg-transparent opacity-60 hover:opacity-100 transition-opacity"
                onClick={handleDismiss}
                aria-label="Dismiss insight"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
