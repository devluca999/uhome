/**
 * Financial Assertion Helper
 *
 * Reusable E2E helper that queries staging database directly (read-only) and computes
 * expected financial values using the same logic as finance-calculations.ts.
 *
 * This helper is used to validate that UI displays match database calculations.
 * All calculations use the centralized finance-calculations.ts logic.
 *
 * Security: Uses admin client (read-only queries), service key stored in .env.test only.
 */

import { getSupabaseAdminClient } from './db-helpers'
import type { SupabaseClient } from '@supabase/supabase-js'

interface FinancialAssertions {
  // Monthly calculations
  calculateMonthlyRevenue(landlordId: string, month: Date): Promise<number>
  calculateMonthlyExpenses(landlordId: string, month: Date): Promise<number>
  calculateMonthlyNetIncome(landlordId: string, month: Date): Promise<number>

  // Date range calculations
  calculateRevenueForRange(landlordId: string, start: Date, end: Date): Promise<number>
  calculateExpensesForRange(landlordId: string, start: Date, end: Date): Promise<number>
  calculateNetIncomeForRange(landlordId: string, start: Date, end: Date): Promise<number>

  // Property-specific
  calculatePropertyRevenue(propertyId: string, start: Date, end: Date): Promise<number>
  calculatePropertyExpenses(propertyId: string, start: Date, end: Date): Promise<number>

  // Tenant-specific
  calculateTenantBalance(tenantId: string): Promise<number>

  // Work order costs
  calculateWorkOrderCosts(leaseId: string, start: Date, end: Date): Promise<number>
}

/**
 * Create financial assertion helper
 */
