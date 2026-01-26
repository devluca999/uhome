import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, type LineChartData } from '@/components/ui/line-chart'
import { BarChart } from '@/components/ui/bar-chart'
import { AreaChart } from '@/components/ui/area-chart'
import { PieChart } from '@/components/ui/pie-chart'
import { ModalIndicator } from '@/components/ui/modal-indicator'
import { FullscreenGraphModal } from '@/components/ui/fullscreen-graph-modal'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { LineChart as LineChartIcon, FileDown, Image, Calendar, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportGraphToCSV, exportGraphToPNG } from '@/utils/export-graph'
import type { RentRecordWithRelations } from '@/hooks/use-landlord-rent-records'
import type { Database } from '@/types/database'
export type TimeRange = 'monthToDate' | 'yearToDate'
export type DateGranularity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

type Expense = Database['public']['Tables']['expenses']['Row']
type MaintenanceRequest = {
  id: string
  property_id: string
  created_at: string
  status: 'pending' | 'in_progress' | 'completed'
  description: string
  property?: { name: string }
}

import type { GraphViewType as EnhancedGraphViewType } from './financial-graph-enhanced'
// Internal type for this component (includes area and pie)
export type GraphViewType = EnhancedGraphViewType | 'area' | 'pie'
export type CurveType = 'smooth' | 'sharp'
export type InsightsViewMode = 'chart' | 'timeline'

interface FinancialInsightsModuleProps {
  // Chart data
  rentCollectedData?: Array<{ month: string; amount: number }>
  outstandingRentData?: Array<{ month: string; amount: number }>
  expensesData?: Array<{ month: string; amount: number }>
  netCashFlowData?: Array<{ month: string; amount: number }>
  // Legacy support
  lineData?: LineChartData[]
  barData?: Array<{ month: string; amount: number }>
  // Timeline data
  rentRecords?: RentRecordWithRelations[]
  expenses?: Expense[]
  workOrders?: MaintenanceRequest[]
  // Page-wide filters (authoritative scope)
  dateGranularity?: DateGranularity
  timeRange?: TimeRange
  selectedPropertyId?: string
  properties?: Array<{ id: string; name: string }>
  onPropertyChange?: (propertyId: string | 'all') => void
  className?: string
}

/**
 * Financial Insights Module
 *
 * V1 Canon Implementation - Interactive graph for financial analysis.
 *
 * Unified component combining Chart and Timeline views.
 * Replaces FinancialGraphEnhanced with enhanced functionality.
 *
 * View Modes:
 * - Chart View: Line/Bar graphs with dataset toggles
 * - Timeline View: Chronological list of financial events
 *
 * Filter Behavior:
 * - Defaults to page-wide filters (authoritative scope)
 * - Supports local overrides for graph-only exploration
 * - Local overrides do NOT affect KPIs or ledger
 */
