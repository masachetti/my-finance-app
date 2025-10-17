<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <div class="card">
    <p class="text-gray-500 text-center py-8">{{ message }}</p>
  </div>
</template>
