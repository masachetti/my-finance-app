import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import type { Database, SubCategory, SubCategoryInsert, SubCategoryUpdate } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']
type CategoryInsert = Database['public']['Tables']['categories']['Insert']
type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const subCategories = ref<SubCategory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()

  // Computed: Filter by type
  const incomeCategories = computed(() =>
    categories.value.filter((c) => c.type === 'income')
  )

  const expenseCategories = computed(() =>
    categories.value.filter((c) => c.type === 'expense')
  )

  // Fetch all categories for authenticated user
  async function fetchCategories() {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select(`
          *,
          sub_categories (*)
        `)
        .order('name', { ascending: true })

      if (fetchError) throw fetchError

      categories.value = data || []

      // Flatten sub-categories from all categories
      subCategories.value = data?.flatMap((cat: any) => cat.sub_categories || []) || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch categories'
      console.error('Error fetching categories:', err)
    } finally {
      loading.value = false
    }
  }

  // Create new category
  async function createCategory(categoryData: Omit<CategoryInsert, 'user_id'>) {
    if (!authStore.user) {
      error.value = 'User not authenticated'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          ...categoryData,
          user_id: authStore.user.id
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (data) {
        categories.value.push(data)
      }

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create category'
      console.error('Error creating category:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Update existing category
  async function updateCategory(id: string, updates: CategoryUpdate) {
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      if (data) {
        const index = categories.value.findIndex((c) => c.id === id)
        if (index !== -1) {
          categories.value[index] = data
        }
      }

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update category'
      console.error('Error updating category:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete category
  async function deleteCategory(id: string) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      categories.value = categories.value.filter((c) => c.id !== id)

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete category'
      console.error('Error deleting category:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // Get category by ID
  function getCategoryById(id: string) {
    return categories.value.find((c) => c.id === id)
  }

  // ===== SUB-CATEGORY METHODS =====

  // Get sub-categories by category ID
  function getSubCategoriesByCategory(categoryId: string) {
    return subCategories.value.filter((sc) => sc.category_id === categoryId)
  }

  // Get sub-category by ID
  function getSubCategoryById(id: string) {
    return subCategories.value.find((sc) => sc.id === id)
  }

  // Create new sub-category
  async function createSubCategory(categoryId: string, name: string) {
    if (!authStore.user) {
      error.value = 'User not authenticated'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: insertError } = await supabase
        .from('sub_categories')
        .insert({
          user_id: authStore.user.id,
          category_id: categoryId,
          name
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (data) {
        subCategories.value.push(data)
      }

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create sub-category'
      console.error('Error creating sub-category:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Update existing sub-category
  async function updateSubCategory(id: string, name: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('sub_categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      if (data) {
        const index = subCategories.value.findIndex((sc) => sc.id === id)
        if (index !== -1) {
          subCategories.value[index] = data
        }
      }

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update sub-category'
      console.error('Error updating sub-category:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete sub-category
  async function deleteSubCategory(id: string) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('sub_categories')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      subCategories.value = subCategories.value.filter((sc) => sc.id !== id)

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete sub-category'
      console.error('Error deleting sub-category:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    categories,
    subCategories,
    loading,
    error,

    // Computed
    incomeCategories,
    expenseCategories,

    // Actions
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,

    // Sub-category actions
    getSubCategoriesByCategory,
    getSubCategoryById,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory
  }
})
