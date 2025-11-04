<script setup lang="ts">
import type { TransactionWithCategory } from '@/stores/transactions'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  transaction: TransactionWithCategory
}>()

const emit = defineEmits<{
  edit: [transaction: TransactionWithCategory]
  delete: [transaction: TransactionWithCategory]
}>()

const { t } = useI18n()
const isExpanded = ref(false)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function getTypeBadgeColor(type: 'income' | 'expense'): string {
  return type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
}
</script>

<template>
  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <!-- Collapsed View -->
    <button
      @click="toggleExpanded"
      class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
    >
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <!-- Category Icon -->
        <div
          v-if="transaction.categories"
          class="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-semibold flex-shrink-0"
          :style="{ backgroundColor: transaction.categories.color }"
        >
          {{
            transaction.categories.icon ||
            transaction.categories.name.charAt(0).toUpperCase()
          }}
        </div>

        <!-- Category & Date -->
        <div class="flex-1 min-w-0">
          <p class="font-medium text-gray-900 truncate">
            {{ transaction.categories?.name || t('common.uncategorized') }}
            <span v-if="transaction.sub_categories" class="text-gray-500 text-sm font-normal">
              → {{ transaction.sub_categories.name }}
            </span>
          </p>
          <p class="text-sm text-gray-600">
            {{ formatDate(transaction.date) }}
          </p>
          <!-- Event Badge -->
          <div v-if="transaction.events" class="mt-1">
            <router-link
              :to="{ name: 'event-details', params: { id: transaction.event_id } }"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
              :style="{
                backgroundColor: transaction.events.color + '20',
                color: transaction.events.color,
              }"
              @click.stop
            >
              <span v-if="transaction.events.icon">{{ transaction.events.icon }}</span>
              <span>{{ transaction.events.name }}</span>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Amount & Chevron -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <span
          class="font-semibold"
          :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'"
        >
          {{ transaction.type === 'income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
        </span>
        <svg
          class="w-5 h-5 text-gray-400 transition-transform"
          :class="{ 'rotate-180': isExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    <!-- Expanded View -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-96 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="max-h-96 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="isExpanded" class="border-t border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
        <!-- Description -->
        <div v-if="transaction.description">
          <p class="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
            {{ t('transactions.description') }}
          </p>
          <p class="text-gray-900">{{ transaction.description }}</p>
        </div>

        <!-- Event (in expanded view) -->
        <div v-if="transaction.events">
          <p class="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
            {{ t('transactions.event') }}
          </p>
          <router-link
            :to="{ name: 'event-details', params: { id: transaction.event_id } }"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            :style="{
              backgroundColor: transaction.events.color + '20',
              color: transaction.events.color,
            }"
            @click.stop
          >
            <span v-if="transaction.events.icon" class="text-base">{{
              transaction.events.icon
            }}</span>
            <span>{{ transaction.events.name }}</span>
          </router-link>
        </div>

        <!-- Type Badge -->
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
            {{ t('transactions.type') }}
          </p>
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

        <!-- Action Buttons -->
        <div class="flex gap-2 pt-2">
          <button
            @click.stop="emit('edit', transaction)"
            class="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            {{ t('common.edit') }}
          </button>
          <button
            @click.stop="emit('delete', transaction)"
            class="flex-1 px-4 py-2 bg-white border border-red-300 rounded-lg text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
