import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { motionTokens, createSpring } from '@/lib/motion'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface Insight {
  id: string
  text: string
  type: 'info' | 'warning' | 'success'
  filterContext?: {
    propertyId?: string
    category?: string
    dateRange?: { start: string; end: string }
  }
}

interface SmartInsightsProps {
  insights: Insight[]
  className?: string
}

export function SmartInsights({ insights, className }: SmartInsightsProps) {
  const navigate = useNavigate()
  const cardSpring = createSpring('card')
  const [isDismissed, setIsDismissed] = useState(false)
  
  // Check if insights card was previously dismissed
  useEffect(() => {
    const dismissalKey = 'smart-insights-dismissed'
    const wasDismissed = localStorage.getItem(dismissalKey) === 'true'
    setIsDismissed(wasDismissed)
  }, [])
  
  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('smart-insights-dismissed', 'true')
  }

  const handleInsightClick = (insight: Insight) => {
    if (insight.filterContext) {
      // Navigate to finances page with filter context
      const params = new URLSearchParams()
      if (insight.filterContext.propertyId) {
        params.set('property', insight.filterContext.propertyId)
      }
      if (insight.filterContext.category) {
        params.set('category', insight.filterContext.category)
      }
      if (insight.filterContext.dateRange) {
        params.set('start', insight.filterContext.dateRange.start)
        params.set('end', insight.filterContext.dateRange.end)
      }
      navigate(`/landlord/finances?${params.toString()}`)
    }
  }

  const getTypeColor = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10'
      case 'success':
        return 'border-green-500/30 bg-green-500/10'
      default:
        return 'border-blue-500/30 bg-blue-500/10'
    }
  }

  if (insights.length === 0 || isDismissed) {
    return null
  }

  return (
    <Card className={cn('glass-card relative', className)}>
      <CardHeader className="pr-12">
        <CardTitle>Insights</CardTitle>
        <CardDescription>Financial observations and trends</CardDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 opacity-60 hover:opacity-100 transition-opacity"
          onClick={handleDismiss}
          aria-label="Dismiss insights"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: motionTokens.opacity.hidden, y: 10 }}
              animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
              transition={{
                type: 'spring',
                ...cardSpring,
                delay: index * 0.05,
              }}
              className={cn(
                'p-3 rounded-md border cursor-pointer transition-colors',
                getTypeColor(insight.type),
                insight.filterContext && 'hover:opacity-80'
              )}
              onClick={() => insight.filterContext && handleInsightClick(insight)}
            >
              <p className="text-sm text-foreground">{insight.text}</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
