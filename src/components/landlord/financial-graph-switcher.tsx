import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, type LineChartData } from '@/components/ui/line-chart'
import { BarChart } from '@/components/ui/bar-chart'
import { DonutChart } from '@/components/ui/donut-chart'
import { PieChart } from '@/components/ui/pie-chart'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import {
  LineChart as LineChartIcon,
  BarChart3,
  PieChart as PieChartIcon,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type GraphViewType = 'line' | 'donut' | 'pie' | 'bar'
export type TimeRange = 'month' | 'quarter' | 'year'
export type PropertyScope = 'all' | string // 'all' or property ID

interface FinancialGraphSwitcherProps {
  lineData?: LineChartData[]
  barData?: Array<{ month: string; amount: number }>
  donutData?: Array<{ name: string; value: number; color: string }>
  pieData?: Array<{ name: string; value: number; color: string }>
  properties?: Array<{ id: string; name: string }>
  selectedPropertyId?: string
  timeRange?: TimeRange
  onPropertyChange?: (propertyId: string | 'all') => void
  onTimeRangeChange?: (timeRange: TimeRange) => void
  className?: string
}

export function FinancialGraphSwitcher({
  lineData = [],
  barData = [],
  donutData = [],
  pieData = [],
  properties = [],
  selectedPropertyId = 'all',
  timeRange: externalTimeRange,
  onPropertyChange,
  onTimeRangeChange,
  className,
}: FinancialGraphSwitcherProps) {
  const [viewType, setViewType] = useState<GraphViewType>('line')
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRange>('month')

  // Use external timeRange if provided, otherwise use internal state
  const timeRange = externalTimeRange ?? internalTimeRange

  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    if (onTimeRangeChange) {
      onTimeRangeChange(newTimeRange)
    } else {
      setInternalTimeRange(newTimeRange)
    }
  }

  const viewOptions: Array<{ value: GraphViewType; label: string; icon: React.ReactNode }> = [
    { value: 'line', label: 'Line', icon: <LineChartIcon className="w-4 h-4" /> },
    { value: 'donut', label: 'Donut', icon: <Circle className="w-4 h-4" /> },
    { value: 'pie', label: 'Pie', icon: <PieChartIcon className="w-4 h-4" /> },
    { value: 'bar', label: 'Bar', icon: <BarChart3 className="w-4 h-4" /> },
  ]

  const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
  ]

  const renderGraph = () => {
    switch (viewType) {
      case 'line':
        if (lineData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available
            </div>
          )
        }
        return <LineChart data={lineData} />
      case 'bar':
        if (barData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available
            </div>
          )
        }
        return <BarChart data={barData} />
      case 'donut':
        if (donutData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available
            </div>
          )
        }
        return <DonutChart data={donutData} />
      case 'pie':
        if (pieData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available
            </div>
          )
        }
        return <PieChart data={pieData} />
      default:
        return null
    }
  }

  return (
    <Card className={cn('glass-card', className)}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Financial Overview</CardTitle>
          <div className="flex flex-wrap gap-2">
            {/* View Type Selector */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
              {viewOptions.map(option => (
                <Button
                  key={option.value}
                  variant={viewType === option.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType(option.value)}
                  className="h-8 px-3"
                  aria-label={`Switch to ${option.label} view`}
                >
                  {option.icon}
                  <span className="ml-1 hidden sm:inline">{option.label}</span>
                </Button>
              ))}
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
              {timeRangeOptions.map(option => (
                <Button
                  key={option.value}
                  variant={timeRange === option.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTimeRangeChange(option.value)}
                  className="h-8 px-3"
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {/* Property Scope Selector */}
            {properties.length > 0 && (
              <select
                value={selectedPropertyId}
                onChange={e => onPropertyChange?.(e.target.value)}
                className="flex h-8 rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all" className="text-foreground">
                  All Properties
                </option>
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id} className="text-foreground">
                    {prop.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewType}-${timeRange}`}
            initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            exit={{ opacity: motionTokens.opacity.hidden, y: -4 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              ease: motionTokens.easing.standard,
            }}
          >
            {renderGraph()}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
