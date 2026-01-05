import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BreakdownModal, type BreakdownSection } from '@/components/ui/breakdown-modal'
import { useProperties } from '@/hooks/use-properties'
import { useLandlordRentRecords } from '@/hooks/use-landlord-rent-records'
import { useFinancialMetrics } from '@/hooks/use-financial-metrics'
import { useExpenses } from '@/hooks/use-expenses'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TimeRange = 'monthly' | 'quarterly' | 'yearly'

interface RevenueBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  viewMode?: 'cash' | 'accrual'
  onViewModeChange?: (mode: 'cash' | 'accrual') => void
}

export function RevenueBreakdownModal({
  isOpen,
  onClose,
  viewMode = 'cash',
  onViewModeChange,
}: RevenueBreakdownModalProps) {
  const navigate = useNavigate()
  const { properties } = useProperties()
  const { records: rentRecords } = useLandlordRentRecords()
  const { expenses } = useExpenses()
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly')
  const metrics = useFinancialMetrics(rentRecords, expenses, 12)

  const sections = useMemo((): BreakdownSection[] => {
    const total = metrics.rentCollected + metrics.upcomingRent + metrics.rentOutstanding

    // Collected Rent
    const collectedPercentage = total > 0 ? (metrics.rentCollected / total) * 100 : 0
    const collectedBreakdown = properties
      .map(property => {
        const propertyRent = rentRecords
          .filter(r => r.property_id === property.id && r.status === 'paid')
          .reduce((sum, r) => sum + Number(r.amount), 0)
        return {
          label: property.name,
          value: propertyRent,
        }
      })
      .filter(item => item.value > 0)

    // Upcoming/Scheduled Rent
    const upcomingPercentage = total > 0 ? (metrics.upcomingRent / total) * 100 : 0
    const upcomingBreakdown = properties
      .map(property => {
        const propertyRent = rentRecords
          .filter(r => r.property_id === property.id && r.status === 'pending')
          .reduce((sum, r) => sum + Number(r.amount), 0)
        return {
          label: property.name,
          value: propertyRent,
        }
      })
      .filter(item => item.value > 0)

    // Overdue Rent
    const overduePercentage = total > 0 ? (metrics.rentOutstanding / total) * 100 : 0
    const overdueBreakdown = properties
      .map(property => {
        const propertyRent = rentRecords
          .filter(r => r.property_id === property.id && r.status === 'overdue')
          .reduce((sum, r) => sum + Number(r.amount), 0)
        return {
          label: property.name,
          value: propertyRent,
        }
      })
      .filter(item => item.value > 0)

    return [
      {
        label: 'Collected Rent',
        value: metrics.rentCollected,
        percentage: collectedPercentage,
        color: 'green',
        breakdown: collectedBreakdown,
      },
      {
        label: 'Upcoming / Scheduled Rent',
        value: metrics.upcomingRent,
        percentage: upcomingPercentage,
        color: 'blue',
        breakdown: upcomingBreakdown,
      },
      {
        label: 'Overdue Rent',
        value: metrics.rentOutstanding,
        percentage: overduePercentage,
        color: 'red',
        breakdown: overdueBreakdown,
      },
    ]
  }, [metrics, rentRecords, properties])

  // Calculate revenue based on time range
  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case 'monthly':
        return 'Monthly'
      case 'quarterly':
        return 'Quarterly'
      case 'yearly':
        return 'Yearly'
    }
  }, [timeRange])

  const breakdownComponent = (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Time Range</span>
          <div className="flex gap-2">
            <Button
              variant={timeRange === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={timeRange === 'quarterly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('quarterly')}
            >
              Quarterly
            </Button>
            <Button
              variant={timeRange === 'yearly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('yearly')}
            >
              Yearly
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">View Mode</span>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'cash' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange?.('cash')}
            >
              Cash
            </Button>
            <Button
              variant={viewMode === 'accrual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange?.('accrual')}
            >
              Accrual
            </Button>
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Time Range:</strong> {timeRangeLabel} view shows revenue for the selected period.
        </p>
        <p>
          <strong>View Mode:</strong>{' '}
          {viewMode === 'cash'
            ? 'Cash view shows rent when payment is received.'
            : 'Accrual view shows rent when it becomes due.'}
        </p>
        <p className="text-muted-foreground/80">
          <strong>Note:</strong> Collected rent is actual payments received. Upcoming rent is
          projected.
        </p>
      </div>
    </div>
  )

  return (
    <BreakdownModal
      isOpen={isOpen}
      onClose={onClose}
      title="Revenue Breakdown"
      description={`Detailed breakdown of rent collection status (${timeRangeLabel} view)`}
      sections={sections}
      breakdownComponent={breakdownComponent}
      cta={{
        label: 'Open full finances ledger',
        action: () => {
          onClose()
          navigate('/landlord/finances')
        },
      }}
    />
  )
}
