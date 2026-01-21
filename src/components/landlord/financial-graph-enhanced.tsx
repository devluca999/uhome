import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, type LineChartData } from '@/components/ui/line-chart'
import { BarChart } from '@/components/ui/bar-chart'
import { ModalIndicator } from '@/components/ui/modal-indicator'
import { FullscreenGraphModal } from '@/components/ui/fullscreen-graph-modal'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { LineChart as LineChartIcon, BarChart3, FileDown, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportGraphToCSV, exportGraphToPNG, type GraphDataPoint } from '@/utils/export-graph'

export type GraphViewType = 'line' | 'bar'
export type TimeRangeType = 'monthToDate' | 'yearToDate'
export type CurveType = 'smooth' | 'sharp'

interface FinancialGraphEnhancedProps {
  // Data for different datasets
  rentCollectedData?: Array<{ month: string; amount: number }>
  outstandingRentData?: Array<{ month: string; amount: number }>
  expensesData?: Array<{ month: string; amount: number }>
  netCashFlowData?: Array<{ month: string; amount: number }>
  // Legacy support
  lineData?: LineChartData[]
  barData?: Array<{ month: string; amount: number }>
  properties?: Array<{ id: string; name: string }>
  selectedPropertyId?: string
  onPropertyChange?: (propertyId: string | 'all') => void
  className?: string
}

/**
 * Enhanced Financial Graph Component
 *
 * MVP Features:
 * - Time ranges: Month to date, Year to date (Jan 1 – Today)
 *   MVP-only: Calendar year YTD (Jan 1 to today), not fiscal year
 * - Dataset toggles: Rent collected, Outstanding rent, Expenses, Net cash flow
 * - Style controls: Line/Bar, Smooth/Sharp curves
 * - Export: PNG and CSV
 * - Fullscreen modal expansion
 */
