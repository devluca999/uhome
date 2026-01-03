import * as React from 'react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { createSpring, useReducedMotion } from '@/lib/motion'
import { ReflectiveGradient } from './reflective-gradient'
import { GrainOverlay } from './grain-overlay'
import { MatteLayer } from './matte-layer'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const cardSpring = createSpring('card')
    const prefersReducedMotion = useReducedMotion()
    const { onDrag, onDragStart, onDragEnd, ...motionProps } = props

    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-xl border-2 bg-card text-card-foreground relative overflow-hidden',
          'will-change-transform will-change-opacity',
          'shadow-card hover:shadow-hover',
          'transition-shadow duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          'max-h-[600px]', // Default max height constraint
          className
        )}
        whileHover={
          prefersReducedMotion
            ? {}
            : {
                y: -5,
                scale: 1.01,
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
        layout={false}
        {...(motionProps as any)}
      >
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <ReflectiveGradient />
        <div className="relative z-10">{props.children}</div>
      </motion.div>
    )
  }
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
