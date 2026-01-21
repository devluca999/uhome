import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { NumberCounter } from './number-counter'
import { ReflectiveGradient } from './reflective-gradient'
import { GrainOverlay } from './grain-overlay'
import { MatteLayer } from './matte-layer'
import { createSpring, motion as motionTokens, useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface PortfolioCardProps {
  title: string
  value: number
  description?: string
  format?: (value: number) => string
  index?: number
  className?: string
  'data-testid'?: string
}

export const PortfolioCard = memo(function PortfolioCard({
  title,
  value,
  description,
  format = v => Math.round(v).toString(),
  index = 0,
  className,
  'data-testid': dataTestId,
}: PortfolioCardProps) {
  const cardSpring = useMemo(() => createSpring('card'), [])
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className={cn('relative will-change-transform-opacity', className)}
      data-testid={dataTestId}
      initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      whileHover={
        prefersReducedMotion
          ? {}
          : {
              y: -4,
              scale: 1.01,
            }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              type: 'spring',
              ...cardSpring,
              delay: index * 0.06, // Reduced from 0.1 to 0.06 (60ms)
            }
      }
      layout={false}
    >
      <Card className="glass-card relative overflow-hidden">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <ReflectiveGradient />
        <CardHeader className="[.relative_&]:pr-12">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <p
            className="text-3xl font-semibold text-foreground"
            data-testid={dataTestId ? `${dataTestId}-value` : undefined}
          >
            <NumberCounter value={value} format={format} />
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
})
