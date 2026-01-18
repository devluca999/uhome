import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { ReflectiveGradient } from '@/components/ui/reflective-gradient'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { motionTokens, createSpring, durationToSeconds } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { useModalScrollLock } from '@/hooks/use-modal-scroll-lock'
import { cn } from '@/lib/utils'

export interface BreakdownSection {
  label: string
  value: number
  color?: string
  percentage?: number
  breakdown?: Array<{ label: string; value: number }>
  isCurrency?: boolean // New: whether to display value as currency
}

interface BreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  sections: BreakdownSection[]
  breakdownComponent?: ReactNode
  cta?: {
    label: string
    action: () => void
  }
  className?: string
  isCurrency?: boolean // New: default currency display for all sections
}

export function BreakdownModal({
  isOpen,
  onClose,
  title,
  description,
  sections,
  breakdownComponent,
  cta,
  className,
  isCurrency = true, // Default to showing currency
}: BreakdownModalProps) {
  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()

  // Lock body scroll when modal is open
  useModalScrollLock(isOpen)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.fast),
            ease: motionTokens.easing.standard,
          }}
          className="absolute inset-0 bg-background/90 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  type: 'spring',
                  ...cardSpring,
                }
          }
          className={cn('relative z-10 w-full max-w-2xl', className)}
          style={{ height: '90vh', maxHeight: '90vh' }}
        >
          <div className="h-full flex flex-col overflow-hidden rounded-xl border-2 bg-card/95 backdrop-blur-md text-card-foreground shadow-card relative" style={{ backgroundColor: 'hsl(var(--card) / 0.95)' }}>
            {/* Card styling elements */}
            <div className="absolute inset-0 pointer-events-none">
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <ReflectiveGradient />
            </div>
            <div className="relative z-10 h-full flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 flex-shrink-0 border-b border-border">
              <div className="flex-1 pr-2">
                <CardTitle className="text-2xl">{title}</CardTitle>
                {description && <CardDescription className="mt-2">{description}</CardDescription>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 flex-shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 overflow-y-auto flex-1 min-h-0 pb-12 pr-4">
              {/* Sections */}
              <div className="space-y-4">
                {sections.map((section, index) => {
                  const colorClasses = {
                    green: 'border-green-500/50 bg-green-500/10',
                    blue: 'border-blue-500/50 bg-blue-500/10',
                    red: 'border-red-500/50 bg-red-500/10',
                    yellow: 'border-yellow-500/50 bg-yellow-500/10',
                  }
                  const sectionColorClass =
                    section.color && colorClasses[section.color as keyof typeof colorClasses]
                      ? colorClasses[section.color as keyof typeof colorClasses]
                      : 'border-border'

                  return (
                    <div key={index} className={cn('rounded-lg border-2 p-4', sectionColorClass)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{section.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-foreground">
                            {(section.isCurrency ?? isCurrency) ? '$' : ''}
                            {section.value.toLocaleString()}
                          </span>
                          {section.percentage !== undefined && (
                            <span className="text-sm text-muted-foreground">
                              ({section.percentage.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </div>
                      {section.breakdown && section.breakdown.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {section.breakdown.map((item, itemIndex) => (
                            <div
                              key={itemIndex}
                              className="flex items-center justify-between text-sm text-muted-foreground"
                            >
                              <span>{item.label}</span>
                              <span>
                                {(section.isCurrency ?? isCurrency) ? '$' : ''}
                                {item.value.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Breakdown Component */}
              {breakdownComponent && (
                <div className="pt-4 border-t border-border">{breakdownComponent}</div>
              )}
            </CardContent>
            {/* CTA Footer - Sticky outside scrollable content */}
            {cta && (
              <div className="border-t border-border p-4 flex-shrink-0 bg-card">
                <Button onClick={cta.action} className="w-full">
                  {cta.label}
                </Button>
              </div>
            )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
