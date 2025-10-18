<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Modal from '@/components/common/Modal.vue'
import TransactionForm from '@/components/forms/TransactionForm.vue'
import StatCard from '@/components/common/StatCard.vue'
import TransactionAccordionRow from '@/components/common/TransactionAccordionRow.vue'
import { useTransactionsStore } from '@/stores/transactions'
import { formatCurrency, formatDate } from '@/utils/formatters'
import type { Database } from '@/types/database'
import type { TransactionWithCategory } from '@/stores/transactions'
import { useI18n } from '@/composables/useI18n'

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

const { t } = useI18n()
const transactionsStore = useTransactionsStore()

// Modal state
const showModal = ref(false)
const editingTransaction = ref<TransactionWithCategory | null>(null)
const showDeleteConfirm = ref(false)
const transactionToDelete = ref<TransactionWithCategory | null>(null)

// Filter state
const filterType = ref<'all' | 'income' | 'expense'>('all')

// Load transactions on mount
onMounted(async () => {
  await transactionsStore.fetchTransactions()
})

// Filtered transactions
const filteredTransactions = computed(() => {
  if (filterType.value === 'all') return transactionsStore.transactions
  return transactionsStore.transactions.filter((t) => t.type === filterType.value)
})

// Modal handlers
function handleAddTransaction() {
  editingTransaction.value = null
  showModal.value = true
}

function handleEditTransaction(transaction: TransactionWithCategory) {
  editingTransaction.value = transaction
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingTransaction.value = null
}

// CRUD operations
async function handleSubmit(data: Omit<TransactionInsert, 'user_id'>) {
  if (editingTransaction.value) {
    // Update existing transaction
    const success = await transactionsStore.updateTransaction(editingTransaction.value.id, data)
    if (success) {
      closeModal()
    }
  } else {
    // Create new transaction
    const success = await transactionsStore.createTransaction(data)
    if (success) {
      closeModal()
    }
  }
}

function confirmDelete(transaction: TransactionWithCategory) {
  transactionToDelete.value = transaction
  showDeleteConfirm.value = true
}

function cancelDelete() {
  transactionToDelete.value = null
  showDeleteConfirm.value = false
}

async function handleDelete() {
  if (transactionToDelete.value) {
    const success = await transactionsStore.deleteTransaction(transactionToDelete.value.id)
    if (success) {
      cancelDelete()
    }
  }
}

// Modal title
const modalTitle = computed(() => {
  return editingTransaction.value
    ? t('transactions.editTransaction')
    : t('transactions.addTransaction')
})

const submitLabel = computed(() => {
  return editingTransaction.value ? t('common.update') : t('common.create')
})

// Get transaction type badge color
function getTypeBadgeColor(type: 'income' | 'expense'): string {
  return type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
}
</script>

