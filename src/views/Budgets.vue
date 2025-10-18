<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Modal from '@/components/common/Modal.vue'
import BudgetForm from '@/components/forms/BudgetForm.vue'
import StatCard from '@/components/common/StatCard.vue'
import { useBudgetsStore } from '@/stores/budgets'
import { useTransactionsStore } from '@/stores/transactions'
import { formatCurrency, formatMonth } from '@/utils/formatters'
import type { Database } from '@/types/database'
import type { BudgetWithDetails } from '@/stores/budgets'
import { useI18n } from '@/composables/useI18n'

type BudgetInsert = Database['public']['Tables']['budgets']['Insert']

const { t } = useI18n()

const budgetsStore = useBudgetsStore()
const transactionsStore = useTransactionsStore()

// Modal state
const showModal = ref(false)
const editingBudget = ref<BudgetWithDetails | null>(null)
const showDeleteConfirm = ref(false)
const budgetToDelete = ref<BudgetWithDetails | null>(null)

// Load data on mount
onMounted(async () => {
  await transactionsStore.fetchTransactions()
  await budgetsStore.fetchBudgets()
})

// Watch for transaction changes and refresh budget spending data
watch(
  () => transactionsStore.transactions.length,
  () => {
    budgetsStore.refreshSpendingData()
  }
)

// Modal handlers
function handleAddBudget() {
  editingBudget.value = null
  showModal.value = true
}

function handleEditBudget(budget: BudgetWithDetails) {
  editingBudget.value = budget
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingBudget.value = null
}

// CRUD operations
async function handleSubmit(data: Omit<BudgetInsert, 'user_id'>) {
  if (editingBudget.value) {
    // Update existing budget
    const success = await budgetsStore.updateBudget(editingBudget.value.id, data)
    if (success) {
      closeModal()
    }
  } else {
    // Create new budget
    const success = await budgetsStore.createBudget(data)
    if (success) {
      closeModal()
    }
  }
}

function confirmDelete(budget: BudgetWithDetails) {
  budgetToDelete.value = budget
  showDeleteConfirm.value = true
}

function cancelDelete() {
  budgetToDelete.value = null
  showDeleteConfirm.value = false
}

async function handleDelete() {
  if (budgetToDelete.value) {
    const success = await budgetsStore.deleteBudget(budgetToDelete.value.id)
    if (success) {
      cancelDelete()
    }
  }
}

// Month navigation
async function handlePreviousMonth() {
  await budgetsStore.previousMonth()
}

async function handleNextMonth() {
  await budgetsStore.nextMonth()
}

// Modal title
const modalTitle = computed(() => {
  return editingBudget.value ? t('budgets.editBudget') : t('budgets.addBudget')
})

const submitLabel = computed(() => {
  return editingBudget.value ? t('common.update') : t('common.create')
})

// Get progress bar color based on percentage
function getProgressBarColor(percentage: number): string {
  if (percentage >= 100) return 'bg-red-500'
  if (percentage >= 80) return 'bg-amber-500'
  return 'bg-green-500'
}

// Get status badge
function getStatusBadge(percentage: number): { text: string; color: string } {
  if (percentage >= 100) {
    return { text: t('budgets.overBudget'), color: 'bg-red-100 text-red-800' }
  }
  if (percentage >= 80) {
    return { text: t('budgets.nearLimit'), color: 'bg-amber-100 text-amber-800' }
  }
  return { text: t('budgets.onTrack'), color: 'bg-green-100 text-green-800' }
}
</script>

