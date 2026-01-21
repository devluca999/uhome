import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BreakdownModal, type BreakdownSection } from '@/components/ui/breakdown-modal'
import { useProperties } from '@/hooks/use-properties'
import { useExpenses } from '@/hooks/use-expenses'
import { DonutChart } from '@/components/ui/donut-chart'
import { BarChart } from '@/components/ui/bar-chart'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface ExpenseDistributionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExpenseDistributionModal({ isOpen, onClose }: ExpenseDistributionModalProps) {
  const navigate = useNavigate()
  const { properties } = useProperties()
  const { expenses } = useExpenses()

  const distributionData = useMemo(() => {
    // Recurring vs Ad-Hoc
    const recurring = expenses
      .filter(e => e.is_recurring)
      .reduce((sum, e) => sum + Number(e.amount), 0)
    const adHoc = expenses
      .filter(e => !e.is_recurring)
      .reduce((sum, e) => sum + Number(e.amount), 0)

    // Property-level distribution
    const propertyDistribution = properties
      .map(property => {
        const propertyExpenses = expenses
          .filter(e => e.property_id === property.id)
          .reduce((sum, e) => sum + Number(e.amount), 0)
        return {
          label: property.name,
          value: propertyExpenses,
        }
      })
      .filter(item => item.value > 0)

    // Top cost drivers
    const categoryTotals = expenses.reduce(
      (acc, e) => {
        const category = e.category || 'other'
        if (!acc[category]) {
          acc[category] = 0
        }
        acc[category] += Number(e.amount)
        return acc
      },
      {} as Record<string, number>
    )

    const topCostDrivers = Object.entries(categoryTotals)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Calculate average expense per property
    const avgExpensePerProperty =
      expenses.length > 0 && properties.length > 0
        ? expenses.reduce((sum, e) => sum + Number(e.amount), 0) / properties.length
        : 0

    // Find spikes (expenses > 1.5x average)
    const spikes = expenses
      .filter(e => {
        const propertyExpenses = expenses
          .filter(exp => exp.property_id === e.property_id)
          .reduce((sum, exp) => sum + Number(exp.amount), 0)
        return propertyExpenses > avgExpensePerProperty * 1.5 && avgExpensePerProperty > 0
      })
      .map(e => {
        const property = properties.find(p => p.id === e.property_id)
        return {
          property: property?.name || 'Unknown',
          amount: Number(e.amount),
          category: e.category || 'other',
          description: e.description,
        }
      })

    return {
      recurring,
      adHoc,
      propertyDistribution,
      topCostDrivers,
      spikes,
      avgExpensePerProperty,
    }
  }, [expenses, properties])

  const sections = useMemo((): BreakdownSection[] => {
    const total = distributionData.recurring + distributionData.adHoc
    const recurringPercentage = total > 0 ? (distributionData.recurring / total) * 100 : 0
    const adHocPercentage = total > 0 ? (distributionData.adHoc / total) * 100 : 0

    return [
      {
        label: 'Recurring Expenses',
        value: distributionData.recurring,
        percentage: recurringPercentage,
        color: 'blue',
      },
      {
        label: 'Ad-Hoc Expenses',
        value: distributionData.adHoc,
        percentage: adHocPercentage,
        color: 'yellow',
      },
    ]
  }, [distributionData])

  const breakdownComponent = (
    <div className="space-y-6">
      {/* Recurring vs Ad-Hoc Chart */}
      <div>
        <h4 className="font-medium text-sm text-foreground mb-3">Recurring vs Ad-Hoc</h4>
        <DonutChart
          data={[
            {
              name: 'Recurring',
              value: distributionData.recurring,
              color: '#3b82f6',
            },
            {
              name: 'Ad-Hoc',
              value: distributionData.adHoc,
              color: '#f59e0b',
            },
          ].filter(item => item.value > 0)}
        />
      </div>

      {/* Property Distribution */}
      {distributionData.propertyDistribution.length > 0 && (
        <div>
          <h4 className="font-medium text-sm text-foreground mb-3">Property-Level Distribution</h4>
          <BarChart
            data={distributionData.propertyDistribution.map(item => ({
              month: item.label,
              amount: item.value,
            }))}
          />
        </div>
      )}

      {/* Top Cost Drivers */}
      {distributionData.topCostDrivers.length > 0 && (
        <div>
          <h4 className="font-medium text-sm text-foreground mb-3">Top Cost Drivers</h4>
          <div className="space-y-2">
            {distributionData.topCostDrivers.map((driver, index) => (
              <div
                key={driver.category}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                  <span className="text-sm text-foreground capitalize">{driver.category}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  ${driver.total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spikes */}
      {distributionData.spikes.length > 0 && (
        <div>
          <h4 className="font-medium text-sm text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Unusual Expenses
          </h4>
          <div className="space-y-2">
            {distributionData.spikes.map((spike, index) => (
              <Card key={index} className="border-yellow-500/50 bg-yellow-500/10">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-foreground">{spike.property}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {spike.description || spike.category}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400">
                      ${spike.amount.toLocaleString()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <BreakdownModal
      isOpen={isOpen}
      onClose={onClose}
      title="Expense Distribution"
      description="Breakdown of expenses by type, property, and category"
      sections={sections}
      breakdownComponent={breakdownComponent}
      cta={{
        label: 'View Full Finances',
        action: () => {
          onClose()
          navigate('/landlord/finances')
        },
      }}
    />
  )
}
