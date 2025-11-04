<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { useEventsStore } from '@/stores/events'
import type { Event } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { ptBR, enUS } from 'date-fns/locale'

const props = defineProps<{
  event: Event
  stats?: {
    transactionCount: number
    totalExpenses: number
    totalIncome: number
    balance: number
  }
}>()

const emit = defineEmits<{
  view: []
  edit: []
  delete: []
}>()

const { t, locale } = useI18n()
const eventsStore = useEventsStore()

const status = computed(() => eventsStore.getEventStatus(props.event))

const formattedDateRange = computed(() => {
  const startDate = format(parseISO(props.event.start_date), 'dd/MM/yyyy', {
    locale: ptBR,
  })

  if (props.event.end_date) {
    const endDate = format(parseISO(props.event.end_date), 'dd/MM/yyyy', {
      locale: ptBR,
    })
    return `${startDate} - ${endDate}`
  }

  return t('events.details.dateRangeOpen', { start: startDate })
})

const statusBadgeClass = computed(() => {
  switch (status.value) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'upcoming':
      return 'bg-blue-100 text-blue-800'
    case 'completed':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
</script>

<template>
  <div class="card hover:shadow-md transition-shadow cursor-pointer" @click="emit('view')">
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span v-if="event.icon" class="text-2xl">{{ event.icon }}</span>
          <h3 class="text-lg font-semibold text-gray-900">{{ event.name }}</h3>
        </div>
        <p class="text-sm text-gray-500">{{ formattedDateRange }}</p>
      </div>
      <span
        :class="['px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap', statusBadgeClass]"
      >
        {{ t(`events.status.${status}`) }}
      </span>
    </div>

    <p v-if="event.description" class="text-sm text-gray-600 mb-4 line-clamp-2">
      {{ event.description }}
    </p>

    <div v-if="stats" class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <p class="text-xs text-gray-500">{{ t('events.stats.totalIncome') }}</p>
        <p class="text-sm font-semibold text-green-600">{{ formatCurrency(stats.totalIncome) }}</p>
      </div>
      <div>
        <p class="text-xs text-gray-500">{{ t('events.stats.totalExpenses') }}</p>
        <p class="text-sm font-semibold text-red-600">{{ formatCurrency(stats.totalExpenses) }}</p>
      </div>
      <div>
        <p class="text-xs text-gray-500">{{ t('events.stats.balance') }}</p>
        <p
          :class="['text-sm font-semibold', stats.balance >= 0 ? 'text-green-600' : 'text-red-600']"
        >
          {{ formatCurrency(stats.balance) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-gray-500">{{ t('events.stats.transactions') }}</p>
        <p class="text-sm font-semibold text-gray-900">{{ stats.transactionCount }}</p>
      </div>
    </div>

    <div class="flex gap-2 pt-4 border-t border-gray-200">
      <button
        class="btn btn-secondary flex-1 text-sm"
        @click.stop="emit('edit')"
        :aria-label="t('events.editEvent')"
      >
        {{ t('common.edit') }}
      </button>
      <button
        class="btn text-red-600 hover:bg-red-50 text-sm"
        @click.stop="emit('delete')"
        :aria-label="t('events.deleteEvent')"
      >
        {{ t('common.delete') }}
      </button>
    </div>

    <!-- Color indicator -->
    <div
      class="absolute top-0 left-0 w-1 h-full rounded-l"
      :style="{ backgroundColor: event.color }"
    ></div>
  </div>
</template>

<style scoped>
.card {
  @apply relative;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
