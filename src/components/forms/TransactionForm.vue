<script setup lang="ts">
import { useCategoriesStore } from '@/stores/categories'
import { useEventsStore } from '@/stores/events'
import { format, parseISO, isWithinInterval } from 'date-fns'
import type { Database } from '@/types/database'
import { useI18n } from '@/composables/useI18n'
import SubCategorySelect from './SubCategorySelect.vue'

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

interface Props {
  initialData?: {
    category_id?: string
    sub_category_id?: string | null
    amount?: number
    description?: string | null
    date?: string
    type?: 'income' | 'expense'
    event_id?: string | null
  }
  submitLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: 'Save',
})

const emit = defineEmits<{
  submit: [data: Omit<TransactionInsert, 'user_id'>]
  cancel: []
}>()

const { t } = useI18n()
const categoriesStore = useCategoriesStore()
const eventsStore = useEventsStore()

// Initialize categories and events
onMounted(async () => {
  if (categoriesStore.categories.length === 0) {
    await categoriesStore.fetchCategories()
  }
  if (eventsStore.events.length === 0) {
    await eventsStore.fetchEvents()
  }
})

// Form state
const formData = reactive({
  category_id: props.initialData?.category_id || '',
  sub_category_id: props.initialData?.sub_category_id || null,
  amount: props.initialData?.amount?.toString() || '',
  description: props.initialData?.description || '',
  date: props.initialData?.date || format(new Date(), 'yyyy-MM-dd'),
  type: props.initialData?.type || ('expense' as 'income' | 'expense'),
  event_id: props.initialData?.event_id || (null as string | null),
})

// Validation
const errors = reactive({
  category_id: '',
  amount: '',
  date: '',
})

// Filter categories based on type
const availableCategories = computed(() => {
  return formData.type === 'income'
    ? categoriesStore.incomeCategories
    : categoriesStore.expenseCategories
})

// Filter events based on transaction date (smart filtering)
const availableEvents = computed(() => {
  if (!formData.date) return eventsStore.events

  try {
    const transactionDate = parseISO(formData.date)

    return eventsStore.events.filter((event) => {
      const startDate = parseISO(event.start_date)

      // If event has no end date (open-ended), only check if transaction is after start
      if (!event.end_date) {
        return transactionDate >= startDate
      }

      // If event has end date, check if transaction is within range
      const endDate = parseISO(event.end_date)
      return isWithinInterval(transactionDate, { start: startDate, end: endDate })
    })
  } catch {
    // If date parsing fails, return all events
    return eventsStore.events
  }
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

// Watch date changes and clear event if not valid
watch(
  () => formData.date,
  () => {
    if (formData.event_id) {
      const selectedEvent = eventsStore.events.find((e) => e.id === formData.event_id)
      if (selectedEvent && !availableEvents.value.find((e) => e.id === formData.event_id)) {
        formData.event_id = null
      }
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
    sub_category_id: formData.sub_category_id || null,
    amount: parseFloat(formData.amount),
    description: formData.description.trim() || null,
    date: formData.date,
    type: formData.type,
    event_id: formData.event_id || null,
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
        :class="{ 'border-red-500': errors.category_id }"
        required
      >
        <option value="" disabled>{{ t('forms.transaction.categoryPlaceholder') }}</option>
        <option v-for="category in availableCategories" :key="category.id" :value="category.id">
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

    <!-- Sub-Category Selection -->
    <SubCategorySelect v-model="formData.sub_category_id" :category-id="formData.category_id" />

    <!-- Event Selection -->
    <div>
      <label for="event" class="block text-sm font-medium text-gray-700 mb-1">
        {{ t('forms.transaction.event') }}
      </label>
      <select id="event" v-model="formData.event_id" class="input w-full">
        <option :value="null">{{ t('forms.transaction.noEvent') }}</option>
        <option v-for="event in availableEvents" :key="event.id" :value="event.id">
          <span v-if="event.icon">{{ event.icon }}</span>
          {{ event.name }}
          <span v-if="event.end_date">
            ({{ format(parseISO(event.start_date), 'dd/MM/yy') }} -
            {{ format(parseISO(event.end_date), 'dd/MM/yy') }})
          </span>
          <span v-else> ({{ t('events.openEnded') }}) </span>
        </option>
      </select>
      <p v-if="availableEvents.length === 0" class="mt-1 text-sm text-amber-600">
        {{ t('forms.transaction.noEventsAvailable') }}
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
          :class="{ 'border-red-500': errors.amount }"
          :placeholder="t('forms.transaction.amountPlaceholder')"
          required
        />
      </div>
      <p v-if="errors.amount" class="mt-1 text-sm text-red-600">{{ errors.amount }}</p>
    </div>

    <!-- Date -->
    <DatePicker
      v-model="formData.date"
      :label="t('forms.transaction.date')"
      :required="true"
      :error="errors.date"
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
