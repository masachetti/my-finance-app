<script setup lang="ts">
import { useCategoriesStore } from '@/stores/categories'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type BudgetInsert = Database['public']['Tables']['budgets']['Insert']

interface Props {
  initialData?: {
    category_id?: string
    amount?: number
    month?: string
  }
  submitLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: 'Save'
})

const emit = defineEmits<{
  submit: [data: Omit<BudgetInsert, 'user_id'>]
  cancel: []
}>()

const categoriesStore = useCategoriesStore()

// Initialize categories
onMounted(async () => {
  if (categoriesStore.categories.length === 0) {
    await categoriesStore.fetchCategories()
  }
})

// Form state
const formData = reactive({
  category_id: props.initialData?.category_id || '',
  amount: props.initialData?.amount?.toString() || '',
  month: props.initialData?.month || format(new Date(), 'yyyy-MM')
})

// Validation
const errors = reactive({
  category_id: '',
  amount: '',
  month: ''
})

// Only expense categories can have budgets
const expenseCategories = computed(() => categoriesStore.expenseCategories)

function validateForm(): boolean {
  errors.category_id = ''
  errors.amount = ''
  errors.month = ''

  if (!formData.category_id) {
    errors.category_id = 'Please select a category'
    return false
  }

  if (!formData.amount || isNaN(parseFloat(formData.amount))) {
    errors.amount = 'Please enter a valid amount'
    return false
  }

  const amount = parseFloat(formData.amount)
  if (amount <= 0) {
    errors.amount = 'Budget amount must be greater than 0'
    return false
  }

  if (!formData.month) {
    errors.month = 'Please select a month'
    return false
  }

  // Validate month format (YYYY-MM)
  const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/
  if (!monthRegex.test(formData.month)) {
    errors.month = 'Invalid month format'
    return false
  }

  return true
}

function handleSubmit() {
  if (!validateForm()) return

  emit('submit', {
    category_id: formData.category_id,
    amount: parseFloat(formData.amount),
    month: formData.month
  })
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Category Selection -->
    <div>
      <label for="category" class="block text-sm font-medium text-gray-700 mb-1">
        Category <span class="text-red-500">*</span>
      </label>
      <select
        id="category"
        v-model="formData.category_id"
        class="input w-full"
        :class="{ 'border-red-500': errors.category_id }"
        required
      >
        <option value="" disabled>Select a category</option>
        <option
          v-for="category in expenseCategories"
          :key="category.id"
          :value="category.id"
        >
          {{ category.icon }} {{ category.name }}
        </option>
      </select>
      <p v-if="errors.category_id" class="mt-1 text-sm text-red-600">
        {{ errors.category_id }}
      </p>
      <p v-if="expenseCategories.length === 0" class="mt-1 text-sm text-amber-600">
        No expense categories available. Please create one first.
      </p>
    </div>

    <!-- Budget Amount -->
    <div>
      <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
        Budget Limit <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <span
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium"
        >
          R$
        </span>
        <input
          id="amount"
          v-model="formData.amount"
          type="number"
          step="0.01"
          min="0"
          class="input w-full pl-8"
          :class="{ 'border-red-500': errors.amount }"
          placeholder="0.00"
          required
        />
      </div>
      <p v-if="errors.amount" class="mt-1 text-sm text-red-600">{{ errors.amount }}</p>
      <p v-else class="mt-1 text-xs text-gray-500">
        Maximum amount you plan to spend in this category
      </p>
    </div>

    <!-- Month Selection -->
    <DatePicker
      v-model="formData.month"
      label="Month"
      :required="true"
      :error="errors.month"
      :month-picker="true"
    />

    <!-- Form Actions -->
    <div class="flex gap-3 pt-4">
      <button type="submit" class="btn btn-primary flex-1">
        {{ submitLabel }}
      </button>
      <button type="button" @click="handleCancel" class="btn btn-secondary flex-1">
        Cancel
      </button>
    </div>
  </form>
</template>
