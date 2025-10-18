<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useTransactionsStore } from '@/stores/transactions'
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatCard from '@/components/common/StatCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import currency from 'currency.js'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const authStore = useAuthStore()
const transactionsStore = useTransactionsStore()

// Fetch transactions on mount
onMounted(async () => {
  await transactionsStore.fetchTransactions()
})

// Get current month date range
const currentDate = new Date()
const currentMonthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
const currentMonthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd')

// Filter transactions for current month
const currentMonthTransactions = computed(() => {
  return transactionsStore.transactions.filter((t) => {
    return t.date >= currentMonthStart && t.date <= currentMonthEnd
  })
})

// Calculate current month income
const currentMonthIncome = computed(() => {
  return currentMonthTransactions.value
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => currency(sum).add(t.amount).value, 0)
})

// Calculate current month expenses
const currentMonthExpenses = computed(() => {
  return currentMonthTransactions.value
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => currency(sum).add(t.amount).value, 0)
})

// Calculate total balance (all-time)
const totalBalance = computed(() => {
  return transactionsStore.balance
})

// Get recent transactions (last 5)
const recentTransactions = computed(() => {
  return transactionsStore.transactions.slice(0, 5)
})

// Get transaction type badge color
function getTypeBadgeColor(type: 'income' | 'expense'): string {
  return type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
}
</script>

<template>
  <AppLayout>
    <PageHeader
      :title="t('dashboard.title')"
      :subtitle="`${t('dashboard.welcomeBack')}, ${authStore.user?.email}`"
    />

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard
        :label="t('dashboard.totalBalance')"
        :value="formatCurrency(totalBalance)"
        :color="totalBalance >= 0 ? 'green' : 'red'"
      />
      <StatCard
        :label="t('dashboard.thisMonthIncome')"
        :value="formatCurrency(currentMonthIncome)"
        color="green"
      />
      <StatCard
        :label="t('dashboard.thisMonthExpenses')"
        :value="formatCurrency(currentMonthExpenses)"
        color="red"
      />
    </div>

    <div class="card">
      <h3 class="text-lg font-semibold mb-4">{{ t('dashboard.recentTransactions') }}</h3>

      <!-- Loading State -->
      <div v-if="transactionsStore.loading" class="text-center py-8">
        <p class="text-gray-500">{{ t('dashboard.loadingTransactions') }}</p>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="recentTransactions.length === 0"
        :message="t('dashboard.noTransactions')"
      />

      <!-- Recent Transactions List -->
      <div v-else class="space-y-3">
        <div
          v-for="transaction in recentTransactions"
          :key="transaction.id"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center gap-3 flex-1">
            <!-- Category Icon -->
            <div
              v-if="transaction.categories"
              class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              :style="{ backgroundColor: transaction.categories.color }"
            >
              {{
                transaction.categories.icon || transaction.categories.name.charAt(0).toUpperCase()
              }}
            </div>

            <!-- Transaction Details -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900">
                {{ transaction.categories?.name || t('common.uncategorized') }}
              </p>
              <p class="text-sm text-gray-500 truncate">
                {{ transaction.description || t('common.noDescription') }}
              </p>
            </div>

            <!-- Date -->
            <div class="text-right flex-shrink-0 mr-4">
              <p class="text-sm text-gray-600">{{ formatDate(transaction.date) }}</p>
              <span
                :class="[
                  'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                  getTypeBadgeColor(transaction.type),
                ]"
              >
                {{
                  transaction.type === 'income'
                    ? t('forms.transaction.income')
                    : t('forms.transaction.expense')
                }}
              </span>
            </div>
          </div>

          <!-- Amount -->
          <div
            class="text-right font-semibold flex-shrink-0"
            :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'"
          >
            {{ transaction.type === 'income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
          </div>
        </div>

        <!-- View All Link -->
        <div class="pt-3 border-t">
          <RouterLink
            to="/transactions"
            class="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center justify-center gap-1"
          >
            {{ t('dashboard.viewAllTransactions') }}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </RouterLink>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
