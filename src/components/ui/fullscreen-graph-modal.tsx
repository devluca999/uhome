import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, type LineChartData } from '@/components/ui/line-chart'
import { BarChart } from '@/components/ui/bar-chart'
import { X } from 'lucide-react'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { GraphViewType, TimeRangeType, CurveType } from '@/components/landlord/financial-graph-enhanced'

interface FullscreenGraphModalProps {
  isOpen: boolean
  onClose: () => void
  graphData: any[]
  filteredGraphData: any[]
  viewType: GraphViewType
  timeRange: TimeRangeType
  curveType: CurveType
  activeDatasets: {
    rentCollected: boolean
    outstandingRent: boolean
    expenses: boolean
    netCashFlow: boolean
  }
  onViewTypeChange: (type: GraphViewType) => void
  onTimeRangeChange: (range: TimeRangeType) => void
  onCurveTypeChange: (type: CurveType) => void
  onActiveDatasetsChange: (datasets: typeof activeDatasets) => void
  properties?: Array<{ id: string; name: string }>
  selectedPropertyId?: string
  onPropertyChange?: (propertyId: string | 'all') => void
}

/**
 * Fullscreen Graph Modal
 * 
 * Displays the financial graph in a fullscreen modal.
 * Retains all graph state (filters, toggles, styles).
 * Supports Escape key and close button.
 */
export function FullscreenGraphModal({
  isOpen,
  onClose,
  graphData,
  filteredGraphData,
  viewType,
  timeRange,
  curveType,
  activeDatasets,
  onViewTypeChange,
  onTimeRangeChange,
  onCurveTypeChange,
  onActiveDatasetsChange,
  properties = [],
  selectedPropertyId = 'all',
  onPropertyChange,
}: FullscreenGraphModalProps) {
  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Prepare line chart data
  const lineChartData: LineChartData[] = filteredGraphData.map((point: any) => ({
    month: point.month,
    income: point.rentCollected || point.income,
    expenses: point.expenses,
    net: point.netCashFlow || point.net,
  }))

  // Prepare bar chart data
  const barChartData = filteredGraphData.map((point: any) => ({
    month: point.month,
    amount: point.rentCollected || point.income || 0,
  }))

  const renderGraph = () => {
    if (viewType === 'line') {
      if (lineChartData.length === 0) {
        return (
          <div className="flex items-center justify-center h-[600px] text-muted-foreground">
            No data available
          </div>
        )
      }
      return (
        <LineChart
          data={lineChartData}
          showIncome={activeDatasets.rentCollected}
          showExpenses={activeDatasets.expenses}
          showNet={activeDatasets.netCashFlow}
          curveType={curveType}
        />
      )
    } else {
      if (barChartData.length === 0) {
        return (
          <div className="flex items-center justify-center h-[600px] text-muted-foreground">
            No data available
          </div>
        )
      }
      return <BarChart data={barChartData} />
    }
  }

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
          className="relative z-10 w-full max-w-7xl max-h-[90vh] overflow-hidden"
        >
          <Card className="glass-card h-full flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-border">
              <CardTitle className="text-2xl">Financial Overview</CardTitle>
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
            <CardContent className="flex-1 overflow-y-auto pt-6">
              <div className="space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap gap-2">
                  {/* View Type */}
                  <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
                    <Button
                      variant={viewType === 'line' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onViewTypeChange('line')}
                      className="h-8 px-3"
                    >
                      Line
                    </Button>
                    <Button
                      variant={viewType === 'bar' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onViewTypeChange('bar')}
                      className="h-8 px-3"
                    >
                      Bar
                    </Button>
                  </div>

                  {/* Time Range */}
                  <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
                    <Button
                      variant={timeRange === 'monthToDate' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onTimeRangeChange('monthToDate')}
                      className="h-8 px-3 text-xs"
                    >
                      Month to date
                    </Button>
                    <Button
                      variant={timeRange === 'yearToDate' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onTimeRangeChange('yearToDate')}
                      className="h-8 px-3 text-xs"
                    >
                      Year to date (Jan 1 – Today)
                    </Button>
                  </div>

                  {/* Property Selector */}
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

                {/* Dataset Toggles */}
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeDatasets.rentCollected}
                      onChange={e =>
                        onActiveDatasetsChange({ ...activeDatasets, rentCollected: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-muted-foreground">Rent collected</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeDatasets.outstandingRent}
                      onChange={e =>
                        onActiveDatasetsChange({ ...activeDatasets, outstandingRent: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-muted-foreground">Outstanding rent</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeDatasets.expenses}
                      onChange={e =>
                        onActiveDatasetsChange({ ...activeDatasets, expenses: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-muted-foreground">Expenses</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeDatasets.netCashFlow}
                      onChange={e =>
                        onActiveDatasetsChange({ ...activeDatasets, netCashFlow: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-muted-foreground">Net cash flow</span>
                  </label>
                  {viewType === 'line' && (
                    <div className="flex items-center gap-2 ml-2">
                      <Button
                        variant={curveType === 'smooth' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onCurveTypeChange('smooth')}
                        className="h-7 px-2 text-xs"
                      >
                        Smooth
                      </Button>
                      <Button
                        variant={curveType === 'sharp' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onCurveTypeChange('sharp')}
                        className="h-7 px-2 text-xs"
                      >
                        Sharp
                      </Button>
                    </div>
                  )}
                </div>

                {/* Graph */}
                <div className="mt-4">{renderGraph()}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

