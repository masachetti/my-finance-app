import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import currency from 'currency.js'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
type Category = Database['public']['Tables']['categories']['Row']

// Extended transaction with category details
export interface TransactionWithCategory extends Transaction {
  categories: Category | null
}

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<TransactionWithCategory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()

  // Computed: Filter by type
  const incomeTransactions = computed(() =>
    transactions.value.filter((t) => t.type === 'income')
  )

  const expenseTransactions = computed(() =>
    transactions.value.filter((t) => t.type === 'expense')
  )

  // Computed: Calculate totals
  const totalIncome = computed(() => {
    return incomeTransactions.value.reduce(
      (sum, t) => currency(sum).add(t.amount).value,
      0
    )
  })

  const totalExpenses = computed(() => {
    return expenseTransactions.value.reduce(
      (sum, t) => currency(sum).add(t.amount).value,
      0
    )
  })

  const balance = computed(() => {
    return currency(totalIncome.value).subtract(totalExpenses.value).value
  })

  // Fetch all transactions for authenticated user
  async function fetchTransactions() {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .order('date', { ascending: false })

      if (fetchError) throw fetchError

      transactions.value = (data as TransactionWithCategory[]) || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch transactions'
      console.error('Error fetching transactions:', err)
    } finally {
      loading.value = false
    }
  }

  // Fetch transactions for a specific date range
  async function fetchTransactionsByDateRange(startDate: string, endDate: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (fetchError) throw fetchError

      transactions.value = (data as TransactionWithCategory[]) || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch transactions'
      console.error('Error fetching transactions:', err)
    } finally {
      loading.value = false
    }
  }

  // Create new transaction
  async function createTransaction(transactionData: Omit<TransactionInsert, 'user_id'>) {
    if (!authStore.user) {
      error.value = 'User not authenticated'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          user_id: authStore.user.id
        })
        .select('*, categories(*)')
        .single()

      if (insertError) throw insertError

      if (data) {
        transactions.value.unshift(data as TransactionWithCategory)
      }

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create transaction'
      console.error('Error creating transaction:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Update existing transaction
  async function updateTransaction(id: string, updates: TransactionUpdate) {
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select('*, categories(*)')
        .single()

      if (updateError) throw updateError

      if (data) {
        const index = transactions.value.findIndex((t) => t.id === id)
        if (index !== -1) {
          transactions.value[index] = data as TransactionWithCategory
        }
      }

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update transaction'
      console.error('Error updating transaction:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete transaction
  async function deleteTransaction(id: string) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      transactions.value = transactions.value.filter((t) => t.id !== id)

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete transaction'
      console.error('Error deleting transaction:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // Get transaction by ID
  function getTransactionById(id: string) {
    return transactions.value.find((t) => t.id === id)
  }

  // Get transactions for a specific month
  function getTransactionsByMonth(month: string) {
    return transactions.value.filter((t) => t.date.startsWith(month))
  }

  // Calculate total expenses for a category in a specific month
  function getCategoryExpensesForMonth(categoryId: string, month: string) {
    return transactions.value
      .filter(
        (t) =>
          t.category_id === categoryId && t.type === 'expense' && t.date.startsWith(month)
      )
      .reduce((sum, t) => currency(sum).add(t.amount).value, 0)
  }

  return {
    // State
    transactions,
    loading,
    error,

    // Computed
    incomeTransactions,
    expenseTransactions,
    totalIncome,
    totalExpenses,
    balance,

    // Actions
    fetchTransactions,
    fetchTransactionsByDateRange,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionById,
    getTransactionsByMonth,
    getCategoryExpensesForMonth
  }
})
