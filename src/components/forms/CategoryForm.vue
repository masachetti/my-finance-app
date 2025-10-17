<script setup lang="ts">
import type { Database } from '@/types/database'

type CategoryInsert = Database['public']['Tables']['categories']['Insert']

interface Props {
  initialData?: {
    name?: string
    type?: 'income' | 'expense'
    color?: string
    icon?: string | null
  }
  submitLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: 'Save'
})

const emit = defineEmits<{
  submit: [data: Omit<CategoryInsert, 'user_id'>]
  cancel: []
}>()

// Form state
const formData = reactive({
  name: props.initialData?.name || '',
  type: props.initialData?.type || ('expense' as 'income' | 'expense'),
  color: props.initialData?.color || '#3b82f6',
  icon: props.initialData?.icon || null
})

// Validation
const errors = reactive({
  name: ''
})

// Predefined color options
const colorOptions = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#64748b', // slate
  '#737373' // neutral
]

function validateForm(): boolean {
  errors.name = ''

  if (!formData.name.trim()) {
    errors.name = 'Category name is required'
    return false
  }

  if (formData.name.trim().length < 2) {
    errors.name = 'Category name must be at least 2 characters'
    return false
  }

  return true
}

function handleSubmit() {
  if (!validateForm()) return

  emit('submit', {
    name: formData.name.trim(),
    type: formData.type,
    color: formData.color,
    icon: formData.icon
  })
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Category Name -->
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
        Category Name <span class="text-red-500">*</span>
      </label>
      <input
        id="name"
        v-model="formData.name"
        type="text"
        class="input w-full"
        :class="{ 'border-red-500': errors.name }"
        placeholder="e.g., Groceries, Salary, Rent"
        required
      />
      <p v-if="errors.name" class="mt-1 text-sm text-red-600">{{ errors.name }}</p>
    </div>

    <!-- Category Type -->
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

    <!-- Color Picker -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Color <span class="text-red-500">*</span>
      </label>
      <div class="flex items-center gap-3 mb-3">
        <div
          class="w-12 h-12 rounded-lg border-2 border-gray-300"
          :style="{ backgroundColor: formData.color }"
        ></div>
        <input
          v-model="formData.color"
          type="color"
          class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
        />
        <span class="text-sm text-gray-600 font-mono">{{ formData.color }}</span>
      </div>
      <div class="grid grid-cols-9 gap-2">
        <button
          v-for="color in colorOptions"
          :key="color"
          type="button"
          @click="formData.color = color"
          class="w-8 h-8 rounded border-2 transition-all hover:scale-110"
          :class="
            formData.color === color
              ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-900'
              : 'border-gray-300'
          "
          :style="{ backgroundColor: color }"
          :aria-label="`Select color ${color}`"
        ></button>
      </div>
    </div>

    <!-- Icon (Optional) -->
    <div>
      <label for="icon" class="block text-sm font-medium text-gray-700 mb-1">
        Icon (Optional)
      </label>
      <input
        id="icon"
        v-model="formData.icon"
        type="text"
        class="input w-full"
        placeholder="e.g., 🏠, 💼, 🍕"
      />
      <p class="mt-1 text-xs text-gray-500">Enter an emoji or icon identifier</p>
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
