import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Info } from 'lucide-react'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface SmartInsightCardProps {
  message: string
  type?: 'info' | 'warning' | 'success'
  className?: string
  index?: number
}

export function SmartInsightCard({
  message,
  type = 'info',
  className,
  index = 0,
}: SmartInsightCardProps) {
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

  return (
    <motion.div
      className={cn('relative', className)}
      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
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
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
