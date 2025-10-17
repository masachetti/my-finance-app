<script setup lang="ts">
import VueDatePicker from '@vuepic/vue-datepicker'
import { computed } from 'vue'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  modelValue: string
  label?: string
  required?: boolean
  error?: string
  monthPicker?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  required: false,
  error: '',
  monthPicker: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Convert ISO format (yyyy-MM-dd or yyyy-MM) to Date object for the picker
const dateValue = computed({
  get: () => {
    if (!props.modelValue) return null

    if (props.monthPicker) {
      // For month picker, parse yyyy-MM format
      const [year, month] = props.modelValue.split('-')
      return new Date(parseInt(year), parseInt(month) - 1, 1)
    } else {
      // For date picker, parse yyyy-MM-dd format
      return parse(props.modelValue, 'yyyy-MM-dd', new Date())
    }
  },
  set: (value: Date | null) => {
    if (!value) {
      emit('update:modelValue', '')
      return
    }

    if (props.monthPicker) {
      // Convert to yyyy-MM format for database
      emit('update:modelValue', format(value, 'yyyy-MM'))
    } else {
      // Convert to yyyy-MM-dd format for database
      emit('update:modelValue', format(value, 'yyyy-MM-dd'))
    }
  },
})

// PT-BR locale configuration
const locale = ptBR

// Display format configuration
const formatConfig = computed(() => {
  return props.monthPicker ? 'MM/yyyy' : 'dd/MM/yyyy'
})
</script>

<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <VueDatePicker
      v-model="dateValue"
      :format="formatConfig"
      :format-locale="locale"
      :month-picker="monthPicker"
      :enable-time-picker="false"
      auto-apply
      :teleport="true"
      :input-class-name="error ? 'dp-input-error' : ''"
    />
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<style scoped>
/* Override default vue-datepicker styles to match app's input styling */
:deep(.dp__input) {
  @apply w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  font-family: inherit;
}

:deep(.dp__input:focus) {
  @apply ring-2 ring-primary-500 border-transparent;
}

:deep(.dp-input-error) {
  @apply border-red-500;
}

:deep(.dp__active_date) {
  @apply bg-primary-600;
}

:deep(.dp__today) {
  @apply border-primary-600;
}

:deep(.dp__action_button) {
  @apply text-primary-600;
}
</style>
