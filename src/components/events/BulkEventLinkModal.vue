<script setup lang="ts">
import Modal from '@/components/common/Modal.vue'
import { useEventsStore } from '@/stores/events'
import { useI18n } from '@/composables/useI18n'
import type { TransactionWithCategory } from '@/stores/transactions'
import { formatCurrency, formatDate } from '@/utils/formatters'

const props = defineProps<{
  modelValue: boolean
  transactions: TransactionWithCategory[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const { t } = useI18n()
const eventsStore = useEventsStore()

// State
const selectedEventId = ref<string>('')
const linking = ref(false)
const error = ref<string | null>(null)

// Load events on mount
onMounted(async () => {
  if (eventsStore.events.length === 0) {
    await eventsStore.fetchEvents()
  }
})

// Validation
const canSubmit = computed(() => {
  return selectedEventId.value && props.transactions.length > 0 && !linking.value
})

// Handle submit
async function handleSubmit() {
  if (!canSubmit.value) return

  linking.value = true
  error.value = null

  try {
    const transactionIds = props.transactions.map((t) => t.id)
    const success = await eventsStore.bulkLinkTransactions(transactionIds, selectedEventId.value)

    if (success) {
      emit('success')
      handleClose()
    } else {
      error.value = 'Failed to link transactions to event'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred'
  } finally {
    linking.value = false
  }
}

// Handle close
function handleClose() {
  if (!linking.value) {
    selectedEventId.value = ''
    error.value = null
    emit('update:modelValue', false)
  }
}

// Calculate totals
const totalIncome = computed(() => {
  return props.transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
})

const totalExpenses = computed(() => {
  return props.transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
})

const balance = computed(() => totalIncome.value - totalExpenses.value)
</script>

<template>
  <Modal :model-value="modelValue" @update:model-value="handleClose" :title="t('transactions.bulkLinkTitle')" max-width="max-w-2xl">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Description -->
      <p class="text-gray-600">
        {{ t('transactions.bulkLinkDescription') }}
      </p>

      <!-- Summary -->
      <div class="bg-gray-50 rounded-lg p-4 space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-sm font-medium text-gray-700">{{
            t('transactions.selectedCount', { count: transactions.length })
          }}</span>
          <span class="text-sm text-gray-600">
            {{ transactions.length }} {{ transactions.length === 1 ? 'transaction' : 'transactions' }}
          </span>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-gray-600">{{ t('transactions.totalIncome') }}</span>
          <span class="text-green-600 font-medium">{{ formatCurrency(totalIncome) }}</span>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-gray-600">{{ t('transactions.totalExpenses') }}</span>
          <span class="text-red-600 font-medium">{{ formatCurrency(totalExpenses) }}</span>
        </div>
        <div class="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
          <span class="font-medium text-gray-900">{{ t('transactions.balance') }}</span>
          <span
            class="font-semibold"
            :class="balance >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            {{ formatCurrency(Math.abs(balance)) }}
          </span>
        </div>
      </div>

      <!-- Event Selection -->
      <div>
        <label for="event" class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('forms.transaction.event') }} <span class="text-red-500">*</span>
        </label>
        <select
          id="event"
          v-model="selectedEventId"
          class="input w-full"
          required
          :disabled="linking"
        >
          <option value="" disabled>{{ t('forms.transaction.eventPlaceholder') }}</option>
          <option v-for="event in eventsStore.events" :key="event.id" :value="event.id">
            <span v-if="event.icon">{{ event.icon }}</span>
            {{ event.name }}
            <span v-if="event.end_date">
              ({{ formatDate(event.start_date) }} - {{ formatDate(event.end_date) }})
            </span>
            <span v-else> ({{ t('events.openEnded') }}) </span>
          </option>
        </select>
      </div>

      <!-- Transaction List Preview -->
      <div class="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 sticky top-0">
            <tr class="border-b">
              <th class="text-left py-2 px-3 font-medium text-gray-700">{{ t('transactions.date') }}</th>
              <th class="text-left py-2 px-3 font-medium text-gray-700">{{ t('transactions.category') }}</th>
              <th class="text-right py-2 px-3 font-medium text-gray-700">{{ t('transactions.amount') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="transaction in transactions"
              :key="transaction.id"
              class="border-b hover:bg-gray-50"
            >
              <td class="py-2 px-3 text-gray-900">{{ formatDate(transaction.date) }}</td>
              <td class="py-2 px-3 text-gray-700">
                {{ transaction.categories?.name || t('common.uncategorized') }}
              </td>
              <td
                class="py-2 px-3 text-right font-medium"
                :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'"
              >
                {{ transaction.type === 'income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
        {{ error }}
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-2">
        <button
          type="submit"
          class="btn btn-primary flex-1"
          :disabled="!canSubmit"
          :class="{ 'opacity-50 cursor-not-allowed': !canSubmit }"
        >
          <span v-if="linking">{{ t('common.loading') }}</span>
          <span v-else>{{ t('events.actions.linkTransactions') }}</span>
        </button>
        <button
          type="button"
          @click="handleClose"
          class="btn btn-secondary flex-1"
          :disabled="linking"
        >
          {{ t('common.cancel') }}
        </button>
      </div>
    </form>
  </Modal>
</template>