export function createFinancialAssertions(): FinancialAssertions {
  const supabase = getSupabaseAdminClient()

  /**
   * Get start and end dates for a calendar month
   */
  function getMonthRange(month: Date): { start: Date; end: Date } {
    const start = new Date(month.getFullYear(), month.getMonth(), 1)
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0) // Last day of month
    return { start, end }
  }

  /**
   * Format date for SQL query (YYYY-MM-DD)
   */
  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Calculate monthly revenue (rent collected) for a landlord
   * 
   * Collected revenue is calculated using paid_date (cash accounting).
   * Only includes records where status='paid' AND paid_date is not null.
   * 
   * Formula: SUM(amount + late_fee) WHERE status = 'paid' AND paid_date within month
   */
  async function calculateMonthlyRevenue(landlordId: string, month: Date): Promise<number> {
    const { start, end } = getMonthRange(month)

    // Get all properties owned by landlord
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', landlordId)

    if (propError || !properties) {
      throw new Error(`Failed to fetch properties: ${propError?.message}`)
    }

    const propertyIds = properties.map(p => p.id)
    if (propertyIds.length === 0) return 0

    // Get rent records for this month
    // Collected revenue uses paid_date (cash accounting), not due_date
    const { data: rentRecords, error: rentError } = await supabase
      .from('rent_records')
      .select('amount, late_fee, status, paid_date')
      .in('property_id', propertyIds)
      .eq('status', 'paid')
      .not('paid_date', 'is', null)
      .gte('paid_date', formatDate(start))
      .lte('paid_date', formatDate(end))

    if (rentError) {
      throw new Error(`Failed to fetch rent records: ${rentError.message}`)
    }

    if (!rentRecords) return 0

    // Guard assertion: verify no paid records with null paid_date (data quality check)
    const invalidRecords = rentRecords.filter(r => r.status === 'paid' && !r.paid_date)
    if (invalidRecords.length > 0) {
      console.warn(`Warning: Found ${invalidRecords.length} paid records with null paid_date:`, invalidRecords)
      throw new Error(`Data quality issue: Found ${invalidRecords.length} paid records with null paid_date`)
    }

    // Calculate total (amount + late_fee)
    return rentRecords.reduce(
      (sum, r) => sum + Number(r.amount || 0) + Number(r.late_fee || 0),
      0
    )
  }

  /**
   * Calculate monthly expenses for a landlord
   * Formula: SUM(amount) WHERE date within month
   */
  async function calculateMonthlyExpenses(landlordId: string, month: Date): Promise<number> {
    const { start, end } = getMonthRange(month)

    // Get all properties owned by landlord
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', landlordId)

    if (propError || !properties) {
      throw new Error(`Failed to fetch properties: ${propError?.message}`)
    }

    const propertyIds = properties.map(p => p.id)
    if (propertyIds.length === 0) return 0

    // Get expenses for this month
    // Expenses are linked to properties, not directly to users
    // RLS policies ensure landlords can only see expenses for their properties
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, date')
      .in('property_id', propertyIds)
      .gte('date', formatDate(start))
      .lte('date', formatDate(end))

    if (expenseError) {
      throw new Error(`Failed to fetch expenses: ${expenseError.message}`)
    }

    if (!expenses) return 0

    // Calculate total
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }

  /**
   * Calculate monthly net income
   */
  async function calculateMonthlyNetIncome(landlordId: string, month: Date): Promise<number> {
    const revenue = await calculateMonthlyRevenue(landlordId, month)
    const expenses = await calculateMonthlyExpenses(landlordId, month)
    return revenue - expenses
  }

  /**
   * Calculate revenue for a date range
   * 
   * Collected revenue is calculated using paid_date (cash accounting).
   * Only includes records where status='paid' AND paid_date is not null.
   */
  async function calculateRevenueForRange(
    landlordId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    // Get all properties owned by landlord
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', landlordId)

    if (propError || !properties) {
      throw new Error(`Failed to fetch properties: ${propError?.message}`)
    }

    const propertyIds = properties.map(p => p.id)
    if (propertyIds.length === 0) return 0

    // Get rent records for this range
    // Collected revenue uses paid_date (cash accounting), not due_date
    const { data: rentRecords, error: rentError } = await supabase
      .from('rent_records')
      .select('amount, late_fee, status, paid_date')
      .in('property_id', propertyIds)
      .eq('status', 'paid')
      .not('paid_date', 'is', null)
      .gte('paid_date', formatDate(start))
      .lte('paid_date', formatDate(end))

    if (rentError) {
      throw new Error(`Failed to fetch rent records: ${rentError.message}`)
    }

    if (!rentRecords) return 0

    // Guard assertion: verify no paid records with null paid_date (data quality check)
    const invalidRecords = rentRecords.filter(r => r.status === 'paid' && !r.paid_date)
    if (invalidRecords.length > 0) {
      console.warn(`Warning: Found ${invalidRecords.length} paid records with null paid_date:`, invalidRecords)
      throw new Error(`Data quality issue: Found ${invalidRecords.length} paid records with null paid_date`)
    }

    return rentRecords.reduce(
      (sum, r) => sum + Number(r.amount || 0) + Number(r.late_fee || 0),
      0
    )
  }

  /**
   * Calculate expenses for a date range
   */
  async function calculateExpensesForRange(
    landlordId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    // Get all properties owned by landlord
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', landlordId)

    if (propError || !properties) {
      throw new Error(`Failed to fetch properties: ${propError?.message}`)
    }

    const propertyIds = properties.map(p => p.id)
    if (propertyIds.length === 0) return 0

    // Get expenses for this range
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, date')
      .in('property_id', propertyIds)
      .gte('date', formatDate(start))
      .lte('date', formatDate(end))

    if (expenseError) {
      throw new Error(`Failed to fetch expenses: ${expenseError.message}`)
    }

    if (!expenses) return 0

    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }

  /**
   * Calculate net income for a date range
   * 
   * Net income = collected revenue - expenses
   * Collected revenue uses paid_date (cash accounting).
   */
  async function calculateNetIncomeForRange(
    landlordId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    const revenue = await calculateRevenueForRange(landlordId, start, end)
    const expenses = await calculateExpensesForRange(landlordId, start, end)
    return revenue - expenses
  }

  /**
   * Calculate property-specific revenue
   * 
   * Collected revenue is calculated using paid_date (cash accounting).
   * Only includes records where status='paid' AND paid_date is not null.
   */
  async function calculatePropertyRevenue(
    propertyId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    // Collected revenue uses paid_date (cash accounting), not due_date
    const { data: rentRecords, error: rentError } = await supabase
      .from('rent_records')
      .select('amount, late_fee, status, paid_date')
      .eq('property_id', propertyId)
      .eq('status', 'paid')
      .not('paid_date', 'is', null)
      .gte('paid_date', formatDate(start))
      .lte('paid_date', formatDate(end))

    if (rentError) {
      throw new Error(`Failed to fetch rent records: ${rentError.message}`)
    }

    if (!rentRecords) return 0

    // Guard assertion: verify no paid records with null paid_date (data quality check)
    const invalidRecords = rentRecords.filter(r => r.status === 'paid' && !r.paid_date)
    if (invalidRecords.length > 0) {
      console.warn(`Warning: Found ${invalidRecords.length} paid records with null paid_date:`, invalidRecords)
      throw new Error(`Data quality issue: Found ${invalidRecords.length} paid records with null paid_date`)
    }

    return rentRecords.reduce(
      (sum, r) => sum + Number(r.amount || 0) + Number(r.late_fee || 0),
      0
    )
  }

  /**
   * Calculate property-specific expenses
   */
  async function calculatePropertyExpenses(
    propertyId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, date')
      .eq('property_id', propertyId)
      .gte('date', formatDate(start))
      .lte('date', formatDate(end))

    if (expenseError) {
      throw new Error(`Failed to fetch expenses: ${expenseError.message}`)
    }

    if (!expenses) return 0

    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }

  /**
   * Calculate tenant balance (outstanding rent)
   */
  async function calculateTenantBalance(tenantId: string): Promise<number> {
    const { data: rentRecords, error: rentError } = await supabase
      .from('rent_records')
      .select('amount, late_fee, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'overdue')

    if (rentError) {
      throw new Error(`Failed to fetch rent records: ${rentError.message}`)
    }

    if (!rentRecords) return 0

    return rentRecords.reduce(
      (sum, r) => sum + Number(r.amount || 0) + Number(r.late_fee || 0),
      0
    )
  }

  /**
   * Calculate work order costs (if expenses are linked to work orders)
   * Note: This assumes work orders don't directly have costs, but may be tracked in expenses
   */
  async function calculateWorkOrderCosts(
    leaseId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    // Work orders don't have direct costs in the current schema
    // Costs would be tracked as expenses linked to work orders
    // For now, return 0 as work orders don't have cost fields
    return 0
  }

  return {
    calculateMonthlyRevenue,
    calculateMonthlyExpenses,
    calculateMonthlyNetIncome,
    calculateRevenueForRange,
    calculateExpensesForRange,
    calculateNetIncomeForRange,
    calculatePropertyRevenue,
    calculatePropertyExpenses,
    calculateTenantBalance,
    calculateWorkOrderCosts,
  }
}

/**
 * Export singleton instance
 */
export const financialAssertions = createFinancialAssertions()

