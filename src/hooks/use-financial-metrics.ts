import { useMemo } from 'react'
import type { RentRecordWithRelations } from './use-landlord-rent-records'
import type { Database } from '@/types/database'
import {
  calculateRentCollected,
  calculateUnpaidRent,
  calculateTotalExpenses,
  calculateNetCashFlow,
  calculateUpcomingRent,
  calculateProjectedRentIncome,
  calculateProjectedExpenses,
  getExpenseDate,
  type FinanceFilters,
} from '@/lib/finance-calculations'

type Expense = Database['public']['Tables']['expenses']['Row']

export type TimeRange = 'month' | 'quarter' | 'year'

export type FinancialMetrics = {
  rentCollected: number
  rentOutstanding: number
  upcomingRent: number
  totalExpenses: number
  netProfit: number
  projectedNet: number // Next 30 days
  marginPercentage: number
  monthlyRentCollected: Array<{
    month: string
    amount: number
  }>
  monthlyExpenses: Array<{
    month: string
    amount: number
  }>
  monthlyNet: Array<{
    month: string
    income: number
    expenses: number
    net: number
  }>
  expenseAveragesByCategory: Array<{
    category: string
    monthlyAverage: number
    trend: 'up' | 'down' | 'neutral'
    trendPercentage?: number
  }>
}

/**
 * Financial Metrics Hook
 *
 * V1 Canon Implementation - Uses centralized calculation functions from finance-calculations.ts
 *
 * MVP: Calendar year YTD (Jan 1 to today), not fiscal year
 * Post-MVP: Support for fiscal year and rolling 12-month ranges
 *
 * V1 Exclusions:
 * - Tax calculations
 * - Depreciation
 * - Investment metrics
 * - Accounting classifications
 */
