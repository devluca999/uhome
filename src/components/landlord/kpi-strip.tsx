/**
 * KPI Strip Component
 *
 * V1 Canon Implementation - Displays all required v1 canon KPIs:
 * - Total Rent Collected
 * - Outstanding / Unpaid Rent
 * - Total Expenses
 * - Net Cash Flow
 * - Active Properties
 * - Occupancy Rate
 *
 * All KPIs are expandable with detailed breakdowns via RentSummaryModal.
 */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NumberCounter } from '@/components/ui/number-counter'
import { ModalIndicator } from '@/components/ui/modal-indicator'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimePeriod } from './finances-filter-bar'

interface KPICardData {
  label: string
  value: number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
}

interface KPIStripProps {
  totalCollected: number
  outstandingRent?: number
  totalExpenses: number
  netProfit: number
  projectedNet?: number
  activeProperties?: number
  occupancyRate?: number
  collectedChange?: string
  expensesChange?: string
  netChange?: string
  projectedChange?: string
  timePeriod?: TimePeriod
  selectedPropertyId?: string
  properties?: Array<{ id: string; name: string }>
  className?: string
  onCardClick?: (
    metric:
      | 'collected'
      | 'outstanding'
      | 'expenses'
      | 'net'
      | 'projected'
      | 'activeProperties'
      | 'occupancy'
  ) => void
}

export function KPIStrip({
  totalCollected,
  outstandingRent,
  totalExpenses,
  netProfit,
  projectedNet,
  activeProperties,
  occupancyRate,
  collectedChange,
  expensesChange,
  netChange,
  projectedChange,
  timePeriod,
  selectedPropertyId,
  properties = [],
  className,
  onCardClick,
}: KPIStripProps) {
  const cardSpring = createSpring('card')
  const [expandedCard, setExpandedCard] = useState<
    | 'collected'
    | 'outstanding'
    | 'expenses'
    | 'net'
    | 'projected'
    | 'activeProperties'
    | 'occupancy'
    | null
  >(null)

  // Build KPI cards array - v1 canon KPIs first, then additional useful metrics
  const kpiCards: KPICardData[] = [
    {
      label: 'Total Collected',
      value: totalCollected,
      subtext: collectedChange,
      trend: collectedChange?.includes('↑')
        ? 'up'
        : collectedChange?.includes('↓')
          ? 'down'
          : 'neutral',
    },
    {
      label: 'Outstanding Rent',
      value: outstandingRent ?? 0,
      subtext: undefined,
      trend: outstandingRent && outstandingRent > 0 ? 'down' : 'neutral',
    },
    {
      label: 'Total Expenses',
      value: totalExpenses,
      subtext: expensesChange,
      trend: expensesChange?.includes('↑')
        ? 'up'
        : expensesChange?.includes('↓')
          ? 'down'
          : 'neutral',
    },
    {
      label: 'Net Cash Flow',
      value: netProfit,
      subtext: netChange,
      trend: netChange?.includes('↑') ? 'up' : netChange?.includes('↓') ? 'down' : 'neutral',
    },
    {
      label: 'Active Properties',
      value: activeProperties ?? 0,
      subtext: undefined,
      trend: 'neutral',
    },
    {
      label: 'Occupancy Rate',
      value: occupancyRate ?? 0,
      subtext: undefined,
      trend:
        occupancyRate && occupancyRate >= 90
          ? 'up'
          : occupancyRate && occupancyRate < 50
            ? 'down'
            : 'neutral',
    },
    // Projected Net is useful but not in v1 canon - show if provided
    ...(projectedNet !== undefined
      ? [
          {
            label: 'Projected Net',
            value: projectedNet,
            subtext: projectedChange,
            trend: projectedChange?.includes('↑')
              ? 'up'
              : projectedChange?.includes('↓')
                ? 'down'
                : 'neutral',
          } as KPICardData,
        ]
      : []),
  ]

  const formatCurrency = (value: number) => {
    return `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatNumber = (value: number) => {
    return Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  const formatPercentage = (value: number) => {
    return `${Math.abs(value)}%`
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-3 h-3" />
      case 'down':
        return <ArrowDown className="w-3 h-3" />
      default:
        return <Minus className="w-3 h-3" />
    }
  }

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400'
      case 'down':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const getCardKey = (
    label: string
  ):
    | 'collected'
    | 'outstanding'
    | 'expenses'
    | 'net'
    | 'projected'
    | 'activeProperties'
    | 'occupancy' => {
    if (label === 'Total Collected') return 'collected'
    if (label === 'Outstanding Rent') return 'outstanding'
    if (label === 'Total Expenses') return 'expenses'
    if (label === 'Net Cash Flow') return 'net'
    if (label === 'Active Properties') return 'activeProperties'
    if (label === 'Occupancy Rate') return 'occupancy'
    return 'projected'
  }

  const getFormatFunction = (label: string) => {
    if (label === 'Occupancy Rate') return formatPercentage
    if (label === 'Active Properties') return formatNumber
    return formatCurrency
  }

  const handleCardClick = (label: string) => {
    const cardKey = getCardKey(label)
    if (onCardClick) {
      onCardClick(cardKey)
    }
    setExpandedCard(expandedCard === cardKey ? null : cardKey)
  }

  // Filter summary text
  const filterSummary = useMemo(() => {
    const parts: string[] = []
    if (timePeriod) {
      const timePeriodLabels: Record<TimePeriod, string> = {
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        yearly: 'Yearly',
        monthToDate: 'Month to Date',
        yearToDate: 'Year to Date',
      }
      parts.push(timePeriodLabels[timePeriod] || timePeriod)
    }
    if (selectedPropertyId && properties.length > 0) {
      const property = properties.find(p => p.id === selectedPropertyId)
      if (property) {
        parts.push(property.name)
      }
    }
    return parts.length > 0 ? parts.join(' • ') : undefined
  }, [timePeriod, selectedPropertyId, properties])

  return (
    <div className={cn('bg-background border-b border-border', className)}>
      <div className="container mx-auto px-4 py-4">
        {/* Filter Summary */}
        {filterSummary && (
          <div className="mb-3 text-xs text-muted-foreground">Filters: {filterSummary}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kpiCards.map((card, index) => {
            const cardKey = getCardKey(card.label)
            const isClickable = !!onCardClick
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
                animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                whileHover={isClickable ? { y: -2 } : {}}
                transition={{
                  type: 'spring',
                  ...cardSpring,
                  delay: index * 0.05,
                }}
                className={isClickable ? 'cursor-pointer' : ''}
                onClick={() => isClickable && handleCardClick(card.label)}
              >
                <Card
                  className={cn('glass-card relative', isClickable && 'hover:border-primary/50')}
                >
                  {isClickable && <ModalIndicator onClick={() => handleCardClick(card.label)} />}
                  <CardHeader className={cn('pb-2', isClickable && 'pr-12')}>
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      {card.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-2xl font-semibold text-foreground">
                        <NumberCounter value={card.value} format={getFormatFunction(card.label)} />
                      </p>
                      {card.subtext && (
                        <div
                          className={cn(
                            'flex items-center gap-1 text-xs',
                            getTrendColor(card.trend)
                          )}
                        >
                          {getTrendIcon(card.trend)}
                          <span>{card.subtext}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
