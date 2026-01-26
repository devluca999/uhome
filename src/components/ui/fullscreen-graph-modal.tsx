import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, type LineChartData } from '@/components/ui/line-chart'
import { BarChart } from '@/components/ui/bar-chart'
import { AreaChart } from '@/components/ui/area-chart'
import { PieChart } from '@/components/ui/pie-chart'
import { X, ChevronDown } from 'lucide-react'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { useModalScrollLock } from '@/hooks/use-modal-scroll-lock'
import { cn } from '@/lib/utils'
import type { GraphViewType } from '@/components/landlord/financial-graph-enhanced'
import type { CurveType } from '@/components/landlord/financial-insights-module'

export type TimeRange = 'monthToDate' | 'yearToDate'

interface FullscreenGraphModalProps {
  isOpen: boolean
  onClose: () => void
  graphData: any[]
  filteredGraphData: any[]
  viewType: GraphViewType
  timeRange: TimeRange
  curveType: CurveType
  activeDatasets: {
    rentCollected: boolean
    outstandingRent: boolean
    expenses: boolean
    netCashFlow: boolean
  }
  onViewTypeChange: (type: GraphViewType) => void
  onTimeRangeChange: (range: TimeRange) => void
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
  const [showGraphTypeDropdown, setShowGraphTypeDropdown] = useState(false)

  // Lock body scroll when full-screen is open
  useModalScrollLock(isOpen)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showGraphTypeDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.graph-type-dropdown')) {
        setShowGraphTypeDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showGraphTypeDropdown])

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

  // Prepare line chart data (always compute, not conditional)
  const lineChartData: LineChartData[] = useMemo(() => {
    if (!isOpen) return []
    return filteredGraphData.map((point: any) => ({
      month: point.month,
      income: point.rentCollected || point.income,
      expenses: point.expenses,
      net: point.netCashFlow || point.net,
    }))
  }, [isOpen, filteredGraphData])

  // Prepare bar chart data (always compute, not conditional)
  const barChartData = useMemo(() => {
    if (!isOpen) return []
    return filteredGraphData.map((point: any) => ({
      month: point.month,
      amount: point.rentCollected || point.income || 0,
    }))
  }, [isOpen, filteredGraphData])

  // Prepare pie chart data (aggregate by category)
  const pieChartData = useMemo(() => {
    if (!isOpen) return []
    const totals = {
      rentCollected: filteredGraphData.reduce((sum, p) => sum + (p.rentCollected || 0), 0),
      expenses: filteredGraphData.reduce((sum, p) => sum + (p.expenses || 0), 0),
      netCashFlow: filteredGraphData.reduce((sum, p) => sum + (p.netCashFlow || 0), 0),
    }
    return [
      { name: 'Rent Collected', value: totals.rentCollected, color: '#84A98C' },
      { name: 'Expenses', value: totals.expenses, color: '#ef4444' },
      { name: 'Net Cash Flow', value: totals.netCashFlow, color: '#6b7280' },
    ].filter(item => item.value > 0)
  }, [isOpen, filteredGraphData])

  const renderGraph = () => {
    switch (viewType) {
      case 'line':
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
      case 'bar':
        if (barChartData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              No data available
            </div>
          )
        }
        return <BarChart data={barChartData} />
      case 'area':
        if (lineChartData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              No data available
            </div>
          )
        }
        return (
          <AreaChart
            data={lineChartData}
            showIncome={activeDatasets.rentCollected}
            showExpenses={activeDatasets.expenses}
            showNet={activeDatasets.netCashFlow}
            curveType={curveType}
          />
        )
      case 'pie':
        if (pieChartData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              No data available
            </div>
          )
        }
        return <PieChart data={pieChartData} />
      default:
        return null
    }
  }

  // Use portal to render outside normal DOM hierarchy
  if (typeof document === 'undefined') return null

  // Always render portal to maintain hook order, conditionally show content
  if (!isOpen) {
    return null
  }

  // Render full-screen modal via portal
  const modalContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key="fullscreen-graph"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.fast),
          ease: motionTokens.easing.standard,
        }}
        className="fixed inset-0 z-[9999] bg-background"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'auto',
          touchAction: 'auto',
          isolation: 'isolate', // Create new stacking context
          zIndex: 9999,
          backgroundColor: 'var(--background)', // Ensure background color is set
        }}
        onClick={e => {
          // Prevent clicks from bubbling to background
          e.stopPropagation()
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.fast),
            ease: motionTokens.easing.standard,
          }}
          className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-[10000]"
        >
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <CardTitle className="text-2xl">Financial Analytics</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close full-screen view"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Content - full viewport */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.fast),
            ease: motionTokens.easing.standard,
          }}
          className="h-[calc(100vh-73px)] overflow-y-auto overflow-x-hidden"
          style={{
            maxHeight: 'calc(100vh - 73px)',
            pointerEvents: 'auto',
            touchAction: 'pan-y',
          }}
          onClick={e => {
            // Allow clicks within content area
            e.stopPropagation()
          }}
        >
          <div className="container mx-auto px-4 py-6">
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Graph Type - Pill + Dropdown */}
                <div className="flex items-center gap-2 graph-type-dropdown">
                  <span className="text-sm font-medium text-muted-foreground">Graph Type:</span>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        setShowGraphTypeDropdown(!showGraphTypeDropdown)
                      }}
                      className="h-8 px-3 flex items-center gap-2"
                    >
                      <span className="capitalize">{viewType}</span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 transition-transform',
                          showGraphTypeDropdown && 'rotate-180'
                        )}
                      />
                    </Button>
                    {showGraphTypeDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 min-w-[120px]">
                        {(['line', 'bar', 'area', 'pie'] as const).map(type => (
                          <button
                            key={type}
                            onClick={e => {
                              e.stopPropagation()
                              onViewTypeChange(type)
                              setShowGraphTypeDropdown(false)
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors capitalize',
                              viewType === type && 'bg-muted font-medium'
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                      onActiveDatasetsChange({
                        ...activeDatasets,
                        outstandingRent: e.target.checked,
                      })
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
              <div className="mt-4" style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
                {renderGraph()}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}
