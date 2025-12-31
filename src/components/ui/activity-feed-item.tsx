import { memo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from './card'
import { GrainOverlay } from './grain-overlay'
import { MatteLayer } from './matte-layer'
import { createSpring, motion as motionTokens, useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface ActivityFeedItemProps {
  title: string
  description?: string
  timestamp: string
  icon?: React.ReactNode
  className?: string
  index?: number
  onClick?: () => void
}

export const ActivityFeedItem = memo(function ActivityFeedItem({
  title,
  description,
  timestamp,
  icon,
  className,
  index = 0,
  onClick,
}: ActivityFeedItemProps) {
  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className={cn('relative will-change-transform-opacity', className)}
      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      whileHover={
        prefersReducedMotion
          ? {}
          : {
              y: -2,
            }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              type: 'spring',
              ...cardSpring,
              delay: index * 0.05,
            }
      }
      layout={false}
    >
      <Card
        className={cn('glass-card relative overflow-hidden', onClick && 'cursor-pointer')}
        onClick={onClick}
      >
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{title}</p>
              {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
              <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
})
