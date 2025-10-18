<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  actionLabel?: string
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div class="flex-1">
      <h2 class="text-2xl font-bold text-gray-900">{{ title }}</h2>
      <p v-if="subtitle" class="text-gray-600 mt-1">{{ subtitle }}</p>
    </div>
    <button v-if="actionLabel" @click="emit('action')" class="btn btn-primary w-full sm:w-auto">
      {{ actionLabel }}
    </button>
  </div>
</template>
