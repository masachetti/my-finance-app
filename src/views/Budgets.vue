<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'

function handleAddBudget() {
  // TODO: Implement add budget logic
  console.log('Add budget clicked')
}
</script>

<template>
  <AppLayout>
    <PageHeader
      title="Budgets"
      subtitle="Set and track your spending limits"
      action-label="Add Budget"
      @action="handleAddBudget"
    />

    <EmptyState message='No budgets yet. Click "Add Budget" to create your first budget!' />
  </AppLayout>
</template>
