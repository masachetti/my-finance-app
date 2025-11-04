<script setup lang="ts">
import type { Event, EventInsert, EventUpdate } from '@/types/database'
import EmojiPicker from '@/components/common/EmojiPicker.vue'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  event?: Event | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [data: EventInsert | EventUpdate]
}>()

const { t } = useI18n()

// Form state
const formData = ref({
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  color: '#3B82F6',
  icon: '',
})

const errors = ref<Record<string, string>>({})

// Color palette
const colorPalette = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
]

// Watch for event changes to populate form
watch(
  () => props.event,
  (newEvent) => {
    if (newEvent) {
      formData.value = {
        name: newEvent.name,
        description: newEvent.description || '',
        start_date: newEvent.start_date,
        end_date: newEvent.end_date || '',
        color: newEvent.color,
        icon: newEvent.icon || '',
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
    icon: '',
  }
  errors.value = {}
}

function validateForm(): boolean {
  errors.value = {}

  if (!formData.value.name.trim()) {
    errors.value.name = t('events.form.nameRequired')
  } else if (formData.value.name.trim().length < 2) {
    errors.value.name = t('events.form.nameMinLength')
  }

  if (!formData.value.start_date) {
    errors.value.start_date = t('events.form.startDateRequired')
  }

  if (formData.value.end_date && formData.value.end_date < formData.value.start_date) {
    errors.value.end_date = t('events.form.endDateInvalid')
  }

  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (!validateForm()) return

  const data: EventInsert | EventUpdate = {
    name: formData.value.name.trim(),
    description: formData.value.description.trim() || null,
    start_date: formData.value.start_date,
    end_date: formData.value.end_date || null,
    color: formData.value.color,
    icon: formData.value.icon || null,
  }

  emit('submit', data)
  handleClose()
}

function handleClose() {
  resetForm()
  emit('close')
}
</script>

<template>
  <Modal
    :model-value="isOpen"
    :title="event ? t('events.editEvent') : t('events.createEvent')"
    @update:model-value="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Event Name -->
      <div>
        <label for="event-name" class="block text-sm font-medium text-gray-700 mb-1">
          {{ t('events.form.name') }}
        </label>
        <input
          id="event-name"
          v-model="formData.name"
          type="text"
          :placeholder="t('events.form.namePlaceholder')"
          class="input"
          :class="{ 'border-red-500': errors.name }"
        />
        <p v-if="errors.name" class="text-sm text-red-600 mt-1">{{ errors.name }}</p>
      </div>

      <!-- Description -->
      <div>
        <label for="event-description" class="block text-sm font-medium text-gray-700 mb-1">
          {{ t('events.form.description') }}
        </label>
        <textarea
          id="event-description"
          v-model="formData.description"
          rows="3"
          :placeholder="t('events.form.descriptionPlaceholder')"
          class="input resize-none"
        ></textarea>
      </div>

      <!-- Date Range -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker
          v-model="formData.start_date"
          :label="t('events.form.startDate')"
          :required="true"
          :error="errors.start_date"
        />

        <DatePicker
          v-model="formData.end_date"
          :label="t('events.form.endDate')"
          :required="false"
          :error="errors.end_date"
        />
      </div>

      <!-- Color Picker -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('events.form.color') }}
        </label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="color in colorPalette"
            :key="color"
            type="button"
            class="w-10 h-10 rounded-full border-2 transition-all"
            :class="formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'"
            :style="{ backgroundColor: color }"
            @click="formData.color = color"
            :aria-label="`Select color ${color}`"
          ></button>
        </div>
      </div>

      <!-- Icon Picker -->
      <EmojiPicker v-model="formData.icon" class="mt-2" />

      <!-- Form Actions -->
      <div class="flex gap-3 pt-4">
        <button type="button" class="btn flex-1" @click="handleClose">
          {{ t('common.cancel') }}
        </button>
        <button type="submit" class="btn btn-primary flex-1">
          {{ event ? t('common.update') : t('common.create') }}
        </button>
      </div>
    </form>
  </Modal>
</template>
