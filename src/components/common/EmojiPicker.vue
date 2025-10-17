<script setup lang="ts">
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'

interface Props {
  modelValue: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPicker = ref(false)
const displayValue = ref(props.modelValue || '')

watch(
  () => props.modelValue,
  (newValue) => {
    displayValue.value = newValue || ''
  }
)

function onSelectEmoji(emoji: { i: string }) {
  displayValue.value = emoji.i
  emit('update:modelValue', emoji.i)
  showPicker.value = false
}

function togglePicker() {
  showPicker.value = !showPicker.value
}

function handleInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  displayValue.value = target.value
  emit('update:modelValue', target.value)
}

function clearEmoji() {
  displayValue.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="relative">
    <div class="flex gap-2">
      <div class="relative flex-1">
        <input
          :value="displayValue"
          @input="handleInputChange"
          type="text"
          class="input w-full pr-8"
          placeholder="Select or type an emoji"
        />
        <button
          v-if="displayValue"
          type="button"
          @click="clearEmoji"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear emoji"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <button
        type="button"
        @click="togglePicker"
        class="btn btn-secondary px-4 whitespace-nowrap"
      >
        {{ showPicker ? 'Close' : 'Pick Emoji' }}
      </button>
    </div>

    <!-- Emoji Picker Dropdown -->
    <div
      v-if="showPicker"
      class="absolute z-50 mt-2 shadow-lg rounded-lg border border-gray-200 bg-white"
    >
      <EmojiPicker :native="true" @select="onSelectEmoji" />
    </div>
  </div>
</template>
