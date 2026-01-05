import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
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
          className={cn('relative z-10 w-full max-w-2xl max-h-[90vh] overflow-visible', className)}
        >
          <Card className="glass-card h-full flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 flex-shrink-0">
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
            <CardContent className="space-y-6 overflow-y-auto flex-1 min-h-0">
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
                            ${section.value.toLocaleString()}
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
                              <span>${item.value.toLocaleString()}</span>
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

              {/* CTA */}
              {cta && (
                <div className="pt-4 border-t border-border">
                  <Button onClick={cta.action} className="w-full">
                    {cta.label}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
