<script setup lang="ts">
import { useCategoriesStore } from '@/stores/categories'
import { format } from 'date-fns'
import type { RecurrentTransactionInsert } from '@/types/database'
import { useI18n } from '@/composables/useI18n'
import { getDayOfWeekNames, getFrequencyOptions, validateRecurrentTransaction } from '@/utils/recurrenceHelpers'

interface Props {
  initialData?: Partial<RecurrentTransactionInsert>
  submitLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: 'Salvar',
})

const emit = defineEmits<{
  submit: [data: Omit<RecurrentTransactionInsert, 'user_id'>]
  cancel: []
}>()

const { t } = useI18n()
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
  type: props.initialData?.type || ('expense' as 'income' | 'expense'),
  frequency: props.initialData?.frequency || ('monthly' as 'daily' | 'weekly' | 'monthly'),
  day_of_week: props.initialData?.day_of_week ?? null,
  day_of_month: props.initialData?.day_of_month?.toString() || '',
  start_date: props.initialData?.start_date || format(new Date(), 'yyyy-MM-dd'),
  end_date: props.initialData?.end_date || '',
  requires_approval: props.initialData?.requires_approval ?? false,
  is_active: props.initialData?.is_active ?? true,
})

// Validation errors
const errors = ref<string[]>([])

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

// Watch frequency changes and reset day fields
watch(
  () => formData.frequency,
  () => {
    formData.day_of_week = null
    formData.day_of_month = ''
  }
)

function validateForm(): boolean {
  const validation = validateRecurrentTransaction({
    amount: parseFloat(formData.amount),
    category_id: formData.category_id,
    frequency: formData.frequency,
    day_of_week: formData.day_of_week,
    day_of_month: formData.day_of_month ? parseInt(formData.day_of_month) : null,
    start_date: formData.start_date,
    end_date: formData.end_date || null,
  })

  errors.value = validation.errors
  return validation.valid
}

function handleSubmit() {
  if (!validateForm()) return

  const data: Omit<RecurrentTransactionInsert, 'user_id'> = {
    category_id: formData.category_id || null,
    amount: parseFloat(formData.amount),
    description: formData.description.trim() || null,
    type: formData.type,
    frequency: formData.frequency,
    day_of_week: formData.frequency === 'weekly' ? formData.day_of_week : null,
    day_of_month: formData.frequency === 'monthly' ? parseInt(formData.day_of_month) : null,
    start_date: formData.start_date,
    end_date: formData.end_date || null,
    requires_approval: formData.requires_approval,
    is_active: formData.is_active,
  }

  emit('submit', data)
}

function handleCancel() {
  emit('cancel')
}

