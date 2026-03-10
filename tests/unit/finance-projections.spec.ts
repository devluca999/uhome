import { describe, expect, it } from 'vitest'
import { calculateProjectedExpenses, calculateProjectedRentIncome } from '@/lib/finance-calculations'

type ExpenseRow = Parameters<typeof calculateProjectedExpenses>[0][number]

function expense(partial: Partial<ExpenseRow> & Pick<ExpenseRow, 'id' | 'property_id' | 'amount'>): ExpenseRow {
  return {
    id: partial.id,
    property_id: partial.property_id,
    name: partial.name ?? 'Expense',
    amount: partial.amount,
    category: partial.category ?? null,
    is_recurring: partial.is_recurring ?? false,
    recurring_frequency: partial.recurring_frequency ?? null,
    recurring_start_date: partial.recurring_start_date ?? null,
    recurring_end_date: partial.recurring_end_date ?? null,
    // date fields (schema supports expense_date or legacy date)
    expense_date: (partial as any).expense_date ?? (partial as any).date ?? '2026-03-01',
    date: (partial as any).date ?? (partial as any).expense_date ?? '2026-03-01',
    notes: (partial as any).notes ?? null,
    created_at: (partial as any).created_at ?? '2026-03-01T00:00:00Z',
    updated_at: (partial as any).updated_at ?? '2026-03-01T00:00:00Z',
  } as ExpenseRow
}

describe('calculateProjectedExpenses', () => {
  it('includes one-off expenses once when scheduled inside the window', () => {
    const now = new Date('2026-03-01T12:00:00')
    const expenses = [
      expense({
        id: 'e1',
        property_id: 'p1',
        amount: 120,
        is_recurring: false,
        expense_date: '2026-03-10',
      } as any),
      expense({
        id: 'e2',
        property_id: 'p1',
        amount: 999,
        is_recurring: false,
        expense_date: '2026-04-15', // outside 30-day window
      } as any),
    ]

    const total = calculateProjectedExpenses(expenses, 30, { propertyId: 'p1' }, undefined, now)
    expect(total).toBe(120)
  })

  it('counts recurring expenses by occurrences anchored to recurring_start_date', () => {
    const now = new Date('2026-03-01T09:00:00')
    const expenses = [
      expense({
        id: 'r1',
        property_id: 'p1',
        amount: 50,
        is_recurring: true,
        recurring_frequency: 'monthly',
        recurring_start_date: '2026-01-15',
      } as any),
    ]

    // Window: 2026-03-01..2026-03-31 inclusive => occurrences should include 2026-03-15 only (1 occurrence)
    const total = calculateProjectedExpenses(expenses, 30, { propertyId: 'p1' }, undefined, now)
    expect(total).toBe(50)
  })

  it('respects recurring_end_date and excludes schedules that ended before the window', () => {
    const now = new Date('2026-03-01T00:00:00')
    const expenses = [
      expense({
        id: 'r1',
        property_id: 'p1',
        amount: 80,
        is_recurring: true,
        recurring_frequency: 'monthly',
        recurring_start_date: '2025-12-01',
        recurring_end_date: '2026-02-28',
      } as any),
    ]

    const total = calculateProjectedExpenses(expenses, 30, { propertyId: 'p1' }, undefined, now)
    expect(total).toBe(0)
  })

  it('combines recurring and one-off expenses for the same window', () => {
    const now = new Date('2026-03-01T00:00:00')
    const expenses = [
      expense({
        id: 'r1',
        property_id: 'p1',
        amount: 40,
        is_recurring: true,
        recurring_frequency: 'monthly',
        recurring_start_date: '2026-03-01',
      } as any),
      expense({
        id: 'o1',
        property_id: 'p1',
        amount: 200,
        is_recurring: false,
        expense_date: '2026-03-20',
      } as any),
    ]

    const total = calculateProjectedExpenses(expenses, 30, { propertyId: 'p1' }, undefined, now)
    expect(total).toBe(240)
  })
})

describe('calculateProjectedRentIncome', () => {
  it('sums pending rent due inside the next N days', () => {
    const now = new Date('2026-03-01T12:00:00')
    const records = [
      { id: 'r1', property_id: 'p1', status: 'pending', amount: 1000, due_date: '2026-03-10' },
      { id: 'r2', property_id: 'p1', status: 'pending', amount: 1000, due_date: '2026-04-15' }, // outside 30 days
      { id: 'r3', property_id: 'p1', status: 'paid', amount: 999, due_date: '2026-03-05' }, // not pending
      { id: 'r4', property_id: 'p2', status: 'pending', amount: 777, due_date: '2026-03-12' }, // other property
    ] as any

    const total = calculateProjectedRentIncome(records, 30, { propertyId: 'p1' }, undefined, now)
    expect(total).toBe(1000)
  })
})