export function useFinancialMetrics(
  rentRecords: RentRecordWithRelations[],
  expenses: Expense[],
  months: number = 6,
  propertyId?: string,
  timeRange: TimeRange = 'month',
  dateRangeFilter?: { start: Date; end: Date },
  activePropertyIds?: Set<string>
): FinancialMetrics {
  return useMemo(() => {
    const now = new Date()

    // Build filters for centralized calculations
    const filters: FinanceFilters = {
      propertyId,
      dateRange: dateRangeFilter,
    }

    // Debug logging
    if (import.meta.env.DEV) {
      console.debug(
        '[useFinancialMetrics] Input:',
        JSON.stringify(
          {
            rentRecordsCount: rentRecords.length,
            expensesCount: expenses.length,
            months,
            propertyId,
            timeRange,
            dateRangeFilter,
            activePropertyIdsCount: activePropertyIds?.size,
            activePropertyIds: activePropertyIds ? Array.from(activePropertyIds) : undefined,
          },
          null,
          2
        )
      )
    }

    // Use centralized calculation functions (exclude inactive properties)
    const rentCollected = calculateRentCollected(rentRecords, filters, activePropertyIds)
    const rentOutstanding = calculateUnpaidRent(rentRecords, filters, activePropertyIds)
    const upcomingRent = calculateUpcomingRent(rentRecords, filters, activePropertyIds)
    const totalExpenses = calculateTotalExpenses(expenses, filters, activePropertyIds)

    // Projections are always relative to "now" (next 30 days) and should not be constrained by
    // the selected historical date range filter.
    const projectionFilters: Pick<FinanceFilters, 'propertyId'> = { propertyId }
    const projectedExpenses = calculateProjectedExpenses(expenses, 30, projectionFilters, activePropertyIds)
    const projectedIncome = calculateProjectedRentIncome(rentRecords, 30, projectionFilters, activePropertyIds)

    // Calculate projected net (next 30 days)
    const projectedNet = projectedIncome - projectedExpenses

    // Calculate net cash flow (net profit) using centralized function
    const netProfit = calculateNetCashFlow(rentCollected, totalExpenses)

    // Calculate margin percentage
    const marginPercentage =
      rentCollected > 0 ? ((rentCollected - totalExpenses) / rentCollected) * 100 : 0

    // For monthly calculations, filter by property and dateRange for chart data
    // Also filter out inactive properties if activePropertyIds is provided
    let filteredRentRecords = propertyId
      ? rentRecords.filter(r => r.property_id === propertyId)
      : activePropertyIds
        ? rentRecords.filter(r => r.property_id && activePropertyIds.has(r.property_id))
        : rentRecords

    let filteredExpenses = propertyId
      ? expenses.filter(e => e.property_id === propertyId)
      : activePropertyIds
        ? expenses.filter(e => e.property_id && activePropertyIds.has(e.property_id))
        : expenses

    // Debug logging for filtering
    if (import.meta.env.DEV) {
      console.debug(
        '[useFinancialMetrics] Filtering:',
        JSON.stringify(
          {
            beforeFilter: {
              rentRecords: rentRecords.length,
              expenses: expenses.length,
            },
            afterFilter: {
              rentRecords: filteredRentRecords.length,
              expenses: filteredExpenses.length,
            },
            propertyId,
            activePropertyIdsCount: activePropertyIds?.size,
          },
          null,
          2
        )
      )
    }

    // Apply dateRange filter if provided
    if (dateRangeFilter) {
      const { start, end } = dateRangeFilter
      const startStr = start.toISOString().split('T')[0]
      const endStr = end.toISOString().split('T')[0]

      filteredRentRecords = filteredRentRecords.filter(r => {
        // For paid records, use paid_date; for others, use due_date
        const dateStr =
          r.status === 'paid' && r.paid_date ? r.paid_date.split('T')[0] : r.due_date.split('T')[0]
        return dateStr >= startStr && dateStr <= endStr
      })

      filteredExpenses = filteredExpenses.filter(e => {
        const expenseDateStr = getExpenseDate(e).split('T')[0]
        return expenseDateStr >= startStr && expenseDateStr <= endStr
      })
    }

    // Calculate monthly rent collected for chart (always calculate monthly first, then aggregate)
    const monthlyRentCollected: Array<{ month: string; amount: number; date: Date }> = []
    const monthlyExpenses: Array<{ month: string; amount: number; date: Date }> = []
    const monthlyNet: Array<{
      month: string
      income: number
      expenses: number
      net: number
      date: Date
    }> = []

    // Calculate number of periods to show based on time range
    // periodsToShow removed - not used (calculations removed)

    // First, calculate all monthly data
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const monthRent = filteredRentRecords
        .filter(r => {
          if (r.status !== 'paid' || !r.paid_date) return false
          const paidDate = new Date(r.paid_date)
          return paidDate >= monthStart && paidDate <= monthEnd
        })
        .reduce((sum, r) => sum + Number(r.amount) + (r.late_fee || 0), 0)

      const monthExpenseTotal = filteredExpenses
        .filter(e => {
          const expenseDate = new Date(getExpenseDate(e))
          return expenseDate >= monthStart && expenseDate <= monthEnd
        })
        .reduce((sum, e) => sum + Number(e.amount), 0)

      monthlyRentCollected.push({ month: monthKey, amount: monthRent, date })
      monthlyExpenses.push({ month: monthKey, amount: monthExpenseTotal, date })
      monthlyNet.push({
        month: monthKey,
        income: monthRent,
        expenses: monthExpenseTotal,
        net: monthRent - monthExpenseTotal,
        date,
      })
    }

    // Aggregate based on time range
    let aggregatedRentCollected: Array<{ month: string; amount: number }> = []
    let aggregatedExpenses: Array<{ month: string; amount: number }> = []
    let aggregatedNet: Array<{ month: string; income: number; expenses: number; net: number }> = []

    if (timeRange === 'month') {
      // Use monthly data as-is
      aggregatedRentCollected = monthlyRentCollected.map(({ month, amount }) => ({ month, amount }))
      aggregatedExpenses = monthlyExpenses.map(({ month, amount }) => ({ month, amount }))
      aggregatedNet = monthlyNet.map(({ month, income, expenses, net }) => ({
        month,
        income,
        expenses,
        net,
      }))
    } else if (timeRange === 'quarter') {
      // Aggregate into quarters
      const quarterMap = new Map<string, { rent: number; expenses: number; date: Date }>()

      monthlyRentCollected.forEach(({ date, amount }) => {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        const quarterKey = `Q${quarter} ${date.getFullYear()}`
        const existing = quarterMap.get(quarterKey) || { rent: 0, expenses: 0, date }
        quarterMap.set(quarterKey, { ...existing, rent: existing.rent + amount, date })
      })

      monthlyExpenses.forEach(({ date, amount }) => {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        const quarterKey = `Q${quarter} ${date.getFullYear()}`
        const existing = quarterMap.get(quarterKey) || { rent: 0, expenses: 0, date }
        quarterMap.set(quarterKey, { ...existing, expenses: existing.expenses + amount, date })
      })

      // Convert to arrays and sort by date
      aggregatedRentCollected = Array.from(quarterMap.entries())
        .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
        .map(([month, data]) => ({ month, amount: data.rent }))

      aggregatedExpenses = Array.from(quarterMap.entries())
        .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
        .map(([month, data]) => ({ month, amount: data.expenses }))

      aggregatedNet = Array.from(quarterMap.entries())
        .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
        .map(([month, data]) => ({
          month,
          income: data.rent,
          expenses: data.expenses,
          net: data.rent - data.expenses,
        }))
    } else if (timeRange === 'year') {
      // Aggregate into years
      const yearMap = new Map<string, { rent: number; expenses: number; date: Date }>()

      monthlyRentCollected.forEach(({ date, amount }) => {
        const yearKey = date.getFullYear().toString()
        const existing = yearMap.get(yearKey) || { rent: 0, expenses: 0, date }
        yearMap.set(yearKey, { ...existing, rent: existing.rent + amount, date })
      })

      monthlyExpenses.forEach(({ date, amount }) => {
        const yearKey = date.getFullYear().toString()
        const existing = yearMap.get(yearKey) || { rent: 0, expenses: 0, date }
        yearMap.set(yearKey, { ...existing, expenses: existing.expenses + amount, date })
      })

      // Convert to arrays and sort by date
      aggregatedRentCollected = Array.from(yearMap.entries())
        .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
        .map(([month, data]) => ({ month, amount: data.rent }))

      aggregatedExpenses = Array.from(yearMap.entries())
        .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
        .map(([month, data]) => ({ month, amount: data.expenses }))

      aggregatedNet = Array.from(yearMap.entries())
        .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
        .map(([month, data]) => ({
          month,
          income: data.rent,
          expenses: data.expenses,
          net: data.rent - data.expenses,
        }))
    }

    // Calculate expense averages by category with trends
    const expenseAveragesByCategory = calculateExpenseAveragesByCategory(filteredExpenses, months)

    const result = {
      rentCollected,
      rentOutstanding,
      upcomingRent,
      totalExpenses,
      netProfit,
      projectedNet,
      marginPercentage,
      monthlyRentCollected: aggregatedRentCollected,
      monthlyExpenses: aggregatedExpenses,
      monthlyNet: aggregatedNet,
      expenseAveragesByCategory,
    }

    // Debug logging for output
    if (import.meta.env.DEV) {
      console.debug(
        '[useFinancialMetrics] Output:',
        JSON.stringify(
          {
            rentCollected,
            rentOutstanding,
            upcomingRent,
            totalExpenses,
            netProfit,
            projectedNet,
            marginPercentage,
            monthlyRentCollected: {
              length: aggregatedRentCollected.length,
              data: aggregatedRentCollected,
            },
            monthlyExpenses: {
              length: aggregatedExpenses.length,
              data: aggregatedExpenses,
            },
            monthlyNet: {
              length: aggregatedNet.length,
              data: aggregatedNet,
            },
          },
          null,
          2
        )
      )
    }

    return result
  }, [rentRecords, expenses, months, propertyId, timeRange, dateRangeFilter, activePropertyIds])
}

