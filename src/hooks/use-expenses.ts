import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { withRetry } from '@/lib/retry'
import type { Database } from '@/types/database'

type Expense = Database['public']['Tables']['expenses']['Row']
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

export function useExpenses(propertyId?: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchExpenses()
  }, [propertyId])

  async function fetchExpenses() {
    try {
      setLoading(true)
      let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false })
      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }
      const { data, error: fetchError } = await withRetry(async () => {
        const res = await query
        return res
      })
      if (fetchError) throw fetchError
      setExpenses(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createExpense(data: ExpenseInsert) {
    try {
      const { data: newExpense, error: createError } = await supabase
        .from('expenses')
        .insert(data)
        .select()
        .single()

      if (createError) throw createError

      setExpenses(prev => [newExpense, ...prev])
      return { data: newExpense, error: null }
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

      const { data: updatedExpense, error: updateError } = await supabase
        .from('expenses')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setExpenses(prev => prev.map(exp => (exp.id === id ? updatedExpense : exp)))
      return { data: updatedExpense, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
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
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + days)

    let projected = 0

    for (const expense of recurringExpenses) {
      if (!expense.recurring_frequency || !expense.recurring_start_date) {
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
    refetch: fetchExpenses,
  }
}
