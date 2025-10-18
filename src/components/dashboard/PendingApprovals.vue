<script setup lang="ts">
import { useRecurrentTransactionsStore } from '@/stores/recurrentTransactions'
import { useI18n } from '@/composables/useI18n'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const { t } = useI18n()
const recurrentStore = useRecurrentTransactionsStore()

// Fetch pending approvals on mount
onMounted(async () => {
  await recurrentStore.fetchPendingApprovals()
})

const pendingApprovals = computed(() =>
  recurrentStore.pendingApprovals.filter((p) => p.is_approved === null)
)

async function handleApprove(approvalId: string) {
  try {
    await recurrentStore.approveTransaction(approvalId)
  } catch (err) {
    console.error('Error approving transaction:', err)
  }
}

async function handleReject(approvalId: string) {
  try {
    await recurrentStore.rejectTransaction(approvalId)
  } catch (err) {
    console.error('Error rejecting transaction:', err)
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount)
}
</script>

<template>
  <div v-if="pendingApprovals.length > 0" class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-lg font-semibold text-amber-900 flex items-center gap-2">
        <span>🔔</span>
        {{ t('recurrent.pendingApprovalsTitle') }}
        <span class="bg-amber-200 text-amber-900 text-sm px-2 py-0.5 rounded-full">
          {{ pendingApprovals.length }}
        </span>
      </h3>
    </div>

    <div class="space-y-3">
      <div
        v-for="approval in pendingApprovals"
        :key="approval.id"
        class="bg-white rounded-lg p-3 sm:p-4 border border-amber-200"
      >
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span
                v-if="approval.recurrent_transaction?.category"
                class="text-xl flex-shrink-0"
              >
                {{ approval.recurrent_transaction.category.icon }}
              </span>
              <h4 class="font-medium text-gray-900 truncate">
                {{ approval.recurrent_transaction?.category?.name || t('common.uncategorized') }}
              </h4>
            </div>

            <div class="text-sm text-gray-600 space-y-1">
              <div v-if="approval.recurrent_transaction?.description" class="truncate">
                {{ approval.recurrent_transaction.description }}
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span
                  class="font-semibold whitespace-nowrap"
                  :class="approval.recurrent_transaction?.type === 'income' ? 'text-green-600' : 'text-red-600'"
                >
                  {{ approval.recurrent_transaction?.type === 'income' ? '↑' : '↓' }}
                  {{ formatCurrency(approval.recurrent_transaction?.amount || 0) }}
                </span>
                <span class="text-xs sm:text-sm">
                  {{ t('recurrent.scheduledFor', { date: format(parseISO(approval.scheduled_date), 'dd/MM/yyyy', { locale: ptBR }) }) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 self-end sm:self-auto flex-shrink-0">
            <button
              @click="handleApprove(approval.id)"
              class="flex-1 sm:flex-none px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
              :disabled="recurrentStore.loading"
            >
              {{ t('recurrent.approveButton') }}
            </button>
            <button
              @click="handleReject(approval.id)"
              class="flex-1 sm:flex-none px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              :disabled="recurrentStore.loading"
            >
              {{ t('recurrent.rejectButton') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
