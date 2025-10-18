<script setup lang="ts">
import type { RecurrentTransactionWithCategory } from '@/types/database'
import { formatRecurrenceFrequency } from '@/utils/recurrenceHelpers'
import { RecurrenceService } from '@/services/recurrenceService'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useI18n } from '@/composables/useI18n'

interface Props {
  recurrence: RecurrentTransactionWithCategory
}

interface Emits {
  edit: [id: string]
  delete: [id: string]
  toggleActive: [id: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const frequencyText = computed(() => formatRecurrenceFrequency(props.recurrence, t))

const nextOccurrence = computed(() => {
  const dates = RecurrenceService.calculateNextOccurrences(props.recurrence, 1)
  if (dates.length > 0) {
    return format(dates[0], 'dd/MM/yyyy', { locale: ptBR })
  }
  return t('recurrent.noNextDate')
})

const amountFormatted = computed(() => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(props.recurrence.amount)
})

const typeClass = computed(() => {
  return props.recurrence.type === 'income' ? 'text-green-600' : 'text-red-600'
})

const typeIcon = computed(() => {
  return props.recurrence.type === 'income' ? '↑' : '↓'
})

function handleEdit() {
  emit('edit', props.recurrence.id)
}

function handleDelete() {
  emit('delete', props.recurrence.id)
}

function handleToggleActive() {
  emit('toggleActive', props.recurrence.id)
}
</script>

<template>
  <div class="card p-4 hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-2">
          <span
            v-if="recurrence.category"
            class="text-2xl"
            :title="recurrence.category.name"
          >
            {{ recurrence.category.icon }}
          </span>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-gray-900">
                {{ recurrence.category?.name || t('common.uncategorized') }}
              </h3>
              <span
                v-if="!recurrence.is_active"
                class="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full"
              >
                {{ t('recurrent.paused') }}
              </span>
            </div>
            <p v-if="recurrence.description" class="text-sm text-gray-600 mt-1">
              {{ recurrence.description }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
          <div class="flex items-center gap-1">
            <span class="font-medium" :class="typeClass">
              {{ typeIcon }} {{ amountFormatted }}
            </span>
          </div>
          <div>{{ frequencyText }}</div>
          <div v-if="recurrence.requires_approval" class="text-amber-600">
            🔔 {{ t('recurrent.requiresApproval') }}
          </div>
          <div class="text-gray-500">
            {{ t('recurrent.nextOccurrence', { date: nextOccurrence }) }}
          </div>
        </div>

        <div v-if="recurrence.end_date" class="text-xs text-gray-500 mt-2">
          {{ t('recurrent.endsOn', { date: format(parseISO(recurrence.end_date), 'dd/MM/yyyy', { locale: ptBR }) }) }}
        </div>
      </div>

      <div class="flex items-center gap-2 ml-4">
        <button
          @click="handleToggleActive"
          class="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          :title="recurrence.is_active ? t('recurrent.pauseTooltip') : t('recurrent.resumeTooltip')"
        >
          {{ recurrence.is_active ? t('recurrent.pauseSymbol') : t('recurrent.resumeSymbol') }}
        </button>
        <button
          @click="handleEdit"
          class="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          :title="t('recurrent.editTooltip')"
        >
          {{ t('recurrent.editSymbol') }}
        </button>
        <button
          @click="handleDelete"
          class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          :title="t('recurrent.deleteTooltip')"
        >
          {{ t('recurrent.deleteSymbol') }}
        </button>
      </div>
    </div>
  </div>
</template>
