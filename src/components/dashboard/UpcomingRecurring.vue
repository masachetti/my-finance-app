<script setup lang="ts">
import { useRecurrentTransactionsStore } from '@/stores/recurrentTransactions'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const recurrentStore = useRecurrentTransactionsStore()
const router = useRouter()

// Fetch recurrent transactions on mount
onMounted(async () => {
  if (recurrentStore.recurrentTransactions.length === 0) {
    await recurrentStore.fetchRecurrentTransactions()
  }
})

const upcomingTransactions = computed(() => {
  return recurrentStore.getUpcomingTransactions(10)
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount)
}

function goToRecurrentTransactions() {
  router.push('/recurrent-transactions')
}
</script>

<template>
  <div v-if="upcomingTransactions.length > 0" class="card p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-gray-900">Próximas Transações Recorrentes</h2>
      <button
        @click="goToRecurrentTransactions"
        class="text-primary-600 hover:text-primary-700 text-sm font-medium"
      >
        Ver todas →
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200">
            <th class="text-left py-2 px-2 text-sm font-semibold text-gray-700">Data</th>
            <th class="text-left py-2 px-2 text-sm font-semibold text-gray-700">Categoria</th>
            <th class="text-left py-2 px-2 text-sm font-semibold text-gray-700">Descrição</th>
            <th class="text-right py-2 px-2 text-sm font-semibold text-gray-700">Valor</th>
            <th class="text-center py-2 px-2 text-sm font-semibold text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(transaction, index) in upcomingTransactions"
            :key="`${transaction.recurrentTransactionId}-${transaction.scheduledDate}-${index}`"
            class="border-b border-gray-100 hover:bg-gray-50"
          >
            <td class="py-3 px-2 text-sm text-gray-900">
              {{ format(parseISO(transaction.scheduledDate), 'dd/MM/yyyy', { locale: ptBR }) }}
            </td>
            <td class="py-3 px-2 text-sm">
              <div class="flex items-center gap-2">
                <span v-if="transaction.category">{{ transaction.category.icon }}</span>
                <span class="text-gray-900">{{ transaction.category?.name || 'Sem categoria' }}</span>
              </div>
            </td>
            <td class="py-3 px-2 text-sm text-gray-600">
              {{ transaction.description || '-' }}
            </td>
            <td
              class="py-3 px-2 text-sm text-right font-medium"
              :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'"
            >
              {{ transaction.type === 'income' ? '↑' : '↓' }} {{ formatCurrency(transaction.amount) }}
            </td>
            <td class="py-3 px-2 text-center">
              <span
                v-if="transaction.requiresApproval"
                class="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full"
                title="Requer aprovação"
              >
                🔔
              </span>
              <span
                v-else
                class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                title="Automático"
              >
                ✓
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