const frequencyOptions = getFrequencyOptions()
const dayOfWeekNames = getDayOfWeekNames()
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Error messages -->
    <div v-if="errors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-3">
      <ul class="list-disc list-inside text-sm text-red-600">
        <li v-for="(error, idx) in errors" :key="idx">{{ error }}</li>
      </ul>
    </div>

    <!-- Transaction Type -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        {{ t('forms.transaction.type') }} <span class="text-red-500">*</span>
      </label>
      <div class="flex gap-4">
        <label class="flex items-center cursor-pointer">
          <input
            v-model="formData.type"
            type="radio"
            value="income"
            class="mr-2 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm">{{ t('forms.transaction.income') }}</span>
        </label>
        <label class="flex items-center cursor-pointer">
          <input
            v-model="formData.type"
            type="radio"
            value="expense"
            class="mr-2 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm">{{ t('forms.transaction.expense') }}</span>
        </label>
      </div>
    </div>

    <!-- Category Selection -->
    <div>
      <label for="category" class="block text-sm font-medium text-gray-700 mb-1">
        {{ t('forms.transaction.category') }} <span class="text-red-500">*</span>
      </label>
      <select
        id="category"
        v-model="formData.category_id"
        class="input w-full"
        required
      >
        <option value="" disabled>{{ t('forms.transaction.categoryPlaceholder') }}</option>
        <option v-for="category in availableCategories" :key="category.id" :value="category.id">
          {{ category.icon }} {{ category.name }}
        </option>
      </select>
      <p v-if="availableCategories.length === 0" class="mt-1 text-sm text-amber-600">
        Nenhuma categoria de {{ formData.type === 'income' ? 'receita' : 'despesa' }} disponível.
      </p>
    </div>

    <!-- Amount -->
    <div>
      <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
        {{ t('forms.transaction.amount') }} <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium"> R$ </span>
        <input
          id="amount"
          v-model="formData.amount"
          type="number"
          step="0.01"
          min="0"
          class="input w-full pl-8"
          :placeholder="t('forms.transaction.amountPlaceholder')"
          required
        />
      </div>
    </div>

    <!-- Frequency -->
    <div>
      <label for="frequency" class="block text-sm font-medium text-gray-700 mb-1">
        Frequência <span class="text-red-500">*</span>
      </label>
      <select
        id="frequency"
        v-model="formData.frequency"
        class="input w-full"
        required
      >
        <option v-for="option in frequencyOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <!-- Day of Week (for weekly) -->
    <div v-if="formData.frequency === 'weekly'">
      <label for="day_of_week" class="block text-sm font-medium text-gray-700 mb-1">
        Dia da Semana <span class="text-red-500">*</span>
      </label>
      <select
        id="day_of_week"
        v-model.number="formData.day_of_week"
        class="input w-full"
        required
      >
        <option :value="null" disabled>Selecione o dia da semana</option>
        <option v-for="(day, index) in dayOfWeekNames" :key="index" :value="index">
          {{ day }}
        </option>
      </select>
    </div>

    <!-- Day of Month (for monthly) -->
    <div v-if="formData.frequency === 'monthly'">
      <label for="day_of_month" class="block text-sm font-medium text-gray-700 mb-1">
        Dia do Mês <span class="text-red-500">*</span>
      </label>
      <input
        id="day_of_month"
        v-model="formData.day_of_month"
        type="number"
        min="1"
        max="31"
        class="input w-full"
        placeholder="Ex: 5, 15, 28"
        required
      />
      <p class="mt-1 text-xs text-gray-500">
        Para meses com menos dias, será usado o último dia do mês.
      </p>
    </div>

    <!-- Start Date -->
    <DatePicker
      v-model="formData.start_date"
      label="Data de Início"
      :required="true"
    />

    <!-- End Date -->
    <DatePicker
      v-model="formData.end_date"
      label="Data Final (Opcional)"
      :required="false"
    />

    <!-- Description (Optional) -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
        {{ t('forms.transaction.description') }}
      </label>
      <textarea
        id="description"
        v-model="formData.description"
        rows="3"
        class="input w-full resize-none"
        :placeholder="t('forms.transaction.descriptionPlaceholder')"
      ></textarea>
    </div>

    <!-- Requires Approval -->
    <div class="flex items-center">
      <input
        id="requires_approval"
        v-model="formData.requires_approval"
        type="checkbox"
        class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
      />
      <label for="requires_approval" class="ml-2 block text-sm text-gray-700">
        Requer aprovação antes de criar transação
      </label>
    </div>

    <!-- Is Active -->
    <div class="flex items-center">
      <input
        id="is_active"
        v-model="formData.is_active"
        type="checkbox"
        class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
      />
      <label for="is_active" class="ml-2 block text-sm text-gray-700">
        Ativo
      </label>
    </div>

    <!-- Form Actions -->
    <div class="flex gap-3 pt-4">
      <button type="submit" class="btn btn-primary flex-1">
        {{ submitLabel }}
      </button>
      <button type="button" @click="handleCancel" class="btn btn-secondary flex-1">
        {{ t('common.cancel') }}
      </button>
    </div>
  </form>
</template>
