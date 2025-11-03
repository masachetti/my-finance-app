<script setup lang="ts">
import { useCategoriesStore } from '@/stores/categories'
import { useI18n } from 'vue-i18n'
import type { SubCategory } from '@/types/database'

const props = defineProps<{
  categoryId: string
}>()

const { t } = useI18n()
const categoriesStore = useCategoriesStore()

// State
const isAdding = ref(false)
const newSubCategoryName = ref('')
const editingId = ref<string | null>(null)
const editingName = ref('')
const deletingId = ref<string | null>(null)

// Get sub-categories for this category
const subCategories = computed(() =>
  categoriesStore.getSubCategoriesByCategory(props.categoryId)
)

// Add new sub-category
async function handleAdd() {
  if (!newSubCategoryName.value.trim()) return

  const result = await categoriesStore.createSubCategory(
    props.categoryId,
    newSubCategoryName.value.trim()
  )

  if (result) {
    newSubCategoryName.value = ''
    isAdding.value = false
  }
}

// Start editing
function startEdit(subCategory: SubCategory) {
  editingId.value = subCategory.id
  editingName.value = subCategory.name
}

// Cancel editing
function cancelEdit() {
  editingId.value = null
  editingName.value = ''
}

// Save edit
async function saveEdit() {
  if (!editingId.value || !editingName.value.trim()) return

  const result = await categoriesStore.updateSubCategory(editingId.value, editingName.value.trim())

  if (result) {
    editingId.value = null
    editingName.value = ''
  }
}

// Delete sub-category
async function handleDelete(id: string) {
  deletingId.value = id
}

// Confirm delete
async function confirmDelete() {
  if (!deletingId.value) return

  const result = await categoriesStore.deleteSubCategory(deletingId.value)

  if (result) {
    deletingId.value = null
  }
}

// Cancel delete
function cancelDelete() {
  deletingId.value = null
}

// Cancel add
function cancelAdd() {
  isAdding.value = false
  newSubCategoryName.value = ''
}
</script>

<template>
  <div class="ml-6 mt-2 space-y-2">
    <!-- Sub-category list -->
    <div v-if="subCategories.length > 0" class="space-y-1">
      <div
        v-for="subCategory in subCategories"
        :key="subCategory.id"
        class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700"
      >
        <!-- Editing mode -->
        <div v-if="editingId === subCategory.id" class="flex flex-1 items-center gap-2">
          <input
            v-model="editingName"
            type="text"
            class="input flex-1 text-sm"
            :placeholder="t('subCategories.namePlaceholder')"
            @keyup.enter="saveEdit"
            @keyup.esc="cancelEdit"
          />
          <button
            class="rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700"
            @click="saveEdit"
          >
            {{ t('common.save') }}
          </button>
          <button
            class="rounded bg-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200"
            @click="cancelEdit"
          >
            {{ t('common.cancel') }}
          </button>
        </div>

        <!-- Display mode -->
        <template v-else>
          <span class="text-sm text-gray-700 dark:text-gray-300">
            ├─ {{ subCategory.name }}
          </span>
          <div class="flex gap-2">
            <button
              class="text-blue-600 hover:text-blue-800 dark:text-blue-400"
              :title="t('subCategories.edit')"
              @click="startEdit(subCategory)"
            >
              ✏️
            </button>
            <button
              class="text-red-600 hover:text-red-800 dark:text-red-400"
              :title="t('subCategories.delete')"
              @click="handleDelete(subCategory.id)"
            >
              🗑️
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Empty state -->
    <p v-else class="text-sm text-gray-500">
      {{ t('subCategories.noSubCategories') }}
    </p>

    <!-- Add form -->
    <div v-if="isAdding" class="flex items-center gap-2">
      <input
        v-model="newSubCategoryName"
        type="text"
        class="input flex-1 text-sm"
        :placeholder="t('subCategories.namePlaceholder')"
        @keyup.enter="handleAdd"
        @keyup.esc="cancelAdd"
      />
      <button
        class="rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700"
        @click="handleAdd"
      >
        {{ t('common.create') }}
      </button>
      <button
        class="rounded bg-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200"
        @click="cancelAdd"
      >
        {{ t('common.cancel') }}
      </button>
    </div>

    <!-- Add button -->
    <button
      v-else
      class="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400"
      @click="isAdding = true"
    >
      <span>+</span>
      <span>{{ t('subCategories.add') }}</span>
    </button>

    <!-- Delete confirmation modal -->
    <div
      v-if="deletingId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      @click.self="cancelDelete"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {{ t('subCategories.delete') }}
        </h3>
        <p class="mb-2 text-gray-700 dark:text-gray-300">
          {{ t('subCategories.deleteConfirm') }}
        </p>
        <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
          {{ t('subCategories.deleteWarning') }}
        </p>
        <div class="flex justify-end gap-2">
          <button class="btn-secondary" @click="cancelDelete">
            {{ t('common.cancel') }}
          </button>
          <button class="btn bg-red-600 hover:bg-red-700" @click="confirmDelete">
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
