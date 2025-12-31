import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NumberCounter } from '@/components/ui/number-counter'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { createSpring, motion as motionTokens } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface ProfitMarginCardProps {
  propertyName: string
  rentCollected: number
  expenses: number
  previousMargin?: number
  className?: string
  index?: number
}

export function ProfitMarginCard({
  propertyName,
  rentCollected,
  expenses,
  previousMargin,
  className,
  index = 0,
}: ProfitMarginCardProps) {
  const cardSpring = createSpring('card')
  const netProfit = rentCollected - expenses
  const marginPercentage = rentCollected > 0 ? (netProfit / rentCollected) * 100 : 0

  const getMarginColor = () => {
    if (marginPercentage >= 70) return 'text-green-600 dark:text-green-400'
    if (marginPercentage >= 50) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getMarginIndicator = () => {
    if (marginPercentage >= 70) return 'bg-green-500/20 border-green-500/30'
    if (marginPercentage >= 50) return 'bg-amber-500/20 border-amber-500/30'
    return 'bg-red-500/20 border-red-500/30'
  }

  const getTrend = () => {
    if (previousMargin === undefined) return null
    const diff = marginPercentage - previousMargin
    if (Math.abs(diff) < 1) return null
    return diff > 0 ? 'up' : 'down'
  }

  const trend = getTrend()

  return (
    <motion.div
      className={cn('relative', className)}
      initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{
        type: 'spring',
        ...cardSpring,
        delay: index * 0.1,
      }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">{propertyName}</CardTitle>
          <CardDescription>Profitability overview</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
            <p className={cn('text-2xl font-semibold', getMarginColor())}>
              <NumberCounter value={netProfit} format={v => `$${Math.round(v).toLocaleString()}`} />
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Margin</p>
            <div className="flex items-center gap-2">
              <div className={cn('px-3 py-1.5 rounded border', getMarginIndicator())}>
                <span className={cn('text-sm font-medium', getMarginColor())}>
                  {marginPercentage.toFixed(1)}%
                </span>
              </div>
              {trend && (
                <div className="flex items-center gap-1">
                  {trend === 'up' ? (
                    <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This property kept ~{Math.round(marginPercentage)}% of its rent
            </p>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rent Collected</span>
              <span className="text-foreground font-medium">${rentCollected.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Expenses</span>
              <span className="text-foreground font-medium">${expenses.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
