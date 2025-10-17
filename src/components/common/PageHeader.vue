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
  <div class="mb-8 flex justify-between items-center">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">{{ title }}</h2>
      <p v-if="subtitle" class="text-gray-600 mt-1">{{ subtitle }}</p>
    </div>
    <button v-if="actionLabel" @click="emit('action')" class="btn btn-primary">
      {{ actionLabel }}
    </button>
  </div>
</template>
