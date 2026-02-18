/**
 * Centralized Finance Calculation Layer
 *
 * V1 Canon Implementation - This module provides pure calculation functions for all finance-related metrics.
 * All calculations are filter-aware and traceable to ledger entries.
 *
 * V1 Canon Requirements:
 * - Total Rent Collected
 * - Outstanding / Unpaid Rent
 * - Total Expenses
 * - Net Cash Flow (rent_collected - expenses)
 * - Active Properties
 * - Occupancy Rate
 *
 * V1 Exclusions (Do NOT implement):
 * - Tax logic
 * - Depreciation
 * - Investment metrics (ROI, IRR, etc.)
 * - Accounting classifications
 *
 * Rules:
 * - All functions are pure (no side effects)
 * - All functions accept filter parameters
 * - Calculations must be traceable to ledger entries
 * - Late fees are included in rent calculations (MVP requirement)
 */

import type { RentRecordWithRelations } from '@/hooks/use-landlord-rent-records'
import type { Database } from '@/types/database'

type Expense = Database['public']['Tables']['expenses']['Row']
type Property = Database['public']['Tables']['properties']['Row']
type Tenant = {
  id: string
  property_id: string
  [key: string]: any
}

/**
 * Format date for comparison (YYYY-MM-DD string)
 *
 * Normalizes dates to YYYY-MM-DD format for consistent string-based comparison.
 * This matches the approach used by test helpers and dashboard.
 *
 * @param date - Date object or date string
 * @returns YYYY-MM-DD formatted string
 */
function formatDateForComparison(date: Date | string): string {
  if (typeof date === 'string') {
    // Extract YYYY-MM-DD part from date string (handles both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:MM:SSZ')
    return date.split('T')[0]
  }
  // Format Date object to YYYY-MM-DD
  return date.toISOString().split('T')[0]
}