export function FinancialGraphEnhanced({
  rentCollectedData = [],
  outstandingRentData = [],
  expensesData = [],
  netCashFlowData = [],
  lineData = [],
  barData = [],
  properties = [],
  selectedPropertyId = 'all',
  onPropertyChange,
  className,
}: FinancialGraphEnhancedProps) {
  const [viewType, setViewType] = useState<GraphViewType>('line')
  const [timeRange, setTimeRange] = useState<TimeRangeType>('monthToDate')
  const [curveType, setCurveType] = useState<CurveType>('smooth')
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [activeDatasets, setActiveDatasets] = useState({
    rentCollected: true,
    outstandingRent: true,
    expenses: true,
    netCashFlow: true,
  })
  const graphContainerRef = useRef<HTMLDivElement>(null)

  // Prepare combined data for graph
  const graphData = useMemo(() => {
    // MVP: Support both new format and legacy format
    if (lineData.length > 0) {
      // Legacy format - convert to new format
      return lineData.map(item => ({
        month: item.month,
        income: item.income,
        expenses: item.expenses,
        net: item.net,
        rentCollected: item.income,
        netCashFlow: item.net,
      }))
    }

    // New format - combine all datasets
    const months = new Set<string>()
    rentCollectedData.forEach(d => months.add(d.month))
    outstandingRentData.forEach(d => months.add(d.month))
    expensesData.forEach(d => months.add(d.month))
    netCashFlowData.forEach(d => months.add(d.month))

    return Array.from(months)
      .sort()
      .map(month => {
        const rentCollected = rentCollectedData.find(d => d.month === month)?.amount || 0
        const outstandingRent = outstandingRentData.find(d => d.month === month)?.amount || 0
        const expenses = expensesData.find(d => d.month === month)?.amount || 0
        const netCashFlow = netCashFlowData.find(d => d.month === month)?.amount || 0

        return {
          month,
          rentCollected,
          outstandingRent,
          expenses,
          netCashFlow,
          // Legacy support
          income: rentCollected,
          net: netCashFlow,
        }
      })
  }, [rentCollectedData, outstandingRentData, expensesData, netCashFlowData, lineData])

  // Filter data based on active datasets
  const filteredGraphData = useMemo(() => {
    return graphData.map(point => {
      const filtered: { month: string; rentCollected?: number; expenses?: number } = {
        month: point.month,
      }
      if (activeDatasets.rentCollected && point.rentCollected !== undefined) {
        filtered.rentCollected = point.rentCollected
      }
      if (activeDatasets.outstandingRent && point.outstandingRent !== undefined) {
        filtered.outstandingRent = point.outstandingRent
      }
      if (activeDatasets.expenses && point.expenses !== undefined) {
        filtered.expenses = point.expenses
      }
      if (activeDatasets.netCashFlow && point.netCashFlow !== undefined) {
        filtered.netCashFlow = point.netCashFlow
      }
      // Legacy support
      if (point.income !== undefined) filtered.income = point.income
      if (point.net !== undefined) filtered.net = point.net
      return filtered
    })
  }, [graphData, activeDatasets])

  // Prepare line chart data
  const lineChartData = useMemo(() => {
    return filteredGraphData.map(point => ({
      month: point.month,
      income: point.rentCollected || point.income,
      expenses: point.expenses,
      net: point.netCashFlow || point.net,
    }))
  }, [filteredGraphData])

  // Prepare bar chart data (use rent collected as primary)
  const barChartData = useMemo(() => {
    if (barData.length > 0) return barData
    return filteredGraphData.map(point => ({
      month: point.month,
      amount: point.rentCollected || point.income || 0,
    }))
  }, [filteredGraphData, barData])

  const handleExportPNG = async () => {
    try {
      const elementId = `financial-graph-${Date.now()}`
      if (graphContainerRef.current) {
        graphContainerRef.current.id = elementId
        await exportGraphToPNG(
          elementId,
          `financial-graph-${new Date().toISOString().split('T')[0]}.png`
        )
      }
    } catch (error) {
      console.error('Failed to export PNG:', error)
      alert('Failed to export graph as PNG. Please try CSV export instead.')
    }
  }

  const handleExportCSV = () => {
    try {
      exportGraphToCSV(
        graphData as GraphDataPoint[],
        activeDatasets,
        `financial-graph-${new Date().toISOString().split('T')[0]}.csv`
      )
    } catch (error) {
      console.error('Failed to export CSV:', error)
      alert('Failed to export graph data as CSV.')
    }
  }

  const renderGraph = () => {
    if (viewType === 'line') {
      if (lineChartData.length === 0) {
        return (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
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
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available
          </div>
        )
      }
      return <BarChart data={barChartData} />
    }
  }

  return (
    <>
      <Card className={cn('glass-card relative', className)}>
        <ModalIndicator onClick={() => setShowFullscreen(true)} />
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Financial Overview</CardTitle>
            <div className="flex flex-wrap gap-2">
              {/* Export Button */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportPNG}
                  className="h-8 px-3"
                  title="Export as PNG"
                >
                  <Image className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 px-3"
                  title="Export as CSV"
                >
                  <FileDown className="w-4 h-4" />
                </Button>
              </div>

              {/* View Type Selector */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
                <Button
                  variant={viewType === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('line')}
                  className="h-8 px-3"
                  aria-label="Line chart"
                >
                  <LineChartIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('bar')}
                  className="h-8 px-3"
                  aria-label="Bar chart"
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
                <Button
                  variant={timeRange === 'monthToDate' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange('monthToDate')}
                  className="h-8 px-3 text-xs"
                >
                  Month to date
                </Button>
                <Button
                  variant={timeRange === 'yearToDate' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange('yearToDate')}
                  className="h-8 px-3 text-xs"
                  title="Year to date (Jan 1 – Today)"
                >
                  YTD
                </Button>
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

          {/* Dataset Toggles */}
          <div className="flex flex-wrap gap-2 mt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activeDatasets.rentCollected}
                onChange={e =>
                  setActiveDatasets(prev => ({ ...prev, rentCollected: e.target.checked }))
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
                  setActiveDatasets(prev => ({ ...prev, outstandingRent: e.target.checked }))
                }
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-muted-foreground">Outstanding rent</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activeDatasets.expenses}
                onChange={e => setActiveDatasets(prev => ({ ...prev, expenses: e.target.checked }))}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-muted-foreground">Expenses</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activeDatasets.netCashFlow}
                onChange={e =>
                  setActiveDatasets(prev => ({ ...prev, netCashFlow: e.target.checked }))
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
                  onClick={() => setCurveType('smooth')}
                  className="h-7 px-2 text-xs"
                >
                  Smooth
                </Button>
                <Button
                  variant={curveType === 'sharp' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurveType('sharp')}
                  className="h-7 px-2 text-xs"
                >
                  Sharp
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div ref={graphContainerRef}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${viewType}-${timeRange}-${curveType}`}
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
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Modal */}
      <FullscreenGraphModal
        isOpen={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        graphData={graphData}
        filteredGraphData={filteredGraphData}
        viewType={viewType}
        timeRange={timeRange}
        curveType={curveType}
        activeDatasets={activeDatasets}
        onViewTypeChange={setViewType}
        onTimeRangeChange={setTimeRange}
        onCurveTypeChange={setCurveType}
        onActiveDatasetsChange={setActiveDatasets}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onPropertyChange={onPropertyChange}
      />
    </>
  )
}
