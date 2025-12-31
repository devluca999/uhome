import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { cn } from '@/lib/utils'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: 2 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
    >
      <Card className={cn('glass-card border-dashed relative overflow-hidden', className)}>
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <CardContent className="py-12 text-center relative z-10">
          {icon && (
            <motion.div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-muted-foreground"
              style={{ opacity: motionTokens.opacity.subtle }}
            >
              {icon}
            </motion.div>
          )}
          <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">{description}</p>
          )}
          {action && (
            <Button onClick={action.onClick} variant="default">
              {action.label}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
