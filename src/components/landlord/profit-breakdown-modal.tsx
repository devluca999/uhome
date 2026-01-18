import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BreakdownModal, type BreakdownSection } from '@/components/ui/breakdown-modal'
import { useProperties } from '@/hooks/use-properties'
import { useLandlordRentRecords } from '@/hooks/use-landlord-rent-records'
import { useFinancialMetrics } from '@/hooks/use-financial-metrics'
import { useExpenses } from '@/hooks/use-expenses'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProfitBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfitBreakdownModal({ isOpen, onClose }: ProfitBreakdownModalProps) {
  const navigate = useNavigate()
  const { properties } = useProperties()
  const { records: rentRecords } = useLandlordRentRecords()
  const { expenses } = useExpenses()
  const metrics = useFinancialMetrics(rentRecords, expenses, 12)

  const sections = useMemo((): BreakdownSection[] => {
    // Calculate fixed recurring expenses
    const recurringExpenses = expenses
      .filter(e => e.is_recurring)
      .reduce((sum, e) => sum + Number(e.amount), 0)

    // Calculate variable expenses (one-time + work orders)
    const variableExpenses = expenses
      .filter(e => !e.is_recurring)
      .reduce((sum, e) => sum + Number(e.amount), 0)

    const totalIncome = metrics.rentCollected
    const totalExpenses = metrics.totalExpenses
    const netProfit = metrics.netProfit
    const marginPercentage = metrics.marginPercentage

    return [
      {
        label: 'Total Income',
        value: totalIncome,
        color: 'green',
        breakdown: properties
          .map(property => {
            const propertyRent = rentRecords
              .filter(r => r.property_id === property.id && r.status === 'paid')
              .reduce((sum, r) => sum + Number(r.amount), 0)
            return {
              label: property.name,
              value: propertyRent,
            }
          })
          .filter(item => item.value > 0),
      },
      {
        label: 'Fixed Recurring Expenses',
        value: recurringExpenses,
        color: 'blue',
        breakdown: expenses
          .filter(e => e.is_recurring)
          .map(e => ({
            label: e.description || e.category,
            value: Number(e.amount),
          })),
      },
      {
        label: 'Variable Expenses',
        value: variableExpenses,
        color: 'yellow',
        breakdown: expenses
          .filter(e => !e.is_recurring)
          .map(e => ({
            label: e.description || e.category,
            value: Number(e.amount),
          })),
      },
    ]
  }, [metrics, rentRecords, expenses, properties])

  const assumptionsComponent = (
    <Card className="bg-muted/50">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm text-foreground mb-2">Assumptions</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Time range: Last 12 months</li>
              <li>• Calculation method: Cash basis (rent when received)</li>
              <li>• Expenses include all categories</li>
              <li>• Last updated: {new Date().toLocaleDateString()}</li>
            </ul>
          </div>
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Net Margin</span>
              <Badge
                variant={metrics.marginPercentage >= 20 ? 'default' : 'outline'}
                className="text-sm"
              >
                {metrics.marginPercentage.toFixed(1)}%
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Net profit: ${metrics.netProfit.toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <BreakdownModal
      isOpen={isOpen}
      onClose={onClose}
      title="Profit Breakdown"
      description="Detailed breakdown of income, expenses, and net profit"
      sections={sections}
      breakdownComponent={assumptionsComponent}
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
