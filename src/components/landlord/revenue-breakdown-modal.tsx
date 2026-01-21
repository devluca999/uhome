import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BreakdownModal, type BreakdownSection } from '@/components/ui/breakdown-modal'
import { useProperties } from '@/hooks/use-properties'
import { useLandlordRentRecords } from '@/hooks/use-landlord-rent-records'
import { useFinancialMetrics } from '@/hooks/use-financial-metrics'
import { useExpenses } from '@/hooks/use-expenses'

interface RevenueBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RevenueBreakdownModal({ isOpen, onClose }: RevenueBreakdownModalProps) {
  const navigate = useNavigate()
  const { properties } = useProperties()
  const { records: rentRecords } = useLandlordRentRecords()
  const { expenses } = useExpenses()
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

  const breakdownComponent = (
    <div className="text-xs text-muted-foreground space-y-1">
      <p className="text-muted-foreground/80">
        <strong>Note:</strong> Collected rent is actual payments received. Upcoming rent is
        projected.
      </p>
    </div>
  )

  return (
    <BreakdownModal
      isOpen={isOpen}
      onClose={onClose}
      title="Revenue Breakdown"
      description="Detailed breakdown of rent collection status"
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