export interface FinanceFilters {
  propertyId?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

/** Get expense date - schema may use expense_date (initial) or date (legacy) */
export function getExpenseDate(e: { expense_date?: string; date?: string }): string {
  return (e as { expense_date?: string; date?: string }).expense_date ?? (e as { date: string }).date
}

/**
 * Filter rent records by property and date range
 */
export function filterRentRecords(
  records: RentRecordWithRelations[],
  filters?: FinanceFilters,
  activePropertyIds?: Set<string>
): RentRecordWithRelations[] {
  let filtered = [...records]

  // Filter out records from inactive properties if activePropertyIds is provided
  if (activePropertyIds) {
    filtered = filtered.filter(r => r.property_id && activePropertyIds.has(r.property_id))
  }

  if (filters?.propertyId) {
    filtered = filtered.filter(r => r.property_id === filters.propertyId)
  }

  if (filters?.dateRange) {
    const { start, end } = filters.dateRange
    // Format range boundaries as YYYY-MM-DD strings for comparison
    const startStr = formatDateForComparison(start)
    const endStr = formatDateForComparison(end)

    filtered = filtered.filter(r => {
      // For paid records, use paid_date (cash accounting)
      // Exclude paid records with null paid_date (data quality issue)
      if (r.status === 'paid') {
        if (!r.paid_date) return false // Exclude paid records without paid_date
        const paidDateStr = formatDateForComparison(r.paid_date)
        return paidDateStr >= startStr && paidDateStr <= endStr
      }
      // For overdue/pending, use due_date
      const dueDateStr = formatDateForComparison(r.due_date)
      return dueDateStr >= startStr && dueDateStr <= endStr
    })
  }

  return filtered
}

/**
 * Filter expenses by property and date range
 */
export function filterExpenses(
  expenses: Expense[],
  filters?: FinanceFilters,
  activePropertyIds?: Set<string>
): Expense[] {
  let filtered = [...expenses]

  // Filter out expenses from inactive properties if activePropertyIds is provided
  if (activePropertyIds) {
    filtered = filtered.filter(e => e.property_id && activePropertyIds.has(e.property_id))
  }

  if (filters?.propertyId) {
    filtered = filtered.filter(e => e.property_id === filters.propertyId)
  }

  if (filters?.dateRange) {
    const { start, end } = filters.dateRange
    // Format range boundaries as YYYY-MM-DD strings for comparison
    const startStr = formatDateForComparison(start)
    const endStr = formatDateForComparison(end)

    filtered = filtered.filter(e => {
      const expenseDateStr = formatDateForComparison(getExpenseDate(e))
      return expenseDateStr >= startStr && expenseDateStr <= endStr
    })
  }

  return filtered
}

/**
 * Calculate Total Rent Collected
 *
 * Formula: SUM(amount + late_fee) WHERE status = 'paid'
 * Includes late fees in calculation (MVP requirement)
 *
 * @param rentRecords - All rent records
 * @param filters - Optional filters (property, date range)
 * @returns Total rent collected amount
 */
export function calculateRentCollected(
  rentRecords: RentRecordWithRelations[],
  filters?: FinanceFilters,
  activePropertyIds?: Set<string>
): number {
  const filtered = filterRentRecords(rentRecords, filters, activePropertyIds)

  // Collected revenue uses paid_date (cash accounting)
  // Only include records where status='paid' AND paid_date is not null
  return filtered
    .filter(r => r.status === 'paid' && r.paid_date !== null)
    .reduce((sum, r) => sum + Number(r.amount) + (Number(r.late_fee) || 0), 0)
}

/**
 * Calculate Outstanding / Unpaid Rent
 *
 * V1 Canon Implementation - Core KPI for tracking unpaid rent.
 *
 * Formula: SUM(amount + late_fee) WHERE status = 'overdue'
 * Includes late fees in calculation (MVP requirement)
 *
 * @param rentRecords - All rent records
 * @param filters - Optional filters (property, date range)
 * @returns Total outstanding rent amount
 */
export function calculateUnpaidRent(
  rentRecords: RentRecordWithRelations[],
  filters?: FinanceFilters,
  activePropertyIds?: Set<string>
): number {
  const filtered = filterRentRecords(rentRecords, filters, activePropertyIds)

  return filtered
    .filter(r => r.status === 'overdue')
    .reduce((sum, r) => sum + Number(r.amount) + (Number(r.late_fee) || 0), 0)
}

/**
 * Calculate Total Expenses
 *
 * Formula: SUM(amount)
 *
 * @param expenses - All expenses
 * @param filters - Optional filters (property, date range)
 * @returns Total expenses amount
 */
export function calculateTotalExpenses(
  expenses: Expense[],
  filters?: FinanceFilters,
  activePropertyIds?: Set<string>
): number {
  const filtered = filterExpenses(expenses, filters, activePropertyIds)

  return filtered.reduce((sum, e) => sum + Number(e.amount), 0)
}

/**
 * Calculate Net Cash Flow
 *
 * V1 Canon Implementation - Primary profitability metric.
 *
 * Formula: rentCollected - totalExpenses
 * This is the primary profitability metric for v1 canon.
 *
 * V1 Note: This is cash flow, not accounting profit. No tax, depreciation, or accrual adjustments.
 *
 * @param rentCollected - Total rent collected
 * @param totalExpenses - Total expenses
 * @returns Net cash flow (can be negative)
 */
export function calculateNetCashFlow(rentCollected: number, totalExpenses: number): number {
  return rentCollected - totalExpenses
}

/**
 * Calculate Active Properties
 *
 * V1 Canon Implementation - Core KPI for property portfolio tracking.
 *
 * Formula: COUNT(DISTINCT properties.id) WHERE EXISTS tenant
 * An active property is one that has at least one tenant.
 *
 * @param properties - All properties
 * @param tenants - All tenants
 * @param filters - Optional filters (property - if specified, returns 1 or 0)
 * @returns Count of active properties
 */
export function calculateActiveProperties(
  properties: Property[],
  tenants: Tenant[],
  filters?: FinanceFilters
): number {
  // Filter out inactive properties
  const activeProperties = properties.filter(p => p.is_active !== false)

  // If filtering by specific property, check if it's active and has tenants
  if (filters?.propertyId) {
    const property = activeProperties.find(p => p.id === filters.propertyId)
    if (!property) return 0
    const hasTenants = tenants.some(t => t.property_id === filters.propertyId)
    return hasTenants ? 1 : 0
  }

  // Count distinct active properties that have tenants
  const activePropertyIds = new Set(activeProperties.map(p => p.id))
  const propertiesWithTenants = new Set(
    tenants.filter(t => t.property_id && activePropertyIds.has(t.property_id)).map(t => t.property_id!)
  )

  return propertiesWithTenants.size
}

/**
 * Calculate Occupancy Rate
 *
 * V1 Canon Implementation - Core KPI for property portfolio health.
 *
 * Formula: (activeProperties / totalProperties) * 100
 * Returns percentage of properties that are occupied.
 *
 * @param properties - All properties
 * @param tenants - All tenants
 * @param filters - Optional filters (property - if specified, returns 100% or 0%)
 * @returns Occupancy rate as percentage (0-100)
 */
export function calculateOccupancyRate(
  properties: Property[],
  tenants: Tenant[],
  filters?: FinanceFilters
): number {
  // Filter out inactive properties
  const activeProperties = properties.filter(p => p.is_active !== false)
  if (activeProperties.length === 0) return 0

  // If filtering by specific property, check if it's active first
  if (filters?.propertyId) {
    const property = activeProperties.find(p => p.id === filters.propertyId)
    if (!property) return 0
    const hasTenants = tenants.some(t => t.property_id === filters.propertyId)
    return hasTenants ? 100 : 0
  }

  const activePropertiesWithTenants = calculateActiveProperties(properties, tenants, filters)
  return Math.round((activePropertiesWithTenants / activeProperties.length) * 100)
}

/**
 * Calculate Upcoming Rent (Pending)
 *
 * Formula: SUM(amount) WHERE status = 'pending'
 * Does not include late fees (pending rent hasn't incurred late fees yet)
 *
 * @param rentRecords - All rent records
 * @param filters - Optional filters (property, date range)
 * @returns Total upcoming rent amount
 */
export function calculateUpcomingRent(
  rentRecords: RentRecordWithRelations[],
  filters?: FinanceFilters,
  activePropertyIds?: Set<string>
): number {
  const filtered = filterRentRecords(rentRecords, filters, activePropertyIds)

  return filtered.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount), 0)
}

