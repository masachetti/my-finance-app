import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import { useTransactionsStore } from './transactions'
import currency from 'currency.js'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type Budget = Database['public']['Tables']['budgets']['Row']
type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
type BudgetUpdate = Database['public']['Tables']['budgets']['Update']
type Category = Database['public']['Tables']['categories']['Row']

// Extended budget with category details and spending info
export interface BudgetWithDetails extends Budget {
  categories: Category | null
  spent: number
  remaining: number
  percentage: number
}

export const useBudgetsStore = defineStore('budgets', () => {
  const budgets = ref<BudgetWithDetails[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentMonth = ref(format(new Date(), 'yyyy-MM'))

  const authStore = useAuthStore()
  const transactionsStore = useTransactionsStore()

  // Computed: Budget status helpers
  const totalBudgeted = computed(() => {
    return budgets.value.reduce((sum, b) => currency(sum).add(b.amount).value, 0)
  })

  const totalSpent = computed(() => {
    return budgets.value.reduce((sum, b) => currency(sum).add(b.spent).value, 0)
  })

  const totalRemaining = computed(() => {
    return currency(totalBudgeted.value).subtract(totalSpent.value).value
  })

  // Fetch budgets for a specific month
  async function fetchBudgets(month?: string) {
    const targetMonth = month || currentMonth.value
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('budgets')
        .select('*, categories(*)')
        .eq('month', targetMonth)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Enrich budgets with spending data
      const enrichedBudgets: BudgetWithDetails[] = (data || []).map((budget) => {
        const spent = transactionsStore.getCategoryExpensesForMonth(
          budget.category_id,
          targetMonth
        )
        const remaining = currency(budget.amount).subtract(spent).value
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

        return {
          ...budget,
          spent,
          remaining,
          percentage
        } as BudgetWithDetails
      })

      budgets.value = enrichedBudgets
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch budgets'
      console.error('Error fetching budgets:', err)
    } finally {
      loading.value = false
    }
  }

  // Create new budget
  async function createBudget(budgetData: Omit<BudgetInsert, 'user_id'>) {
    if (!authStore.user) {
      error.value = 'User not authenticated'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: insertError } = await supabase
        .from('budgets')
        .insert({
          ...budgetData,
          user_id: authStore.user.id
        })
        .select('*, categories(*)')
        .single()

      if (insertError) throw insertError

      if (data) {
        // Enrich with spending data
        const spent = transactionsStore.getCategoryExpensesForMonth(
          data.category_id,
          data.month
        )
        const remaining = currency(data.amount).subtract(spent).value
        const percentage = data.amount > 0 ? (spent / data.amount) * 100 : 0

        const enrichedBudget: BudgetWithDetails = {
          ...data,
          spent,
          remaining,
          percentage
        } as BudgetWithDetails

        budgets.value.push(enrichedBudget)
      }

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create budget'
      console.error('Error creating budget:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Update existing budget
  async function updateBudget(id: string, updates: BudgetUpdate) {
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select('*, categories(*)')
        .single()

      if (updateError) throw updateError

      if (data) {
        // Enrich with spending data
        const spent = transactionsStore.getCategoryExpensesForMonth(
          data.category_id,
          data.month
        )
        const remaining = currency(data.amount).subtract(spent).value
        const percentage = data.amount > 0 ? (spent / data.amount) * 100 : 0

        const enrichedBudget: BudgetWithDetails = {
          ...data,
          spent,
          remaining,
          percentage
        } as BudgetWithDetails

        const index = budgets.value.findIndex((b) => b.id === id)
        if (index !== -1) {
          budgets.value[index] = enrichedBudget
        }
      }

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update budget'
      console.error('Error updating budget:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete budget
  async function deleteBudget(id: string) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase.from('budgets').delete().eq('id', id)

      if (deleteError) throw deleteError

      budgets.value = budgets.value.filter((b) => b.id !== id)

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete budget'
      console.error('Error deleting budget:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // Get budget by ID
  function getBudgetById(id: string) {
    return budgets.value.find((b) => b.id === id)
  }

  // Change current month and refetch budgets
  async function changeMonth(month: string) {
    currentMonth.value = month
    await fetchBudgets(month)
  }

  // Navigate to next month
  async function nextMonth() {
    const [year, month] = currentMonth.value.split('-').map(Number)
    const nextDate = new Date(year, month, 1)
    const nextMonthStr = format(nextDate, 'yyyy-MM')
    await changeMonth(nextMonthStr)
  }

  // Navigate to previous month
  async function previousMonth() {
    const [year, month] = currentMonth.value.split('-').map(Number)
    const prevDate = new Date(year, month - 2, 1)
    const prevMonthStr = format(prevDate, 'yyyy-MM')
    await changeMonth(prevMonthStr)
  }

  // Refresh spending data for all budgets
  function refreshSpendingData() {
    budgets.value = budgets.value.map((budget) => {
      const spent = transactionsStore.getCategoryExpensesForMonth(
        budget.category_id,
        budget.month
      )
      const remaining = currency(budget.amount).subtract(spent).value
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

      return {
        ...budget,
        spent,
        remaining,
        percentage
      }
    })
  }

  return {
    // State
    budgets,
    loading,
    error,
    currentMonth,

    // Computed
    totalBudgeted,
    totalSpent,
    totalRemaining,

    // Actions
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetById,
    changeMonth,
    nextMonth,
    previousMonth,
    refreshSpendingData
  }
})
