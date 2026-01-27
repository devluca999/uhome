import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createSpring } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  onClick?: () => void
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  'data-testid'?: string
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  onClick,
  className,
  variant = 'default',
  'data-testid': dataTestId,
}: MetricCardProps) {
  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()

  const variantClasses = {
    default: 'border-border',
    success: 'border-green-500/50 bg-green-500/10',
    warning: 'border-yellow-500/50 bg-yellow-500/10',
    danger: 'border-red-500/50 bg-red-500/10',
  }

  const Component = onClick ? motion.button : motion.div

  return (
    <Component
      onClick={onClick}
      className={cn('w-full text-left', onClick && 'cursor-pointer')}
      data-testid={dataTestId}
      whileHover={
        prefersReducedMotion || !onClick
          ? {}
          : {
              y: -2,
              scale: 1.01,
            }
      }
      whileTap={
        prefersReducedMotion || !onClick
          ? {}
          : {
              scale: 0.98,
            }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              type: 'spring',
              ...cardSpring,
            }
      }
    >
      <Card className={cn('glass-card', variantClasses[variant], className)}>
        <CardHeader className={cn('pb-3', onClick && 'pr-12')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            {icon && <div className="text-muted-foreground">{icon}</div>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-foreground mb-1">{value}</div>
          {description && <CardDescription className="text-xs mt-1">{description}</CardDescription>}
        </CardContent>
      </Card>
    </Component>
  )
}
