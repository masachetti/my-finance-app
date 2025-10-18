import { RecurrenceService } from '@/services/recurrenceService'
import { useRecurrentTransactionsStore } from '@/stores/recurrentTransactions'

/**
 * Composable for automatic recurrence processing
 * Automatically processes recurrences on mount and periodically
 */
export function useRecurrenceProcessor() {
  const recurrentStore = useRecurrentTransactionsStore()
  const processing = ref(false)
  const lastProcessed = ref<Date | null>(null)

  async function processRecurrences() {
    if (processing.value) return

    processing.value = true

    try {
      await RecurrenceService.processRecurrences()

      // Refresh stores after processing
      await Promise.all([
        recurrentStore.fetchPendingApprovals(),
        // Note: Transactions store will be refreshed by parent component if needed
      ])

      lastProcessed.value = new Date()
    } catch (err) {
      console.error('Error processing recurrences:', err)
    } finally {
      processing.value = false
    }
  }

  // Auto-process on mount
  onMounted(() => {
    processRecurrences()
  })

  // Set up periodic check (every 30 minutes)
  const intervalId = setInterval(() => {
    processRecurrences()
  }, 30 * 60 * 1000)

  onUnmounted(() => {
    clearInterval(intervalId)
  })

  return {
    processRecurrences,
    processing,
    lastProcessed
  }
}
