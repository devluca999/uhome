import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { motionTokens, createSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface ExpenseCategoryCard {
  category: string
  monthlyAverage: number
  trend: 'up' | 'down' | 'neutral'
  trendPercentage?: number
}

interface ExpensesStreamProps {
  categories: ExpenseCategoryCard[]
  onCategoryClick?: (category: string) => void
  className?: string
}

export function ExpensesStream({ categories, onCategoryClick, className }: ExpensesStreamProps) {
  const cardSpring = createSpring('card')

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-4 h-4" />
      case 'down':
        return <ArrowDown className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-red-600 dark:text-red-400'
      case 'down':
        return 'text-green-600 dark:text-green-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const formatCurrency = (value: number) => {
    return `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  return (
    <div className={cn('overflow-x-auto pb-4', className)}>
      <div className="flex gap-4 min-w-max">
        {categories.map((category, index) => (
          <motion.div
            key={category.category}
            initial={{ opacity: motionTokens.opacity.hidden, x: 20 }}
            animate={{ opacity: motionTokens.opacity.visible, x: 0 }}
            whileHover={{ y: -2 }}
            transition={{
              type: 'spring',
              ...cardSpring,
              delay: index * 0.05,
            }}
            className="min-w-[200px]"
          >
            <Card
              className="glass-card cursor-pointer"
              onClick={() => onCategoryClick?.(category.category)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground capitalize">
                      {category.category}
                    </span>
                    <div className={cn('flex items-center gap-1', getTrendColor(category.trend))}>
                      {getTrendIcon(category.trend)}
                      {category.trendPercentage !== undefined && (
                        <span className="text-xs">{Math.abs(category.trendPercentage)}%</span>
                      )}
                    </div>
                  </div>
                  <p className="text-2xl font-semibold text-foreground">
                    {formatCurrency(category.monthlyAverage)}
                  </p>
                  <p className="text-xs text-muted-foreground">Monthly average</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