<template>
  <AppLayout>
    <PageHeader
      :title="t('budgets.title')"
      :subtitle="t('budgets.subtitle')"
      :action-label="t('budgets.addBudget')"
      @action="handleAddBudget"
    />

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <StatCard
        :label="t('budgets.totalBudgeted')"
        :value="formatCurrency(budgetsStore.totalBudgeted)"
      />
      <StatCard
        :label="t('budgets.totalSpent')"
        :value="formatCurrency(budgetsStore.totalSpent)"
        :color="budgetsStore.totalSpent > budgetsStore.totalBudgeted ? 'red' : 'default'"
      />
      <StatCard
        :label="t('budgets.totalRemaining')"
        :value="formatCurrency(budgetsStore.totalRemaining)"
        :color="budgetsStore.totalRemaining >= 0 ? 'green' : 'red'"
      />
    </div>

    <!-- Month Navigation -->
    <div class="card mb-6">
      <div class="flex items-center justify-between">
        <button
          @click="handlePreviousMonth"
          class="p-2 text-gray-600 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100"
          :aria-label="t('budgets.previousMonthAriaLabel')"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h2 class="text-xl font-semibold text-gray-900">
          {{ formatMonth(budgetsStore.currentMonth) }}
        </h2>

        <button
          @click="handleNextMonth"
          class="p-2 text-gray-600 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100"
          :aria-label="t('budgets.nextMonthAriaLabel')"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="budgetsStore.loading" class="text-center py-12">
      <p class="text-gray-500">{{ t('budgets.loadingBudgets') }}</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="budgetsStore.error"
      class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"
    >
      {{ budgetsStore.error }}
    </div>

    <!-- Empty State -->
    <EmptyState v-else-if="budgetsStore.budgets.length === 0" :message="t('budgets.noBudgets')" />

    <!-- Budgets List -->
    <div v-else class="space-y-3 sm:space-y-4">
      <div
        v-for="budget in budgetsStore.budgets"
        :key="budget.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-4">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div
              v-if="budget.categories"
              class="w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center text-white text-lg font-semibold"
              :style="{ backgroundColor: budget.categories.color }"
            >
              {{ budget.categories.icon || budget.categories.name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 truncate">
                {{ budget.categories?.name || t('budgets.unknownCategory') }}
              </h3>
              <span
                :class="[
                  'inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1',
                  getStatusBadge(budget.percentage).color,
                ]"
              >
                {{ getStatusBadge(budget.percentage).text }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button
              @click="handleEditBudget(budget)"
              class="p-2 sm:p-2 text-gray-600 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100"
              :aria-label="t('budgets.editBudgetAriaLabel')"
            >
              <svg class="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              @click="confirmDelete(budget)"
              class="p-2 sm:p-2 text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
              :aria-label="t('budgets.deleteBudgetAriaLabel')"
            >
              <svg class="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mb-3">
          <div class="flex justify-between text-sm mb-2 gap-2">
            <span class="text-gray-600 truncate">
              {{ formatCurrency(budget.spent) }} {{ t('budgets.spentLabel') }}
            </span>
            <span class="text-gray-600 whitespace-nowrap">
              {{ formatCurrency(budget.amount) }} {{ t('budgets.limitLabel') }}
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              :class="[
                'h-full transition-all duration-300',
                getProgressBarColor(budget.percentage),
              ]"
              :style="{ width: `${Math.min(budget.percentage, 100)}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-sm mt-2 gap-2">
            <span
              class="font-semibold truncate"
              :class="budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ formatCurrency(Math.abs(budget.remaining)) }}
              {{ budget.remaining >= 0 ? t('budgets.remainingLabel') : t('budgets.overLabel') }}
            </span>
            <span class="text-gray-600 font-medium whitespace-nowrap"> {{ Math.round(budget.percentage) }}% </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="modalTitle" max-width="max-w-lg">
      <BudgetForm
        :initial-data="
          editingBudget
            ? {
                category_id: editingBudget.category_id,
                amount: editingBudget.amount,
                month: editingBudget.month,
              }
            : { month: budgetsStore.currentMonth }
        "
        :submit-label="submitLabel"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteConfirm" :title="t('budgets.deleteTitle')" max-width="max-w-sm">
      <div class="space-y-4">
        <p class="text-gray-700">
          {{ t('budgets.deleteConfirmation') }}
        </p>
        <div v-if="budgetToDelete" class="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
          <p>
            <strong>{{ t('budgets.category') }}:</strong>
            {{ budgetToDelete.categories?.name || t('budgets.unknownCategory') }}
          </p>
          <p>
            <strong>{{ t('budgets.budget') }}:</strong> {{ formatCurrency(budgetToDelete.amount) }}
          </p>
          <p>
            <strong>{{ t('budgets.month') }}:</strong> {{ formatMonth(budgetToDelete.month) }}
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
