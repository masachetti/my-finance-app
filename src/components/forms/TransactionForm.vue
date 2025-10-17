<script setup lang="ts">
import { useCategoriesStore } from '@/stores/categories'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

interface Props {
  initialData?: {
    category_id?: string
    amount?: number
    description?: string | null
    date?: string
    type?: 'income' | 'expense'
  }
  submitLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: 'Save'
})

const emit = defineEmits<{
  submit: [data: Omit<TransactionInsert, 'user_id'>]
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
  description: props.initialData?.description || '',
  date: props.initialData?.date || format(new Date(), 'yyyy-MM-dd'),
  type: props.initialData?.type || ('expense' as 'income' | 'expense')
})

// Validation
const errors = reactive({
  category_id: '',
  amount: '',
  date: ''
})

// Filter categories based on type
const availableCategories = computed(() => {
  return formData.type === 'income'
    ? categoriesStore.incomeCategories
    : categoriesStore.expenseCategories
})

// Watch type changes and clear category if not valid
watch(
  () => formData.type,
  () => {
    const selectedCategory = categoriesStore.getCategoryById(formData.category_id)
    if (selectedCategory && selectedCategory.type !== formData.type) {
      formData.category_id = ''
    }
  }
)

function validateForm(): boolean {
  errors.category_id = ''
  errors.amount = ''
  errors.date = ''

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
    errors.amount = 'Amount must be greater than 0'
    return false
  }

  if (!formData.date) {
    errors.date = 'Please select a date'
    return false
  }

  return true
}

function handleSubmit() {
  if (!validateForm()) return

  emit('submit', {
    category_id: formData.category_id,
    amount: parseFloat(formData.amount),
    description: formData.description.trim() || null,
    date: formData.date,
    type: formData.type
  })
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Transaction Type -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Type <span class="text-red-500">*</span>
      </label>
      <div class="flex gap-4">
        <label class="flex items-center cursor-pointer">
          <input
            v-model="formData.type"
            type="radio"
            value="income"
            class="mr-2 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm">Income</span>
        </label>
        <label class="flex items-center cursor-pointer">
          <input
            v-model="formData.type"
            type="radio"
            value="expense"
            class="mr-2 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm">Expense</span>
        </label>
      </div>
    </div>

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
          v-for="category in availableCategories"
          :key="category.id"
          :value="category.id"
        >
          {{ category.icon }} {{ category.name }}
        </option>
      </select>
      <p v-if="errors.category_id" class="mt-1 text-sm text-red-600">
        {{ errors.category_id }}
      </p>
      <p v-if="availableCategories.length === 0" class="mt-1 text-sm text-amber-600">
        No {{ formData.type }} categories available. Please create one first.
      </p>
    </div>

    <!-- Amount -->
    <div>
      <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
        Amount <span class="text-red-500">*</span>
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
    </div>

    <!-- Date -->
    <div>
      <label for="date" class="block text-sm font-medium text-gray-700 mb-1">
        Date <span class="text-red-500">*</span>
      </label>
      <input
        id="date"
        v-model="formData.date"
        type="date"
        class="input w-full"
        :class="{ 'border-red-500': errors.date }"
        required
      />
      <p v-if="errors.date" class="mt-1 text-sm text-red-600">{{ errors.date }}</p>
    </div>

    <!-- Description (Optional) -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
        Description (Optional)
      </label>
      <textarea
        id="description"
        v-model="formData.description"
        rows="3"
        class="input w-full resize-none"
        placeholder="Add any notes about this transaction..."
      ></textarea>
    </div>

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
