import { supabase } from '@/lib/supabase'
import type {
  RecurrentTransactionWithCategory,
  PendingApprovalWithDetails,
  RecurrentTransactionInsert,
  RecurrentTransactionUpdate,
  UpcomingTransaction,
} from '@/types/database'
import { RecurrenceService } from '@/services/recurrenceService'
import { format } from 'date-fns'

export const useRecurrentTransactionsStore = defineStore('recurrent-transactions', () => {
  // State
  const recurrentTransactions = ref<RecurrentTransactionWithCategory[]>([])
  const pendingApprovals = ref<PendingApprovalWithDetails[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeRecurrences = computed(() => recurrentTransactions.value.filter((r) => r.is_active))

  const pendingCount = computed(
    () => pendingApprovals.value.filter((p) => p.is_approved === null).length
  )

  // Actions
  async function fetchRecurrentTransactions() {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('recurrent_transactions')
        .select('*, category:categories(*)')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      recurrentTransactions.value = (data || []) as RecurrentTransactionWithCategory[]
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao carregar transações recorrentes'
      console.error('Error fetching recurrent transactions:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchPendingApprovals() {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('pending_recurrent_approvals')
        .select('*, recurrent_transaction:recurrent_transactions(*, category:categories(*))')
        .is('is_approved', null)
        .order('scheduled_date', { ascending: true })

      if (fetchError) throw fetchError

      pendingApprovals.value = (data || []) as PendingApprovalWithDetails[]
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao carregar aprovações pendentes'
      console.error('Error fetching pending approvals:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createRecurrentTransaction(
    data: RecurrentTransactionInsert
  ): Promise<RecurrentTransactionWithCategory> {
    loading.value = true
    error.value = null

    try {
      const { data: result, error: insertError } = await supabase
        .from('recurrent_transactions')
        .insert(data as never)
        .select('*, category:categories(*)')
        .single()

      if (insertError) throw insertError
      if (!result) throw new Error('Failed to create recurrent transaction')

      const newRecurrence = result as RecurrentTransactionWithCategory
      recurrentTransactions.value.unshift(newRecurrence)

      return newRecurrence
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao criar transação recorrente'
      console.error('Error creating recurrent transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateRecurrentTransaction(
    id: string,
    data: RecurrentTransactionUpdate
  ): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('recurrent_transactions')
        .update(data as never)
        .eq('id', id)

      if (updateError) throw updateError

      // Refresh the list
      await fetchRecurrentTransactions()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao atualizar transação recorrente'
      console.error('Error updating recurrent transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteRecurrentTransaction(id: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('recurrent_transactions')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      recurrentTransactions.value = recurrentTransactions.value.filter((r) => r.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao excluir transação recorrente'
      console.error('Error deleting recurrent transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function toggleActive(id: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const recurrence = recurrentTransactions.value.find((r) => r.id === id)
      if (!recurrence) throw new Error('Recurrence not found')

      const { error: updateError } = await supabase
        .from('recurrent_transactions')
        .update({ is_active: !recurrence.is_active } as never)
        .eq('id', id)

      if (updateError) throw updateError

      // Update local state
      recurrence.is_active = !recurrence.is_active
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Erro ao alternar status da transação recorrente'
      console.error('Error toggling recurrent transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function approveTransaction(approvalId: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      await RecurrenceService.approvePendingTransaction(approvalId)

      // Remove from pending list
      pendingApprovals.value = pendingApprovals.value.filter((p) => p.id !== approvalId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao aprovar transação'
      console.error('Error approving transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function rejectTransaction(approvalId: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      await RecurrenceService.rejectPendingTransaction(approvalId)

      // Remove from pending list
      pendingApprovals.value = pendingApprovals.value.filter((p) => p.id !== approvalId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao rejeitar transação'
      console.error('Error rejecting transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Utility functions
  function getUpcomingTransactions(limit: number = 10): UpcomingTransaction[] {
    const upcoming: UpcomingTransaction[] = []

    for (const recurrence of activeRecurrences.value) {
      const dates = RecurrenceService.calculateNextOccurrences(recurrence, 5)

      for (const date of dates) {
        upcoming.push({
          recurrentTransactionId: recurrence.id,
          scheduledDate: format(date, 'yyyy-MM-dd'),
          amount: recurrence.amount,
          description: recurrence.description,
          type: recurrence.type,
          category: recurrence.category,
          requiresApproval: recurrence.requires_approval,
        })
      }
    }

    // Sort by date and limit
    return upcoming.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).slice(0, limit)
  }

  return {
    recurrentTransactions,
    pendingApprovals,
    loading,
    error,
    activeRecurrences,
    pendingCount,
    fetchRecurrentTransactions,
    fetchPendingApprovals,
    createRecurrentTransaction,
    updateRecurrentTransaction,
    deleteRecurrentTransaction,
    toggleActive,
    approveTransaction,
    rejectTransaction,
    getUpcomingTransactions,
  }
})
