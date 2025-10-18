<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import RecurrentTransactionCard from '@/components/recurrent/RecurrentTransactionCard.vue'
import RecurrentTransactionForm from '@/components/forms/RecurrentTransactionForm.vue'
import { useRecurrentTransactionsStore } from '@/stores/recurrentTransactions'
import { useAuthStore } from '@/stores/auth'
import type { RecurrentTransactionInsert } from '@/types/database'

const recurrentStore = useRecurrentTransactionsStore()
const authStore = useAuthStore()

const showForm = ref(false)
const editingId = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const deletingId = ref<string | null>(null)

// Fetch recurrent transactions on mount
onMounted(async () => {
  await recurrentStore.fetchRecurrentTransactions()
})

const recurrentTransactions = computed(() => recurrentStore.recurrentTransactions)

const editingTransaction = computed(() => {
  if (!editingId.value) return null
  return recurrentTransactions.value.find((r) => r.id === editingId.value)
})

function handleAdd() {
  editingId.value = null
  showForm.value = true
}

function handleEdit(id: string) {
  editingId.value = id
  showForm.value = true
}

function handleDelete(id: string) {
  deletingId.value = id
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deletingId.value) return

  try {
    await recurrentStore.deleteRecurrentTransaction(deletingId.value)
    showDeleteConfirm.value = false
    deletingId.value = null
  } catch (err) {
    console.error('Error deleting recurrent transaction:', err)
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletingId.value = null
}

async function handleToggleActive(id: string) {
  try {
    await recurrentStore.toggleActive(id)
  } catch (err) {
    console.error('Error toggling recurrent transaction:', err)
  }
}

async function handleSubmit(data: Omit<RecurrentTransactionInsert, 'user_id'>) {
  try {
    const user = authStore.user
    if (!user) {
      console.error('User not authenticated')
      return
    }

    if (editingId.value) {
      // Update existing
      await recurrentStore.updateRecurrentTransaction(editingId.value, data)
    } else {
      // Create new
      await recurrentStore.createRecurrentTransaction({
        ...data,
        user_id: user.id
      })
    }

    showForm.value = false
    editingId.value = null
  } catch (err) {
    console.error('Error saving recurrent transaction:', err)
  }
}

function handleCancel() {
  showForm.value = false
  editingId.value = null
}
</script>

<template>
  <AppLayout>
    <PageHeader
      title="Transações Recorrentes"
      subtitle="Gerencie suas transações que se repetem automaticamente"
      :action-label="showForm ? undefined : 'Nova Transação Recorrente'"
      @action="handleAdd"
    />

    <!-- Form Modal/Section -->
    <div v-if="showForm" class="card p-6 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        {{ editingId ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente' }}
      </h3>
      <RecurrentTransactionForm
        :initial-data="editingTransaction || undefined"
        :submit-label="editingId ? 'Atualizar' : 'Criar'"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>

    <!-- Loading State -->
    <div v-if="recurrentStore.loading && recurrentTransactions.length === 0" class="text-center py-12">
      <p class="text-gray-500">Carregando transações recorrentes...</p>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="!showForm && recurrentTransactions.length === 0"
      message="Nenhuma transação recorrente cadastrada."
    />

    <!-- Recurrent Transactions List -->
    <div v-else-if="!showForm" class="space-y-4">
      <RecurrentTransactionCard
        v-for="recurrence in recurrentTransactions"
        :key="recurrence.id"
        :recurrence="recurrence"
        @edit="handleEdit"
        @delete="handleDelete"
        @toggle-active="handleToggleActive"
      />
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="cancelDelete"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Confirmar Exclusão</h3>
        <p class="text-gray-600 mb-4">
          Tem certeza que deseja excluir esta transação recorrente? Esta ação não pode ser desfeita.
        </p>
        <p class="text-sm text-amber-600 mb-6">
          Nota: As transações já criadas a partir desta recorrência não serão excluídas.
        </p>
        <div class="flex gap-3">
          <button
            @click="confirmDelete"
            class="btn bg-red-600 text-white hover:bg-red-700 flex-1"
            :disabled="recurrentStore.loading"
          >
            Excluir
          </button>
          <button
            @click="cancelDelete"
            class="btn btn-secondary flex-1"
            :disabled="recurrentStore.loading"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
