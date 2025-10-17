<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const navItems = [
  { name: 'Dashboard', path: '/' },
  { name: 'Transactions', path: '/transactions' },
  { name: 'Budgets', path: '/budgets' },
  { name: 'Categories', path: '/categories' }
]

async function handleLogout() {
  await authStore.signOut()
  router.push({ name: 'login' })
}

function isActive(path: string): boolean {
  return route.path === path
}
</script>

<template>
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <h1 class="text-xl font-bold text-gray-900">My Finance App</h1>
        <div class="flex items-center gap-4">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'px-3 py-2 rounded-md text-sm',
              isActive(item.path)
                ? 'text-gray-900 font-semibold'
                : 'text-gray-700 hover:text-gray-900 font-medium'
            ]"
          >
            {{ item.name }}
          </RouterLink>
          <button @click="handleLogout" class="btn btn-secondary text-sm">
            Logout
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
