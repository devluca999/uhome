import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ModalIndicator } from '@/components/ui/modal-indicator'
import { RentSummaryModal } from '@/components/landlord/rent-summary-modal'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { DollarSign, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react'

interface RentSummaryCardsProps {
  totalCollected: number
  outstanding: number
  expenses: number
  netCashFlow: number
  dateRange?: {
    start: Date
    end: Date
  }
  propertyId?: string
  properties?: Array<{ id: string; name: string }>
  className?: string
}

/**
 * Rent Summary Cards Component
 * 
 * Displays four key financial metrics:
 * - Total rent collected
 * - Outstanding balance
 * - Total expenses
 * - Net cash flow
 * 
 * Each card is clickable and opens a modal with filtered details.
 * Uses the global modal indicator pattern.
 */
export function RentSummaryCards({
  totalCollected,
  outstanding,
  expenses,
  netCashFlow,
  dateRange,
  propertyId,
  properties = [],
  className,
}: RentSummaryCardsProps) {
  const [openModal, setOpenModal] = useState<'collected' | 'outstanding' | 'expenses' | 'net' | null>(
    null
  )
  const cardSpring = createSpring('card')

  const cards = [
    {
      id: 'collected' as const,
      title: 'Total Collected',
      value: totalCollected,
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      id: 'outstanding' as const,
      title: 'Outstanding',
      value: outstanding,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      id: 'expenses' as const,
      title: 'Expenses',
      value: expenses,
      icon: TrendingDown,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      id: 'net' as const,
      title: 'Net Cash Flow',
      value: netCashFlow,
      icon: TrendingUp,
      color: netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: netCashFlow >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
  ]

  return (
    <>
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8', className)}>
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
              animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
              transition={{
                duration: durationToSeconds(motionTokens.duration.base),
                ease: motionTokens.ease.standard,
                delay: index * 0.05,
              }}
            >
              <Card
                className="glass-card relative cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setOpenModal(card.id)}
              >
                <ModalIndicator onClick={() => setOpenModal(card.id)} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <div className={cn('p-2 rounded-md', card.bgColor)}>
                      <Icon className={cn('w-4 h-4', card.color)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={cn('text-2xl font-semibold', card.color)}>
                    ${Math.abs(card.value).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Modals */}
      {openModal && (
        <RentSummaryModal
          isOpen={openModal !== null}
          onClose={() => setOpenModal(null)}
          metricType={openModal}
          dateRange={dateRange}
          propertyId={propertyId}
          properties={properties}
        />
      )}
    </>
  )
}