<template>
  <AppLayout>
    <PageHeader
      :title="t('transactions.title')"
      :subtitle="t('transactions.subtitle')"
      :action-label="t('transactions.addTransaction')"
      @action="handleAddTransaction"
    />

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <StatCard
        :label="t('transactions.totalIncome')"
        :value="formatCurrency(transactionsStore.totalIncome)"
        color="green"
      />
      <StatCard
        :label="t('transactions.totalExpenses')"
        :value="formatCurrency(transactionsStore.totalExpenses)"
        color="red"
      />
      <StatCard
        :label="t('transactions.balance')"
        :value="formatCurrency(transactionsStore.balance)"
        :color="transactionsStore.balance >= 0 ? 'green' : 'red'"
      />
    </div>

    <!-- Filter Tabs -->
    <div class="card mb-6">
      <div class="flex gap-2 border-b overflow-x-auto">
        <button
          @click="filterType = 'all'"
          :class="[
            'px-4 py-3 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
            filterType === 'all'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900',
          ]"
        >
          {{ t('transactions.allTransactions') }}
        </button>
        <button
          @click="filterType = 'income'"
          :class="[
            'px-4 py-3 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
            filterType === 'income'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900',
          ]"
        >
          {{ t('transactions.income') }}
        </button>
        <button
          @click="filterType = 'expense'"
          :class="[
            'px-4 py-3 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
            filterType === 'expense'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900',
          ]"
        >
          {{ t('transactions.expenses') }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="transactionsStore.loading" class="text-center py-12">
      <p class="text-gray-500">{{ t('transactions.loadingTransactions') }}</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="transactionsStore.error"
      class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"
    >
      {{ transactionsStore.error }}
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="filteredTransactions.length === 0"
      :message="
        filterType === 'all'
          ? t('transactions.noTransactions')
          : filterType === 'income'
            ? t('transactions.noIncomeTransactions')
            : t('transactions.noExpenseTransactions')
      "
    />

    <!-- Mobile Accordion View -->
    <template v-else>
      <div class="md:hidden space-y-3">
        <TransactionAccordionRow
          v-for="transaction in filteredTransactions"
          :key="transaction.id"
          :transaction="transaction"
          @edit="handleEditTransaction"
          @delete="confirmDelete"
        />
      </div>

      <!-- Desktop Table View -->
      <div class="hidden md:block card">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-3 px-4 font-semibold text-gray-900">
                  {{ t('transactions.date') }}
                </th>
                <th class="text-left py-3 px-4 font-semibold text-gray-900">
                  {{ t('transactions.category') }}
                </th>
                <th class="text-left py-3 px-4 font-semibold text-gray-900">
                  {{ t('transactions.description') }}
                </th>
                <th class="text-left py-3 px-4 font-semibold text-gray-900">
                  {{ t('transactions.type') }}
                </th>
                <th class="text-right py-3 px-4 font-semibold text-gray-900">
                  {{ t('transactions.amount') }}
                </th>
                <th class="text-right py-3 px-4 font-semibold text-gray-900">
                  {{ t('common.actions') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="transaction in filteredTransactions"
                :key="transaction.id"
                class="border-b hover:bg-gray-50 transition-colors"
              >
                <!-- Date -->
                <td class="py-4 px-4 text-gray-900">
                  {{ formatDate(transaction.date) }}
                </td>

                <!-- Category -->
                <td class="py-4 px-4">
                  <div class="flex items-center gap-2">
                    <div
                      v-if="transaction.categories"
                      class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      :style="{ backgroundColor: transaction.categories.color }"
                    >
                      {{
                        transaction.categories.icon ||
                        transaction.categories.name.charAt(0).toUpperCase()
                      }}
                    </div>
                    <span class="text-gray-900">
                      {{ transaction.categories?.name || t('common.uncategorized') }}
                    </span>
                  </div>
                </td>

                <!-- Description -->
                <td class="py-4 px-4 text-gray-600">
                  {{ transaction.description || '-' }}
                </td>

                <!-- Type -->
                <td class="py-4 px-4">
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
                </td>

                <!-- Amount -->
                <td
                  class="py-4 px-4 text-right font-semibold"
                  :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'"
                >
                  {{ transaction.type === 'income' ? '+' : '-'
                  }}{{ formatCurrency(transaction.amount) }}
                </td>

                <!-- Actions -->
                <td class="py-4 px-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      @click="handleEditTransaction(transaction)"
                      class="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                      :aria-label="t('transactions.editAriaLabel')"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      @click="confirmDelete(transaction)"
                      class="p-2 text-gray-600 hover:text-red-600 transition-colors"
                      :aria-label="t('transactions.deleteAriaLabel')"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="modalTitle" max-width="max-w-lg">
      <TransactionForm
        :initial-data="
          editingTransaction
            ? {
                category_id: editingTransaction.category_id,
                amount: editingTransaction.amount,
                description: editingTransaction.description,
                date: editingTransaction.date,
                type: editingTransaction.type,
              }
            : undefined
        "
        :submit-label="submitLabel"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteConfirm" :title="t('transactions.deleteTitle')" max-width="max-w-sm">
      <div class="space-y-4">
        <p class="text-gray-700">
          {{ t('transactions.deleteConfirmation') }}
        </p>
        <div v-if="transactionToDelete" class="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
          <p>
            <strong>{{ t('transactions.amount') }}:</strong>
            {{ formatCurrency(transactionToDelete.amount) }}
          </p>
          <p>
            <strong>{{ t('transactions.category') }}:</strong>
            {{ transactionToDelete.categories?.name || t('common.uncategorized') }}
          </p>
          <p>
            <strong>{{ t('transactions.date') }}:</strong>
            {{ formatDate(transactionToDelete.date) }}
          </p>
        </div>
        <div class="flex gap-3 pt-2">
          <button @click="handleDelete" class="btn btn-primary bg-red-600 flex-1">
            {{ t('common.delete') }}
          </button>
          <button @click="cancelDelete" class="btn btn-secondary flex-1">
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </Modal>
  </AppLayout>
</template>
