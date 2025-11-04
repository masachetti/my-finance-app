<script setup lang="ts">
import type { EventStats } from '@/types/database'
import StatCard from '@/components/common/StatCard.vue'
import { useI18n } from '@/composables/useI18n'

defineProps<{
  stats: EventStats
}>()

const { t, locale } = useI18n()

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard
      :label="t('events.stats.totalIncome')"
      :value="formatCurrency(stats.totalIncome)"
      value-color="green"
    />
    <StatCard
      :label="t('events.stats.totalExpenses')"
      :value="formatCurrency(stats.totalExpenses)"
      value-color="red"
    />
    <StatCard
      :label="t('events.stats.balance')"
      :value="formatCurrency(stats.balance)"
      :value-color="stats.balance >= 0 ? 'green' : 'red'"
    />
    <StatCard
      :label="t('events.stats.transactions')"
      :value="stats.transactionCount.toString()"
      value-color="default"
    />
  </div>

  <!-- Category Breakdown -->
  <div v-if="stats.categoryBreakdown.length > 0" class="card mt-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">
      {{ t('events.details.breakdown') }}
    </h3>
    <div class="space-y-3">
      <div
        v-for="item in stats.categoryBreakdown"
        :key="item.category.id"
        class="flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.category.color }"></div>
          <span class="text-sm text-gray-700">{{ item.category.name }}</span>
        </div>
        <span class="text-sm font-semibold text-gray-900">{{ formatCurrency(item.total) }}</span>
      </div>
    </div>
  </div>
</template>
