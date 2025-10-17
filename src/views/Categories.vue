<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'

function handleAddCategory() {
  // TODO: Implement add category logic
  console.log('Add category clicked')
}
</script>

<template>
  <AppLayout>
    <PageHeader
      title="Categories"
      subtitle="Organize your transactions"
      action-label="Add Category"
      @action="handleAddCategory"
    />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Income Categories</h3>
        <EmptyState message="No income categories yet." />
      </div>
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Expense Categories</h3>
        <EmptyState message="No expense categories yet." />
      </div>
    </div>
  </AppLayout>
</template>
