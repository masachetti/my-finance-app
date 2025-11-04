<script setup lang="ts">
import { useEventsStore } from '@/stores/events'
import { useI18n } from '@/composables/useI18n'
import { formatCurrency, formatDate } from '@/utils/formatters'
import type { Event } from '@/types/database'

const { t } = useI18n()
const eventsStore = useEventsStore()

// Load events on mount
onMounted(async () => {
  if (eventsStore.events.length === 0) {
    await eventsStore.fetchEvents()
  }
})

// Get active events (limit to 5)
const displayedEvents = computed(() => {
  return eventsStore.activeEvents.slice(0, 5)
})

// Get event stats for each active event
const eventsWithStats = computed(() => {
  return displayedEvents.value.map((event) => {
    const stats = eventsStore.getEventStats(event.id)
    const transactions = eventsStore.getEventTransactions(event.id).slice(0, 3) // Top 3 recent transactions
    return { event, stats, transactions }
  })
})
</script>

<template>
  <div class="card">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-gray-900">{{ t('dashboard.activeEvents') }}</h2>
      <router-link
        :to="{ name: 'events' }"
        class="text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        {{ t('dashboard.viewAllEvents') }} →
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="eventsStore.loading" class="text-center py-8">
      <p class="text-gray-500">{{ t('events.loadingEvents') }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="displayedEvents.length === 0" class="text-center py-8">
      <p class="text-gray-500">{{ t('dashboard.noActiveEvents') }}</p>
    </div>

    <!-- Events List -->
    <div v-else class="space-y-4">
      <div
        v-for="{ event, stats, transactions } in eventsWithStats"
        :key="event.id"
        class="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
      >
        <!-- Event Header -->
        <router-link :to="{ name: 'event-details', params: { id: event.id } }">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span
                class="text-2xl flex-shrink-0"
                :style="{ color: event.color }"
              >
                {{ event.icon || '📅' }}
              </span>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-900 truncate">{{ event.name }}</h3>
                <p class="text-xs text-gray-500">
                  {{ formatDate(event.start_date) }}
                  <span v-if="event.end_date">- {{ formatDate(event.end_date) }}</span>
                  <span v-else> - {{ t('events.openEnded') }}</span>
                </p>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p
                class="font-semibold"
                :class="stats.balance >= 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ formatCurrency(Math.abs(stats.balance)) }}
              </p>
              <p class="text-xs text-gray-500">
                {{ stats.transactionCount }} {{ stats.transactionCount === 1 ? 'transação' : 'transações' }}
              </p>
            </div>
          </div>
        </router-link>

        <!-- Quick Stats -->
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="bg-green-50 rounded px-3 py-2">
            <p class="text-xs text-green-700">{{ t('transactions.income') }}</p>
            <p class="text-sm font-semibold text-green-900">
              {{ formatCurrency(stats.totalIncome) }}
            </p>
          </div>
          <div class="bg-red-50 rounded px-3 py-2">
            <p class="text-xs text-red-700">{{ t('transactions.expenses') }}</p>
            <p class="text-sm font-semibold text-red-900">
              {{ formatCurrency(stats.totalExpenses) }}
            </p>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div v-if="transactions.length > 0" class="border-t border-gray-200 pt-3">
          <p class="text-xs text-gray-500 uppercase font-medium mb-2">
            {{ t('dashboard.recentTransactionsInEvent') }}
          </p>
          <div class="space-y-1">
            <div
              v-for="transaction in transactions"
              :key="transaction.id"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-gray-700 truncate flex-1">
                {{ transaction.categories?.name || t('common.uncategorized') }}
              </span>
              <span
                class="font-medium flex-shrink-0 ml-2"
                :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'"
              >
                {{ transaction.type === 'income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
