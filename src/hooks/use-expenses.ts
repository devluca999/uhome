import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { withRetry } from '@/lib/retry'
import { calculateProjectedExpenses, getExpenseDate } from '@/lib/finance-calculations'
import type { Database } from '@/types/database'

type Expense = Database['public']['Tables']['expenses']['Row']
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

export function useExpenses(propertyId?: string) {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const normalizeExpenseRow = (row: any): Expense => {
    // DB may expose `expense_date` (canonical) or legacy `date` (UI expects `date`).
    const expenseDate = row?.expense_date ?? row?.date
    const name = row?.name ?? row?.description
    return {
      ...row,
      ...(expenseDate ? { date: expenseDate } : null),
      ...(name ? { name } : null),
    } as Expense
  }

  const toDbPayload = (data: ExpenseInsert | ExpenseUpdate): Record<string, any> => {
    const { date, name, ...rest } = data as any
    // Canonical columns in DB are `expense_date` + `description`; keep UI API using `date` + `name`.
    return {
      ...rest,
      ...(date !== undefined ? { expense_date: date } : null),
      ...(name !== undefined ? { description: name } : null),
    }
  }

  useEffect(() => {
    fetchExpenses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, user?.id])

  async function fetchExpenses() {
    try {
      setLoading(true)
      let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false })
      if (propertyId) {
        query = query.eq('property_id', propertyId)
      } else {
        if (!user?.id) {
          setExpenses([])
          return
        }
        const { data: ownedProperties, error: propError } = await supabase
          .from('properties')
          .select('id')
          .eq('owner_id', user.id)
        if (propError) throw propError
        const ownerPropertyIds = (ownedProperties ?? []).map(p => p.id)
        if (ownerPropertyIds.length === 0) {
          setExpenses([])
          return
        }
        query = query.in('property_id', ownerPropertyIds)
      }
      const { data, error: fetchError } = await withRetry(async () => {
        const res = await query
        return res
      })
      if (fetchError) throw fetchError
      setExpenses((data || []).map(normalizeExpenseRow))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createExpense(data: ExpenseInsert) {
    try {
      const payload = toDbPayload(data)
      const { data: newExpense, error: createError } = await supabase
        .from('expenses')
        .insert(payload)
        .select()
        .single()

      if (createError) throw createError

      const normalized = normalizeExpenseRow(newExpense)
      setExpenses(prev => [normalized, ...prev])
      return { data: normalized, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function updateExpense(id: string, data: ExpenseUpdate) {
    try {
      // Skip update for fallback expenses (they don't exist in database)
      if (id.startsWith('fallback-')) {
        // For fallback expenses, just update local state
        let updatedExpense: Expense | null = null
        setExpenses(prev => {
          const expense = prev.find(e => e.id === id)
          if (!expense) return prev
          updatedExpense = { ...expense, ...data } as Expense
          return prev.map(exp => (exp.id === id ? updatedExpense! : exp))
        })
        return { data: updatedExpense, error: null }
      }

      const payload = toDbPayload(data)
      const { data: updatedExpense, error: updateError } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const normalized = normalizeExpenseRow(updatedExpense)
      setExpenses(prev => prev.map(exp => (exp.id === id ? normalized : exp)))
      return { data: normalized, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  function getNextDueDate(expense: Expense): string {
    // Prefer explicit next_due_date when present, otherwise fall back to canonical expense date.
    if (expense.next_due_date) return expense.next_due_date
    return getExpenseDate(expense)
  }

  async function markExpensePaid(
    id: string,
    _scope: 'this' | 'future' | 'all' = 'all'
  ): Promise<{ data: Expense | null; error: Error | null }> {
    // Scope is reserved for future, more granular recurrence handling.
    // For MVP we treat all scopes the same.
    try {
      const target = expenses.find(e => e.id === id)
      if (!target) {
        return { data: null, error: new Error('Expense not found') }
      }

      // One-time expenses: simply mark as paid and clear next_due_date.
      if (!target.is_recurring) {
        return updateExpense(id, {
          status: 'paid',
          next_due_date: null,
        } as ExpenseUpdate)
      }

      // Recurring expenses: mark series as effectively advanced by bumping next_due_date.
      const currentDue = getNextDueDate(target)
      const baseDate = new Date(currentDue)

      const nextDate = new Date(baseDate)
      switch (target.recurring_frequency) {
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1)
          break
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3)
          break
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          break
        default: {
          // Fallback: if we have a custom interval, advance by that many days.
          const intervalDays = target.recurring_interval ?? 0
          if (intervalDays > 0) {
            nextDate.setDate(nextDate.getDate() + intervalDays)
          } else {
            // If we cannot determine a cadence, leave next_due_date unchanged.
            return updateExpense(id, {
              status: 'paid',
            } as ExpenseUpdate)
          }
        }
      }

      const nextDueStr = nextDate.toISOString().split('T')[0]

      return updateExpense(id, {
        status: 'paid',
        next_due_date: nextDueStr,
      } as ExpenseUpdate)
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  async function deleteExpense(id: string) {
    try {
      // Skip delete for fallback expenses (they don't exist in database)
      if (id.startsWith('fallback-')) {
        // For fallback expenses, just update local state
        setExpenses(prev => prev.filter(exp => exp.id !== id))
        return { error: null }
      }

      const { error: deleteError } = await supabase.from('expenses').delete().eq('id', id)

      if (deleteError) throw deleteError

      setExpenses(prev => prev.filter(exp => exp.id !== id))
      return { error: null }
    } catch (err) {
      const error = err as Error
      return { error }
    }
  }

  // Get recurring expenses
  const recurringExpenses = expenses.filter(e => e.is_recurring)

  // Get expenses by category
  const expensesByCategory = (category: Expense['category']) => {
    return expenses.filter(e => e.category === category)
  }

  // Get projected expenses from recurring (next N days)
  const getProjectedExpenses = (days: number = 30): number => {
    return calculateProjectedExpenses(expenses, days, propertyId ? { propertyId } : undefined)
  }

  // Get average monthly utility expenses for a property
  const getAverageMonthlyUtilities = (propertyId: string): number => {
    const utilitiesExpenses = expenses.filter(
      e => e.property_id === propertyId && e.category === 'utilities'
    )

    if (utilitiesExpenses.length === 0) return 0

    // Group expenses by month
    const expensesByMonth = new Map<string, number>()

    for (const expense of utilitiesExpenses) {
      const expenseDate = new Date(expense.date)
      const monthKey = `${expenseDate.getFullYear()}-${expenseDate.getMonth()}`

      if (expense.is_recurring && expense.recurring_frequency === 'monthly') {
        // For recurring monthly expenses, use the amount directly
        const existing = expensesByMonth.get(monthKey) || 0
        expensesByMonth.set(monthKey, existing + Number(expense.amount))
      } else {
        // For one-time expenses, add to the month they occurred
        const existing = expensesByMonth.get(monthKey) || 0
        expensesByMonth.set(monthKey, existing + Number(expense.amount))
      }
    }

    // Calculate average
    const totalAmount = Array.from(expensesByMonth.values()).reduce(
      (sum, amount) => sum + amount,
      0
    )
    const monthCount = expensesByMonth.size

    return monthCount > 0 ? totalAmount / monthCount : 0
  }

  return {
    expenses,
    recurringExpenses,
    loading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    expensesByCategory,
    getProjectedExpenses,
    getAverageMonthlyUtilities,
    getNextDueDate,
    markExpensePaid,
    refetch: fetchExpenses,
  }
}
