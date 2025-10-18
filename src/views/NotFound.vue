<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<template>
  <AppLayout>
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div class="text-9xl font-bold text-primary-600 mb-4">404</div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ $t('notFound.title') }}</h1>
      <p class="text-gray-600 mb-8 max-w-md">{{ $t('notFound.description') }}</p>
      <button @click="goHome" class="btn btn-primary">
        {{ $t('notFound.goHome') }}
      </button>
    </div>
  </AppLayout>
</template>
