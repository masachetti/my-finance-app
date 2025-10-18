<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Modal from '@/components/common/Modal.vue'
import CategoryForm from '@/components/forms/CategoryForm.vue'
import { useCategoriesStore } from '@/stores/categories'
import type { Database } from '@/types/database'
import { useI18n } from '@/composables/useI18n'

type CategoryInsert = Database['public']['Tables']['categories']['Insert']
type Category = Database['public']['Tables']['categories']['Row']

const { t } = useI18n()
const categoriesStore = useCategoriesStore()

// Modal state
const showModal = ref(false)
const editingCategory = ref<Category | null>(null)
const showDeleteConfirm = ref(false)
const categoryToDelete = ref<Category | null>(null)

// Load categories on mount
onMounted(async () => {
  await categoriesStore.fetchCategories()
})

// Modal handlers
function handleAddCategory() {
  editingCategory.value = null
  showModal.value = true
}

function handleEditCategory(category: Category) {
  editingCategory.value = category
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingCategory.value = null
}

// CRUD operations
async function handleSubmit(data: Omit<CategoryInsert, 'user_id'>) {
  if (editingCategory.value) {
    // Update existing category
    const success = await categoriesStore.updateCategory(editingCategory.value.id, data)
    if (success) {
      closeModal()
    }
  } else {
    // Create new category
    const success = await categoriesStore.createCategory(data)
    if (success) {
      closeModal()
    }
  }
}

function confirmDelete(category: Category) {
  categoryToDelete.value = category
  showDeleteConfirm.value = true
}

function cancelDelete() {
  categoryToDelete.value = null
  showDeleteConfirm.value = false
}

async function handleDelete() {
  if (categoryToDelete.value) {
    const success = await categoriesStore.deleteCategory(categoryToDelete.value.id)
    if (success) {
      cancelDelete()
    }
  }
}

// Modal title
const modalTitle = computed(() => {
  return editingCategory.value ? t('categories.editCategory') : t('categories.addCategory')
})

const submitLabel = computed(() => {
  return editingCategory.value ? t('common.update') : t('common.create')
})
</script>

<template>
  <AppLayout>
    <PageHeader
      :title="t('categories.title')"
      :subtitle="t('categories.subtitle')"
      :action-label="t('categories.addCategory')"
      @action="handleAddCategory"
    />

    <!-- Loading State -->
    <div v-if="categoriesStore.loading" class="text-center py-12">
      <p class="text-gray-500">{{ t('categories.loadingCategories') }}</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="categoriesStore.error"
      class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"
    >
      {{ categoriesStore.error }}
    </div>

    <!-- Categories Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Income Categories -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">
          {{ t('categories.incomeCategories') }}
        </h3>

        <EmptyState
          v-if="categoriesStore.incomeCategories.length === 0"
          :message="t('categories.noIncomeCategories')"
        />

        <div v-else class="space-y-2">
          <div
            v-for="category in categoriesStore.incomeCategories"
            :key="category.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                :style="{ backgroundColor: category.color }"
              >
                {{ category.icon || category.name.charAt(0).toUpperCase() }}
              </div>
              <span class="font-medium text-gray-900">{{ category.name }}</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="handleEditCategory(category)"
                class="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                :aria-label="t('categories.editCategoryAriaLabel')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                @click="confirmDelete(category)"
                class="p-2 text-gray-600 hover:text-red-600 transition-colors"
                :aria-label="t('categories.deleteCategoryAriaLabel')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Expense Categories -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">
          {{ t('categories.expenseCategories') }}
        </h3>

        <EmptyState
          v-if="categoriesStore.expenseCategories.length === 0"
          :message="t('categories.noExpenseCategories')"
        />

        <div v-else class="space-y-2">
          <div
            v-for="category in categoriesStore.expenseCategories"
            :key="category.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                :style="{ backgroundColor: category.color }"
              >
                {{ category.icon || category.name.charAt(0).toUpperCase() }}
              </div>
              <span class="font-medium text-gray-900">{{ category.name }}</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="handleEditCategory(category)"
                class="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                :aria-label="t('categories.editCategoryAriaLabel')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                @click="confirmDelete(category)"
                class="p-2 text-gray-600 hover:text-red-600 transition-colors"
                :aria-label="t('categories.deleteCategoryAriaLabel')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="modalTitle">
      <CategoryForm
        :initial-data="
          editingCategory
            ? {
                name: editingCategory.name,
                type: editingCategory.type,
                color: editingCategory.color,
                icon: editingCategory.icon,
              }
            : undefined
        "
        :submit-label="submitLabel"
        @submit="handleSubmit"
        @cancel="closeModal"
      />
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteConfirm" :title="t('categories.deleteTitle')" max-width="max-w-sm">
      <div class="space-y-4">
        <p class="text-gray-700">
          {{ t('categories.deleteConfirmation', { name: categoryToDelete?.name }) }}
        </p>
        <p class="text-sm text-amber-600">
          {{ t('categories.deleteWarning') }}
        </p>
        <div class="flex gap-3 pt-2">
          <button @click="handleDelete" class="btn btn-primary bg-red-600 flex-1">
            {{ t('common.delete') }}
          </button>
          <button @click="cancelDelete" class="btn btn-secondary flex-1">
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </Modal>
  </AppLayout>
</template>
