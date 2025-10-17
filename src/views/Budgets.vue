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

type BudgetInsert = Database['public']['Tables']['budgets']['Insert']

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
  return editingBudget.value ? 'Edit Budget' : 'Add Budget'
})

const submitLabel = computed(() => {
  return editingBudget.value ? 'Update' : 'Create'
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
    return { text: 'Over Budget', color: 'bg-red-100 text-red-800' }
  }
  if (percentage >= 80) {
    return { text: 'Near Limit', color: 'bg-amber-100 text-amber-800' }
  }
  return { text: 'On Track', color: 'bg-green-100 text-green-800' }
}
</script>

<template>
  <AppLayout>
    <PageHeader
      title="Budgets"
      subtitle="Set and track your spending limits"
      action-label="Add Budget"
      @action="handleAddBudget"
    />

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <StatCard
        label="Total Budgeted"
        :value="formatCurrency(budgetsStore.totalBudgeted)"
      />
      <StatCard
        label="Total Spent"
        :value="formatCurrency(budgetsStore.totalSpent)"
        :color="budgetsStore.totalSpent > budgetsStore.totalBudgeted ? 'red' : 'default'"
      />
      <StatCard
        label="Remaining"
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
          aria-label="Previous month"
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
          aria-label="Next month"
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
      <p class="text-gray-500">Loading budgets...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="budgetsStore.error"
      class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"
    >
      {{ budgetsStore.error }}
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="budgetsStore.budgets.length === 0"
      message='No budgets yet. Click "Add Budget" to create your first budget!'
    />

    <!-- Budgets List -->
    <div v-else class="space-y-4">
      <div
        v-for="budget in budgetsStore.budgets"
        :key="budget.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div
              v-if="budget.categories"
              class="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold"
              :style="{ backgroundColor: budget.categories.color }"
            >
              {{
                budget.categories.icon ||
                budget.categories.name.charAt(0).toUpperCase()
              }}
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">
                {{ budget.categories?.name || 'Unknown Category' }}
              </h3>
              <span
                :class="[
                  'inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1',
                  getStatusBadge(budget.percentage).color
                ]"
              >
                {{ getStatusBadge(budget.percentage).text }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleEditBudget(budget)"
              class="p-2 text-gray-600 hover:text-primary-600 transition-colors"
              aria-label="Edit budget"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
              class="p-2 text-gray-600 hover:text-red-600 transition-colors"
              aria-label="Delete budget"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
          <div class="flex justify-between text-sm mb-2">
            <span class="text-gray-600">
              {{ formatCurrency(budget.spent) }} spent
            </span>
            <span class="text-gray-600">
              {{ formatCurrency(budget.amount) }} limit
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              :class="['h-full transition-all duration-300', getProgressBarColor(budget.percentage)]"
              :style="{ width: `${Math.min(budget.percentage, 100)}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-sm mt-2">
            <span
              class="font-semibold"
              :class="budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ formatCurrency(Math.abs(budget.remaining)) }}
              {{ budget.remaining >= 0 ? 'remaining' : 'over' }}
            </span>
            <span class="text-gray-600 font-medium">
              {{ Math.round(budget.percentage) }}%
            </span>
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
                month: editingBudget.month
              }
            : { month: budgetsStore.currentMonth }
        "
        :submit-label="submitLabel"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteConfirm" title="Delete Budget" max-width="max-w-sm">
      <div class="space-y-4">
        <p class="text-gray-700">
          Are you sure you want to delete this budget? This action cannot be undone.
        </p>
        <div
          v-if="budgetToDelete"
          class="p-3 bg-gray-50 rounded-lg text-sm space-y-1"
        >
          <p>
            <strong>Category:</strong>
            {{ budgetToDelete.categories?.name || 'Unknown' }}
          </p>
          <p>
            <strong>Budget:</strong> {{ formatCurrency(budgetToDelete.amount) }}
          </p>
          <p><strong>Month:</strong> {{ formatMonth(budgetToDelete.month) }}</p>
        </div>
        <div class="flex gap-3 pt-2">
          <button @click="handleDelete" class="btn btn-primary bg-red-600 flex-1">
            Delete
          </button>
          <button @click="cancelDelete" class="btn btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </Modal>
  </AppLayout>
</template>
