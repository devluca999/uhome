import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { motionTokens, createSpring, durationToSeconds } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { useModalScrollLock } from '@/hooks/use-modal-scroll-lock'
import { cn } from '@/lib/utils'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  side?: 'left' | 'right' | 'top' | 'bottom'
  className?: string
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  side = 'right',
  className,
}: DrawerProps) {
  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()

  // Lock body scroll when drawer is open
  useModalScrollLock(isOpen)

  if (!isOpen) return null

  const sideClasses = {
    left: 'left-0',
    right: 'right-0',
    top: 'top-0 left-0 right-0 w-full',
    bottom: 'bottom-0 left-0 right-0 w-full',
  }

  const initialPosition = {
    left: { x: '-100%' },
    right: { x: '100%' },
    top: { y: '-100%' },
    bottom: { y: '100%' },
  }

  const animatePosition = {
    left: { x: 0 },
    right: { x: 0 },
    top: { y: 0 },
    bottom: { y: 0 },
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.fast),
            ease: motionTokens.easing.standard,
          }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Drawer */}
        <motion.div
          initial={initialPosition[side]}
          animate={animatePosition[side]}
          exit={initialPosition[side]}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  type: 'spring',
                  ...cardSpring,
                }
          }
          className={cn(
            'absolute z-10 w-full max-w-md',
            side === 'left' || side === 'right' 
              ? 'h-[90vh] max-h-[90vh] top-1/2 -translate-y-1/2' 
              : 'max-h-[90vh]',
            side === 'left' ? 'left-0' : side === 'right' ? 'right-0' : sideClasses[side],
            className
          )}
        >
          <Card className="glass-card h-full flex flex-col rounded-none border-l-2 border-r-0 border-t-0 border-b-0">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-border">
              <div className="flex-1">
                <CardTitle className="text-xl">{title}</CardTitle>
                {description && <CardDescription className="mt-1">{description}</CardDescription>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0 pt-6 pb-8 pr-4">
              {children}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
