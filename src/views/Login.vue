<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  try {
    loading.value = true
    error.value = ''

    await authStore.signIn(email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="card max-w-md w-full">
      <h1 class="text-2xl font-bold text-center mb-6">{{ t('auth.login.title') }}</h1>
      <p class="text-gray-600 text-center mb-8">{{ t('auth.login.subtitle') }}</p>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('auth.login.email') }}
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="input"
            :placeholder="t('auth.login.emailPlaceholder')"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('auth.login.password') }}
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="input"
            :placeholder="t('auth.login.passwordPlaceholder')"
          />
        </div>

        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn btn-primary w-full">
          {{ loading ? t('auth.login.loading') : t('auth.login.signIn') }}
        </button>
      </form>
    </div>
  </div>
</template>
