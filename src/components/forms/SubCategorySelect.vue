<script setup lang="ts">
import { useCategoriesStore } from '@/stores/categories'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue: string | null
  categoryId: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { t } = useI18n()
const categoriesStore = useCategoriesStore()

// Get sub-categories filtered by the selected category
const filteredSubCategories = computed(() => {
  if (!props.categoryId) return []
  return categoriesStore.getSubCategoriesByCategory(props.categoryId)
})

// Handle sub-category selection
function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value === '' ? null : target.value
  emit('update:modelValue', value)
}

// Watch for category changes and reset sub-category
watch(
  () => props.categoryId,
  () => {
    // Clear sub-category when category changes
    if (props.modelValue) {
      emit('update:modelValue', null)
    }
  }
)
</script>

<template>
  <div>
    <label for="sub-category" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ t('forms.transaction.subCategory') }}
    </label>
    <select
      id="sub-category"
      :value="modelValue || ''"
      :disabled="disabled || !categoryId || filteredSubCategories.length === 0"
      class="input mt-1 block w-full"
      @change="handleChange"
    >
      <option value="">{{ t('forms.transaction.subCategoryPlaceholder') }}</option>
      <option
        v-for="subCategory in filteredSubCategories"
        :key="subCategory.id"
        :value="subCategory.id"
      >
        {{ subCategory.name }}
      </option>
    </select>
    <p v-if="!categoryId" class="mt-1 text-sm text-gray-500">
      {{ t('forms.transaction.categoryPlaceholder') }}
    </p>
    <p v-else-if="filteredSubCategories.length === 0" class="mt-1 text-sm text-gray-500">
      {{ t('subCategories.noSubCategories') }}
    </p>
  </div>
</template>
