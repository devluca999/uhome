import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface RentSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  metricType: 'collected' | 'outstanding' | 'expenses' | 'net'
  dateRange?: {
    start: Date
    end: Date
  }
  propertyId?: string
  properties?: Array<{ id: string; name: string }>
}

/**
 * Rent Summary Modal
 * 
 * Shows filtered details for the selected financial metric.
 * Respects current date range and property filters.
 */
export function RentSummaryModal({
  isOpen,
  onClose,
  metricType,
  dateRange,
  propertyId,
  properties = [],
}: RentSummaryModalProps) {
  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()

  if (!isOpen) return null

  const titles = {
    collected: 'Total Rent Collected',
    outstanding: 'Outstanding Balance',
    expenses: 'Total Expenses',
    net: 'Net Cash Flow',
  }

  const descriptions = {
    collected: 'Rent payments received in the selected period',
    outstanding: 'Unpaid rent amounts in the selected period',
    expenses: 'All expenses recorded in the selected period',
    net: 'Net cash flow (income minus expenses) in the selected period',
  }

  const dateRangeText = dateRange
    ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
    : 'All time'

  const propertyText = propertyId
    ? properties.find(p => p.id === propertyId)?.name || 'Selected property'
    : 'All properties'

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
          className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div className="flex-1">
                <CardTitle className="text-2xl">{titles[metricType]}</CardTitle>
                <CardDescription className="mt-2">{descriptions[metricType]}</CardDescription>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>Period: {dateRangeText}</p>
                  <p>Property: {propertyText}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* MVP: Placeholder for detailed breakdown */}
              <div className="text-center py-8 text-muted-foreground">
                <p>Detailed breakdown coming soon</p>
                <p className="text-xs mt-2">
                  This modal will show filtered transaction details for {titles[metricType].toLowerCase()}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

