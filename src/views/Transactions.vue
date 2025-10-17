<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'

function handleAddTransaction() {
  // TODO: Implement add transaction logic
  console.log('Add transaction clicked')
}
</script>

<template>
  <AppLayout>
    <PageHeader
      title="Transactions"
      subtitle="Manage your income and expenses"
      action-label="Add Transaction"
      @action="handleAddTransaction"
    />

    <EmptyState message='No transactions yet. Click "Add Transaction" to get started!' />
  </AppLayout>
</template>
