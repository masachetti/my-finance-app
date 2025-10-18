<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore, type Locale } from '@/stores/locale'
import { useRecurrentTransactionsStore } from '@/stores/recurrentTransactions'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const authStore = useAuthStore()
const localeStore = useLocaleStore()
const recurrentStore = useRecurrentTransactionsStore()
const router = useRouter()
const route = useRoute()

const isMobileMenuOpen = ref(false)

const navItems = computed(() => [
  { name: t('nav.dashboard'), path: '/' },
  { name: t('nav.transactions'), path: '/transactions' },
  { name: t('nav.budgets'), path: '/budgets' },
  { name: t('nav.categories'), path: '/categories' },
  { name: t('nav.recurrent'), path: '/recurrent-transactions', badge: recurrentStore.pendingCount },
])

async function handleLogout() {
  await authStore.signOut()
  router.push({ name: 'login' })
  isMobileMenuOpen.value = false
}

function isActive(path: string): boolean {
  return route.path === path
}

function toggleLanguage() {
  const newLocale: Locale = localeStore.currentLocale === 'pt-BR' ? 'en-US' : 'pt-BR'
  localeStore.setLocale(newLocale)
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

const currentLanguageLabel = computed(() => {
  return localeStore.currentLocale === 'pt-BR' ? 'PT' : 'EN'
})

// Close mobile menu when route changes
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})
</script>

<template>
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <h1 class="text-xl font-bold text-gray-900">{{ t('nav.appName') }}</h1>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center gap-4">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'px-3 py-2 rounded-md text-sm relative',
              isActive(item.path)
                ? 'text-gray-900 font-semibold'
                : 'text-gray-700 hover:text-gray-900 font-medium',
            ]"
          >
            {{ item.name }}
            <span
              v-if="item.badge && item.badge > 0"
              class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
            >
              {{ item.badge }}
            </span>
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

        <!-- Mobile Menu Button -->
        <button
          @click="toggleMobileMenu"
          class="md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'"
        >
          <svg
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="!isMobileMenuOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Menu Drawer -->
    <Teleport to="body">
      <!-- Backdrop -->
      <Transition
        enter-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isMobileMenuOpen"
          class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          @click="closeMobileMenu"
        />
      </Transition>

      <!-- Drawer -->
      <Transition
        enter-active-class="transition-transform duration-300"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-300"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div
          v-if="isMobileMenuOpen"
          class="fixed top-0 right-0 bottom-0 w-64 bg-white shadow-xl z-50 md:hidden overflow-y-auto"
        >
          <div class="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 class="text-lg font-semibold text-gray-900">{{ t('nav.menu') }}</h2>
            <button
              @click="closeMobileMenu"
              class="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="flex flex-col p-4 gap-2">
            <RouterLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'px-4 py-3 rounded-md text-base relative flex items-center justify-between',
                isActive(item.path)
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100 font-medium',
              ]"
            >
              <span>{{ item.name }}</span>
              <span
                v-if="item.badge && item.badge > 0"
                class="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center"
              >
                {{ item.badge }}
              </span>
            </RouterLink>

            <div class="border-t border-gray-200 my-2"></div>

            <button
              @click="toggleLanguage"
              class="px-4 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              {{ currentLanguageLabel === 'PT' ? '🇧🇷 Português' : '🇺🇸 English' }}
            </button>

            <button
              @click="handleLogout"
              class="px-4 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              {{ t('nav.logout') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </nav>
</template>
