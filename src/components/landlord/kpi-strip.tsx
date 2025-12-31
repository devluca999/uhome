import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NumberCounter } from '@/components/ui/number-counter'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardData {
  label: string
  value: number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
}

interface KPIStripProps {
  totalCollected: number
  totalExpenses: number
  netProfit: number
  projectedNet: number
  collectedChange?: string
  expensesChange?: string
  netChange?: string
  projectedChange?: string
  className?: string
}

export function KPIStrip({
  totalCollected,
  totalExpenses,
  netProfit,
  projectedNet,
  collectedChange,
  expensesChange,
  netChange,
  projectedChange,
  className,
}: KPIStripProps) {
  const cardSpring = createSpring('card')

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
      label: 'Net Profit',
      value: netProfit,
      subtext: netChange,
      trend: netChange?.includes('↑') ? 'up' : netChange?.includes('↓') ? 'down' : 'neutral',
    },
    {
      label: 'Projected Net',
      value: projectedNet,
      subtext: projectedChange,
      trend: projectedChange?.includes('↑')
        ? 'up'
        : projectedChange?.includes('↓')
          ? 'down'
          : 'neutral',
    },
  ]

  const formatCurrency = (value: number) => {
    return `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
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

  return (
    <div
      className={cn(
        'sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border',
        className
      )}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
              animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
              whileHover={{ y: -2 }}
              transition={{
                type: 'spring',
                ...cardSpring,
                delay: index * 0.05,
              }}
            >
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-2xl font-semibold text-foreground">
                      <NumberCounter value={card.value} format={formatCurrency} />
                    </p>
                    {card.subtext && (
                      <div
                        className={cn('flex items-center gap-1 text-xs', getTrendColor(card.trend))}
                      >
                        {getTrendIcon(card.trend)}
                        <span>{card.subtext}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
