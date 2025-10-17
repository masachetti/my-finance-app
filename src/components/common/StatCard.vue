<script setup lang="ts">
defineProps<{
  label: string
  value: string
  valueColor?: 'default' | 'green' | 'red'
}>()

const colorClasses = {
  default: 'text-gray-900',
  green: 'text-green-600',
  red: 'text-red-600'
}
</script>

<template>
  <div class="card">
    <h3 class="text-sm font-medium text-gray-500">{{ label }}</h3>
    <p :class="['text-3xl font-bold mt-2', colorClasses[valueColor || 'default']]">
      {{ value }}
    </p>
  </div>
</template>
