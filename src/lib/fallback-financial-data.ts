/**
 * Fallback mock data for financial dashboards when no real data exists.
 * Ensures charts and KPIs always render (e.g. fresh demo, onboarding).
 */

import type { RentRecordWithRelations } from '@/hooks/use-landlord-rent-records'
import type { Database } from '@/types/database'

type Expense = Database['public']['Tables']['expenses']['Row']

export function generateFallbackRentRecords(
  properties: Array<{ id: string; name: string; address?: string | null }>
): RentRecordWithRelations[] {
  const today = new Date()
  const records: RentRecordWithRelations[] = []
  const amounts = [2400, 2800, 3200]
  const paymentMethods = ['Zelle', 'Cash', 'Check', 'Venmo', 'Bank Transfer']

  const propsToUse =
    properties.length > 0
      ? properties
      : [
          { id: 'fallback-property-0', name: 'Property 1', address: '123 Demo St' },
          { id: 'fallback-property-1', name: 'Property 2', address: '456 Demo St' },
          { id: 'fallback-property-2', name: 'Property 3', address: '789 Demo St' },
        ]

  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const dueDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
    const isPastMonth = monthOffset > 0
    const isCurrentMonth = monthOffset === 0

    for (let i = 0; i < propsToUse.length; i++) {
      const property = propsToUse[i]
      const amount = amounts[i % amounts.length]
      let status: 'paid' | 'pending' | 'overdue' = 'pending'
      let paidDate: string | null = null
      const paymentMethodType = 'external' as const
      const paymentMethodLabel = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]

      if (isPastMonth) {
        status = 'paid'
        const daysLate = Math.random() < 0.3 ? Math.floor(Math.random() * 5) + 1 : 0
        paidDate = new Date(dueDate.getTime() + daysLate * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      } else if (isCurrentMonth && Math.random() > 0.3) {
        status = 'paid'
        const daysAgo = Math.floor(Math.random() * 5)
        paidDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      }

      records.push({
        id: `fallback-${monthOffset}-${i}`,
        property_id: property.id,
        tenant_id: `fallback-tenant-${i}`,
        amount,
        due_date: dueDate.toISOString().split('T')[0],
        status,
        paid_date: paidDate,
        payment_method_type: paymentMethodType,
        payment_method_label: paymentMethodLabel,
        notes: null,
        receipt_url: null,
        created_at: dueDate.toISOString(),
        updated_at: dueDate.toISOString(),
        property: { id: property.id, name: property.name, address: property.address || null },
        tenant: { id: `fallback-tenant-${i}`, user: { email: `tenant${i + 1}@example.com` } },
      } as RentRecordWithRelations)
    }
  }

  return records
}

export function generateFallbackExpenses(
  properties: Array<{ id: string; name: string }>
): Expense[] {
  const today = new Date()
  const expenses: Expense[] = []
  const categories = ['maintenance', 'utilities', 'repairs'] as const
  const descriptions: Record<string, string[]> = {
    maintenance: ['HVAC service', 'Gutter cleaning', 'Lawn mowing'],
    utilities: ['Water bill', 'Electricity bill', 'Gas bill'],
    repairs: ['Plumbing repair', 'Electrical repair', 'Roof repair'],
  }

  const propsToUse =
    properties.length > 0
      ? properties
      : [
          { id: 'fallback-property-0', name: 'Property 1' },
          { id: 'fallback-property-1', name: 'Property 2' },
          { id: 'fallback-property-2', name: 'Property 3' },
        ]

  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const expenseDate = new Date(
      today.getFullYear(),
      today.getMonth() - monthOffset,
      Math.floor(Math.random() * 28) + 1
    )
    const property = propsToUse[monthOffset % propsToUse.length]
    const category = categories[Math.floor(Math.random() * categories.length)]
    const description =
      descriptions[category][Math.floor(Math.random() * descriptions[category].length)]
    const amount = Math.floor(Math.random() * 300) + 50

    expenses.push({
      id: `fallback-expense-${monthOffset}`,
      property_id: property.id,
      name: description,
      amount,
      date: expenseDate.toISOString().split('T')[0],
      expense_date: expenseDate.toISOString().split('T')[0], // schema compatibility
      category,
      is_recurring: false,
      recurring_frequency: null,
      recurring_start_date: null,
      recurring_end_date: null,
      created_at: expenseDate.toISOString(),
      updated_at: expenseDate.toISOString(),
    } as unknown as Expense)
  }

  return expenses
}
