<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore, type Locale } from '@/stores/locale'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const authStore = useAuthStore()
const localeStore = useLocaleStore()
const router = useRouter()
const route = useRoute()

const navItems = computed(() => [
  { name: t('nav.dashboard'), path: '/' },
  { name: t('nav.transactions'), path: '/transactions' },
  { name: t('nav.budgets'), path: '/budgets' },
  { name: t('nav.categories'), path: '/categories' },
])

async function handleLogout() {
  await authStore.signOut()
  router.push({ name: 'login' })
}

function isActive(path: string): boolean {
  return route.path === path
}

function toggleLanguage() {
  const newLocale: Locale = localeStore.currentLocale === 'pt-BR' ? 'en-US' : 'pt-BR'
  localeStore.setLocale(newLocale)
}

const currentLanguageLabel = computed(() => {
  return localeStore.currentLocale === 'pt-BR' ? 'PT' : 'EN'
})
</script>

<template>
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <h1 class="text-xl font-bold text-gray-900">{{ t('nav.appName') }}</h1>
        <div class="flex items-center gap-4">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'px-3 py-2 rounded-md text-sm',
              isActive(item.path)
                ? 'text-gray-900 font-semibold'
                : 'text-gray-700 hover:text-gray-900 font-medium',
            ]"
          >
            {{ item.name }}
          </RouterLink>
          <button
            @click="toggleLanguage"
            class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            :title="currentLanguageLabel === 'PT' ? 'Switch to English' : 'Mudar para Português'"
          >
            {{ currentLanguageLabel }}
          </button>
          <button @click="handleLogout" class="btn btn-secondary text-sm">
            {{ t('nav.logout') }}
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