/**
 * Calculate monthly averages by category with trend analysis
 */
function calculateExpenseAveragesByCategory(
  expenses: Expense[],
  months: number = 6
): Array<{
  category: string
  monthlyAverage: number
  trend: 'up' | 'down' | 'neutral'
  trendPercentage?: number
}> {
  const now = new Date()
  const categories = ['maintenance', 'utilities', 'repairs'] as const
  const result: Array<{
    category: string
    monthlyAverage: number
    trend: 'up' | 'down' | 'neutral'
    trendPercentage?: number
  }> = []

  for (const category of categories) {
    const categoryExpenses = expenses.filter(e => e.category === category)

    if (categoryExpenses.length === 0) continue

    // Calculate last 3 months vs previous 3 months for trend
    const last3MonthsStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const last3MonthsEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const prev3MonthsStart = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    const prev3MonthsEnd = new Date(now.getFullYear(), now.getMonth() - 3, 0)

    const last3MonthsTotal = categoryExpenses
      .filter(e => {
        const expenseDate = new Date(getExpenseDate(e))
        return expenseDate >= last3MonthsStart && expenseDate <= last3MonthsEnd
      })
      .reduce((sum, e) => sum + Number(e.amount), 0)

    const prev3MonthsTotal = categoryExpenses
      .filter(e => {
        const expenseDate = new Date(getExpenseDate(e))
        return expenseDate >= prev3MonthsStart && expenseDate <= prev3MonthsEnd
      })
      .reduce((sum, e) => sum + Number(e.amount), 0)

    const last3MonthsAverage = last3MonthsTotal / 3
    const prev3MonthsAverage = prev3MonthsTotal / 3

    let trend: 'up' | 'down' | 'neutral' = 'neutral'
    let trendPercentage: number | undefined

    if (prev3MonthsAverage > 0) {
      const change = ((last3MonthsAverage - prev3MonthsAverage) / prev3MonthsAverage) * 100
      trendPercentage = Math.abs(change)
      trend = change > 5 ? 'up' : change < -5 ? 'down' : 'neutral'
    } else if (last3MonthsAverage > 0) {
      trend = 'up'
      trendPercentage = 100
    }

    result.push({
      category,
      monthlyAverage: last3MonthsAverage,
      trend,
      trendPercentage,
    })
  }

  // Add one-time expenses category
  const oneTimeExpenses = expenses.filter(e => !e.is_recurring)
  const oneTimeTotal = oneTimeExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const oneTimeAverage = oneTimeTotal / Math.max(1, months)

  result.push({
    category: 'one-time',
    monthlyAverage: oneTimeAverage,
    trend: 'neutral',
  })

  return result
}