/**
 * Calculate date range based on time range type
 *
 * Helper function to convert time range strings to date ranges
 */
export function calculateDateRange(
  timeRange: 'monthToDate' | 'yearToDate',
  now: Date = new Date()
): { start: Date; end: Date } {
  switch (timeRange) {
    case 'monthToDate':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      }
    case 'yearToDate':
      return {
        start: new Date(now.getFullYear(), 0, 1), // Jan 1
        end: now,
      }
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      }
  }
}

/**
 * Calculate projected expenses from recurring expenses
 *
 * Projects recurring expenses for the next N days.
 * Used for "Projected Net" calculation.
 *
 * @param expenses - All expenses
 * @param days - Number of days to project
 * @param filters - Optional filters (property)
 * @returns Projected expense amount
 */
export function calculateProjectedExpenses(
  expenses: Expense[],
  days: number,
  filters?: FinanceFilters,
  activePropertyIds?: Set<string>
): number {
  const filtered = filterExpenses(expenses, filters, activePropertyIds)
  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + days)

  let projected = 0

  for (const expense of filtered) {
    if (!expense.is_recurring || !expense.recurring_frequency || !expense.recurring_start_date) {
      continue
    }

    const startDate = new Date(expense.recurring_start_date)
    const endRecurringDate = expense.recurring_end_date
      ? new Date(expense.recurring_end_date)
      : null

    // Check if recurring period is active
    if (startDate > endDate) continue
    if (endRecurringDate && endRecurringDate < now) continue

    // Calculate how many occurrences in the projection period
    const periodStart = startDate > now ? startDate : now
    const periodEnd = endRecurringDate && endRecurringDate < endDate ? endRecurringDate : endDate

    let occurrences = 0
    const current = new Date(periodStart)

    while (current <= periodEnd) {
      occurrences++

      switch (expense.recurring_frequency) {
        case 'monthly':
          current.setMonth(current.getMonth() + 1)
          break
        case 'quarterly':
          current.setMonth(current.getMonth() + 3)
          break
        case 'yearly':
          current.setFullYear(current.getFullYear() + 1)
          break
      }
    }

    projected += Number(expense.amount) * occurrences
  }

  return projected
}
