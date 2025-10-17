<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatCard from '@/components/common/StatCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const authStore = useAuthStore()
</script>

<template>
  <AppLayout>
    <PageHeader
      title="Dashboard"
      :subtitle="`Welcome back, ${authStore.user?.email}`"
    />

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard label="Total Balance" value="$0.00" />
      <StatCard label="This Month Income" value="$0.00" value-color="green" />
      <StatCard label="This Month Expenses" value="$0.00" value-color="red" />
    </div>

    <div class="card">
      <h3 class="text-lg font-semibold mb-4">Recent Transactions</h3>
      <EmptyState message="No transactions yet. Start by adding your first transaction!" />
    </div>
  </AppLayout>
</template>