export function FinancialInsightsModule({
  rentCollectedData = [],
  outstandingRentData = [],
  expensesData = [],
  netCashFlowData = [],
  lineData = [],
  barData = [],
  rentRecords = [],
  expenses = [],
  workOrders = [],
  dateGranularity: _dateGranularity = 'monthly',
  timeRange = 'monthToDate',
  selectedPropertyId = 'all',
  properties = [],
  onPropertyChange: _onPropertyChange,
  className,
}: FinancialInsightsModuleProps) {
  const [viewMode, setViewMode] = useState<InsightsViewMode>('chart')
  const [graphViewType, setGraphViewType] = useState<GraphViewType>('line')
  const [curveType, setCurveType] = useState<CurveType>('smooth')
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [showGraphTypeDropdown, setShowGraphTypeDropdown] = useState(false)
  const [activeDatasets, setActiveDatasets] = useState({
    rentCollected: true,
    outstandingRent: true,
    expenses: true,
    netCashFlow: true,
  })
  const graphContainerRef = useRef<HTMLDivElement>(null)

  // Local filter overrides (scoped to graph only, override page-wide filters)
  const [localPropertyId, setLocalPropertyId] = useState<string | null>(null)
  const [localTimeRange, setLocalTimeRange] = useState<TimeRange | null>(null)
  const hasLocalOverrides = localPropertyId !== null || localTimeRange !== null

  // Effective filters: use local overrides if present, otherwise use page-wide filters
  const effectivePropertyId = localPropertyId !== null ? localPropertyId : selectedPropertyId
  const effectiveTimeRange = localTimeRange !== null ? localTimeRange : timeRange

  const resetToPageFilters = () => {
    setLocalPropertyId(null)
    setLocalTimeRange(null)
  }

  type GraphDataPoint = {
    month: string
    rentCollected: number
    outstandingRent: number
    expenses: number
    netCashFlow: number
    // Legacy support
    income: number
    net: number
  }

  // Prepare combined data for graph
  const graphData = useMemo((): GraphDataPoint[] => {
    // MVP: Support both new format and legacy format
    if (lineData.length > 0) {
      // Legacy format - convert to new format
      return lineData.map(item => ({
        month: item.month,
        income: item.income || 0,
        expenses: item.expenses || 0,
        net: item.net || 0,
        rentCollected: item.income || 0,
        outstandingRent: 0,
        netCashFlow: item.net || 0,
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
      const filtered: {
        month: string
        rentCollected?: number
        outstandingRent?: number
        expenses?: number
        netCashFlow?: number
        income?: number
        net?: number
      } = { month: point.month }
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

  // Prepare timeline events
  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string
      type: 'rent_paid' | 'rent_due' | 'rent_overdue' | 'late_fee' | 'expense' | 'work_order'
      date: Date
      label: string
      amount?: number
      property?: string
    }> = []

    // Rent paid events
    rentRecords
      .filter(r => r.status === 'paid' && r.paid_date)
      .forEach(record => {
        events.push({
          id: `rent-paid-${record.id}`,
          type: 'rent_paid',
          date: new Date(record.paid_date!),
          label: `Rent paid - ${record.property?.name || 'Unknown'}`,
          amount: Number(record.amount),
          property: record.property?.name,
        })
      })

    // Rent due events
    rentRecords
      .filter(r => r.status === 'pending')
      .forEach(record => {
        events.push({
          id: `rent-due-${record.id}`,
          type: 'rent_due',
          date: new Date(record.due_date),
          label: `Rent due - ${record.property?.name || 'Unknown'}`,
          amount: Number(record.amount),
          property: record.property?.name,
        })
      })

    // Rent overdue events
    rentRecords
      .filter(r => r.status === 'overdue')
      .forEach(record => {
        events.push({
          id: `rent-overdue-${record.id}`,
          type: 'rent_overdue',
          date: new Date(record.due_date),
          label: `Rent overdue - ${record.property?.name || 'Unknown'}`,
          amount: Number(record.amount),
          property: record.property?.name,
        })
      })

    // Late fee events
    rentRecords
      .filter(r => r.late_fee && r.late_fee > 0)
      .forEach(record => {
        events.push({
          id: `late-fee-${record.id}`,
          type: 'late_fee',
          date: new Date(record.due_date),
          label: `Late fee applied - ${record.property?.name || 'Unknown'}`,
          amount: Number(record.late_fee),
          property: record.property?.name,
        })
      })

    // Expense events
    expenses.forEach(expense => {
      const propertyName = properties.find(p => p.id === expense.property_id)?.name || 'Unknown'
      events.push({
        id: `expense-${expense.id}`,
        type: 'expense',
        date: new Date(expense.date),
        label: `${expense.name || expense.category || 'Expense'} - ${propertyName}`,
        amount: Number(expense.amount),
        property: propertyName,
      })
    })

    // Work order events
    workOrders.forEach(workOrder => {
      events.push({
        id: `work-order-${workOrder.id}`,
        type: 'work_order',
        date: new Date(workOrder.created_at),
        label: `Work order: ${workOrder.description.substring(0, 50)}${workOrder.description.length > 50 ? '...' : ''}`,
        property: workOrder.property?.name,
      })
    })

    // Sort by date (most recent first)
    return events.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [rentRecords, expenses, workOrders, properties])

  // Prepare line chart data
  const lineChartData = useMemo(() => {
    return filteredGraphData.map(point => ({
      month: point.month,
      income: point.rentCollected || point.income,
      expenses: point.expenses,
      net: point.netCashFlow || point.net,
    }))
  }, [filteredGraphData])

  // Prepare bar chart data
  const barChartData = useMemo(() => {
    if (barData.length > 0) return barData
    return filteredGraphData.map(point => ({
      month: point.month,
      amount: point.rentCollected || point.income || 0,
    }))
  }, [filteredGraphData, barData])

  // Prepare pie chart data (aggregate totals)
  const pieChartData = useMemo(() => {
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
  }, [filteredGraphData])

  const handleExportPNG = async () => {
    try {
      const elementId = `financial-insights-${Date.now()}`
      if (graphContainerRef.current) {
        graphContainerRef.current.id = elementId
        await exportGraphToPNG(
          elementId,
          `financial-insights-${new Date().toISOString().split('T')[0]}.png`
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
        `financial-insights-${new Date().toISOString().split('T')[0]}.csv`
      )
    } catch (error) {
      console.error('Failed to export CSV:', error)
      alert('Failed to export graph data as CSV.')
    }
  }

  const renderChart = () => {
    switch (graphViewType) {
      case 'line':
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
      case 'bar':
        if (barChartData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available
            </div>
          )
        }
        return <BarChart data={barChartData} />
      case 'area':
        if (lineChartData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
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
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available
            </div>
          )
        }
        return <PieChart data={pieChartData} />
      default:
        return null
    }
  }

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

  const renderTimeline = () => {
    if (timelineEvents.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No timeline events available
        </div>
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const pastEvents = timelineEvents.filter(e => e.date < today)
    const todayEvents = timelineEvents.filter(e => {
      const eventDate = new Date(e.date)
      eventDate.setHours(0, 0, 0, 0)
      return eventDate.getTime() === today.getTime()
    })
    const upcomingEvents = timelineEvents.filter(e => e.date > today)

    const getEventColor = (type: string) => {
      switch (type) {
        case 'rent_paid':
          return 'text-green-600 dark:text-green-400'
        case 'rent_due':
          return 'text-blue-600 dark:text-blue-400'
        case 'rent_overdue':
          return 'text-red-600 dark:text-red-400'
        case 'late_fee':
          return 'text-orange-600 dark:text-orange-400'
        case 'expense':
          return 'text-amber-600 dark:text-amber-400'
        case 'work_order':
          return 'text-purple-600 dark:text-purple-400'
        default:
          return 'text-muted-foreground'
      }
    }

    const getEventIcon = (type: string) => {
      switch (type) {
        case 'rent_paid':
          return '💰'
        case 'rent_due':
          return '📅'
        case 'rent_overdue':
          return '⚠️'
        case 'late_fee':
          return '💸'
        case 'expense':
          return '💳'
        case 'work_order':
          return '🔧'
        default:
          return '•'
      }
    }

    return (
      <div className="space-y-6">
        {upcomingEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Upcoming</h4>
            <div className="space-y-2">
              {upcomingEvents.slice(0, 10).map(event => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/20"
                >
                  <span className="text-lg">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium', getEventColor(event.type))}>
                      {event.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {event.date.toLocaleDateString()}{' '}
                      {event.amount && `• $${event.amount.toLocaleString()}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {todayEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Today</h4>
            <div className="space-y-2">
              {todayEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/20"
                >
                  <span className="text-lg">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium', getEventColor(event.type))}>
                      {event.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {event.amount && `$${event.amount.toLocaleString()}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pastEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Past Events</h4>
            <div className="space-y-2">
              {pastEvents.slice(0, 20).map(event => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-md border border-border"
                >
                  <span className="text-lg">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium', getEventColor(event.type))}>
                      {event.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {event.date.toLocaleDateString()}{' '}
                      {event.amount && `• $${event.amount.toLocaleString()}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {!showFullscreen && (
        <Card className={cn('glass-card relative', className)}>
          <ModalIndicator
            onClick={() => {
              setShowFullscreen(true)
            }}
            className="top-4 right-4" // Adjust position to avoid overlap
          />
          <CardHeader className="pr-12">
            {' '}
            {/* Add right padding to avoid overlap with expand icon */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Financial Insights</CardTitle>
              <div className="flex flex-wrap gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
                  <Button
                    variant={viewMode === 'chart' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('chart')}
                    className="h-8 px-3"
                    aria-label="Chart view"
                  >
                    <LineChartIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('timeline')}
                    className="h-8 px-3"
                    aria-label="Timeline view"
                  >
                    <Calendar className="w-4 h-4" />
                  </Button>
                </div>

                {/* Export Buttons (only in chart view) */}
                {viewMode === 'chart' && (
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
                )}

                {/* Graph Type - Pill + Dropdown (only in chart view) */}
                {viewMode === 'chart' && (
                  <div className="flex items-center gap-2 graph-type-dropdown">
                    <span className="text-sm font-medium text-muted-foreground">Type:</span>
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
                        <span className="capitalize">{graphViewType}</span>
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
                                setGraphViewType(type)
                                setShowGraphTypeDropdown(false)
                              }}
                              className={cn(
                                'w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors capitalize',
                                graphViewType === type && 'bg-muted font-medium'
                              )}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Local Filter Overrides (only in chart view) */}
            {viewMode === 'chart' && (
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-2 p-2 rounded-md bg-muted/20 border border-border/50">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Local Overrides:</span>
                  <select
                    value={localPropertyId || 'page'}
                    onChange={e =>
                      setLocalPropertyId(e.target.value === 'page' ? null : e.target.value)
                    }
                    className="flex h-7 rounded-md border border-input bg-background text-foreground px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="page">Use page filter</option>
                    <option value="all">All Properties</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={localTimeRange || 'page'}
                    onChange={e =>
                      setLocalTimeRange(
                        e.target.value === 'page' ? null : (e.target.value as TimeRange)
                      )
                    }
                    className="flex h-7 rounded-md border border-input bg-background text-foreground px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="page">Use page filter</option>
                    <option value="monthToDate">Month to Date</option>
                    <option value="yearToDate">Year to Date</option>
                    <option value="all">All Time</option>
                  </select>
                  {hasLocalOverrides && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToPageFilters}
                      className="h-7 px-2 text-xs"
                      title="Reset to page filters"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            )}
            {/* Dataset Toggles (only in chart view) */}
            {viewMode === 'chart' && (
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
                    onChange={e =>
                      setActiveDatasets(prev => ({ ...prev, expenses: e.target.checked }))
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
                      setActiveDatasets(prev => ({ ...prev, netCashFlow: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="text-muted-foreground">Net cash flow</span>
                </label>
                {graphViewType === 'line' && (
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
            )}
          </CardHeader>
          <CardContent>
            <div ref={graphContainerRef}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
                  animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                  exit={{ opacity: motionTokens.opacity.hidden, y: -4 }}
                  transition={{
                    duration: durationToSeconds(motionTokens.duration.base),
                    ease: motionTokens.easing.standard,
                  }}
                >
                  {viewMode === 'chart' ? renderChart() : renderTimeline()}
                </motion.div>
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fullscreen Modal */}
      {/* MVP: Pass effective filters to fullscreen modal (local overrides or page-wide) */}
      <FullscreenGraphModal
        isOpen={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        graphData={graphData}
        filteredGraphData={filteredGraphData}
        viewType={graphViewType === 'area' || graphViewType === 'pie' ? 'line' : (graphViewType as EnhancedGraphViewType)}
        timeRange={effectiveTimeRange} // Use effective time range (local override or page-wide)
        curveType={curveType}
        activeDatasets={activeDatasets}
        onViewTypeChange={setGraphViewType}
        onTimeRangeChange={range => {
          // In fullscreen, allow time range changes but they affect local override
          setLocalTimeRange(range)
        }}
        onCurveTypeChange={setCurveType}
        onActiveDatasetsChange={setActiveDatasets}
        properties={properties}
        selectedPropertyId={effectivePropertyId} // Use effective property ID (local override or page-wide)
        onPropertyChange={propertyId => {
          // In fullscreen, allow property changes but they affect local override
          setLocalPropertyId(propertyId === 'all' ? null : propertyId)
        }}
      />
    </>
  )
}
