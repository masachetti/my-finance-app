# Sub-Categories Feature Planning

## Overview

This feature adds optional sub-categories to the existing category system, allowing users to better segregate and organize their transactions with more granular classification.

## Core Requirements

- Categories can have multiple sub-categories (one-to-many relationship)
- Sub-categories are **optional** for transactions
- Sub-categories inherit the type (income/expense) from their parent category
- Users can create, edit, and delete sub-categories
- Existing transactions without sub-categories remain valid

## Data Model Changes

### New Table: `sub_categories`

```typescript
interface SubCategory {
  id: string // UUID primary key
  user_id: string // UUID, references auth.users(id)
  category_id: string // UUID, references categories(id)
  name: string // Sub-category name (e.g., "Groceries", "Restaurants")
  created_at: string // Timestamp
  updated_at: string // Timestamp
}
```

### Updated: `transactions` Table

Add new optional column:

- `sub_category_id` (UUID, nullable, references sub_categories(id))

## Database Constraints & Rules

1. **Cascade Deletion**:
   - If a category is deleted → all its sub-categories are deleted
   - If a sub-category is deleted → transactions keep the parent category but lose the sub-category reference (set to NULL)

2. **Validation**:
   - Sub-category must belong to the same user as the transaction
   - Sub-category's parent category must match the transaction's category
   - Sub-category names must be unique within a category

3. **RLS Policies**:
   - All sub-categories filtered by `auth.uid() = user_id`
   - Users can only reference their own sub-categories in transactions

## UI/UX Changes

### Category Management Page

**New Section**: Sub-categories under each category

```
Income Categories
├─ Salary
│  ├─ Base Salary (sub-category)
│  ├─ Bonus (sub-category)
│  └─ [+ Add Sub-category]
├─ Freelance
└─ [+ Add Category]

Expense Categories
├─ Food
│  ├─ Groceries (sub-category)
│  ├─ Restaurants (sub-category)
│  └─ [+ Add Sub-category]
├─ Transport
│  ├─ Gas (sub-category)
│  ├─ Public Transit (sub-category)
│  └─ [+ Add Sub-category]
└─ [+ Add Category]
```

**Actions**:

- Click category → expand/collapse sub-categories
- Add sub-category button (only visible when category is expanded)
- Edit/delete sub-category (same UI pattern as categories)
- Drag-and-drop reordering (optional future enhancement)

### Transaction Forms (Add/Edit)

**Current**:

```
Category: [Dropdown: Food, Transport, Salary, etc.]
```

**New**:

```
Category: [Dropdown: Food, Transport, Salary, etc.]
Sub-category: [Dropdown: (Optional) None, Groceries, Restaurants] ← Only shows sub-categories for selected category
```

**Behavior**:

- Sub-category dropdown is disabled until a category is selected
- Sub-category options filter based on selected category
- "None" or "(Optional)" is the default value
- Changing category clears the sub-category selection

### Transaction List/Table

**Display**:

Badge:

```
Food [Groceries]    R$ 45,00    2024-01-15
Transport           R$ 30,00    2024-01-14
Food [Restaurants]  R$ 120,00   2024-01-13
```

**Recommended**: Option A (arrow separator) for cleaner visual hierarchy

### Dashboard & Reports

**Budget Tracking**:

- Budgets remain at category level (no sub-category budgets initially)
- Reports can show sub-category breakdown within category totals

**Example Report View**:

```
Food: R$ 1,200 / R$ 1,500 (80%)
  ├─ Groceries: R$ 800
  ├─ Restaurants: R$ 350
  └─ Delivery: R$ 50

Transport: R$ 400 / R$ 500 (80%)
  ├─ Gas: R$ 300
  └─ Public Transit: R$ 100
```

## Type Definitions

### New Types (`src/types/database.ts`)

```typescript
// Add to Database['public']['Tables']
sub_categories: {
  Row: {
    id: string
    user_id: string
    category_id: string
    name: string
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    category_id: string
    name: string
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    category_id?: string
    name?: string
    created_at?: string
    updated_at?: string
  }
}
```

### Extended Transaction Type

```typescript
// Extend existing Transaction type
interface Transaction {
  // ... existing fields
  sub_category_id?: string | null

  // Joins
  categories?: Category
  sub_categories?: SubCategory | null
}
```

## Component Architecture

### New Components

1. **`SubCategoryManager.vue`** (`src/components/categories/`)
   - Nested list under each category
   - Add/edit/delete sub-category functionality
   - Inline editing support

2. **`SubCategorySelect.vue`** (`src/components/forms/`)
   - Reusable dropdown for sub-category selection
   - Auto-filters by selected category
   - Handles optional state

### Modified Components

1. **`CategoryManager.vue`**
   - Integrate `SubCategoryManager` as child component
   - Expand/collapse state management

2. **`TransactionForm.vue`**
   - Add sub-category select field
   - Reset sub-category when category changes
   - Validate sub-category belongs to category

3. **`TransactionList.vue`** / **`TransactionTable.vue`**
   - Display sub-category with arrow separator
   - Handle null sub-category gracefully

4. **Dashboard components** (optional enhancement)
   - Show sub-category breakdown in charts
   - Filter transactions by sub-category

## Store Updates

### Category Store (`src/stores/categories.ts`)

Add sub-category management:

```typescript
interface CategoryStore {
  // Existing
  categories: Category[]

  // New
  subCategories: SubCategory[]

  // New Actions
  fetchSubCategories: () => Promise<void>
  createSubCategory: (categoryId: string, name: string) => Promise<SubCategory>
  updateSubCategory: (id: string, name: string) => Promise<void>
  deleteSubCategory: (id: string) => Promise<void>
  getSubCategoriesByCategory: (categoryId: string) => SubCategory[]
}
```

**Optimization**: Load sub-categories with categories in a single query using Supabase joins:

```typescript
const { data } = await supabase
  .from('categories')
  .select(
    `
    *,
    sub_categories (*)
  `
  )
  .order('name')
```

## Query Patterns

### Fetch Transactions with Category & Sub-Category

```typescript
const { data } = await supabase
  .from('transactions')
  .select(
    `
    *,
    categories (id, name, type, color),
    sub_categories (id, name)
  `
  )
  .order('date', { ascending: false })
```

### Create Transaction with Sub-Category

```typescript
const { data, error } = await supabase.from('transactions').insert({
  user_id: authStore.user!.id,
  category_id: categoryId,
  sub_category_id: subCategoryId || null, // Optional
  amount: 100,
  date: '2024-01-01',
  type: 'expense',
})
```

### Get Category with Sub-Categories

```typescript
const { data } = await supabase
  .from('categories')
  .select(
    `
    *,
    sub_categories (*)
  `
  )
  .eq('id', categoryId)
  .single()
```

## Migration Strategy

### Phase 1: Database Setup

1. Create `sub_categories` table with RLS policies
2. Add `sub_category_id` column to `transactions` table
3. Run migration script (see `sub-categories-supabase.md`)

### Phase 2: Backend Integration

1. Update TypeScript types (`src/types/database.ts`)
2. Update category store with sub-category methods
3. Test CRUD operations for sub-categories

### Phase 3: UI Components

1. Create `SubCategoryManager.vue` component
2. Create `SubCategorySelect.vue` component
3. Update `CategoryManager.vue` to show sub-categories
4. Update `TransactionForm.vue` with sub-category field

### Phase 4: Display & Reports

1. Update transaction list/table to show sub-categories
2. Add sub-category breakdown to dashboard (optional)
3. Add filtering by sub-category (optional)

### Phase 5: Testing & Polish

1. Test cascade deletion behavior
2. Test foreign key constraints
3. Verify RLS policies work correctly
4. Add i18n translations (pt-BR and en)
5. Mobile responsive testing

## i18n Keys

### Portuguese (pt-BR)

```json
{
  "subCategories": {
    "title": "Subcategorias",
    "add": "Adicionar Subcategoria",
    "edit": "Editar Subcategoria",
    "delete": "Excluir Subcategoria",
    "name": "Nome da Subcategoria",
    "optional": "Opcional",
    "none": "Nenhuma",
    "select": "Selecione uma subcategoria",
    "deleteConfirm": "Tem certeza que deseja excluir esta subcategoria?",
    "deleteWarning": "As transações manterão a categoria principal."
  }
}
```

### English (en)

```json
{
  "subCategories": {
    "title": "Sub-categories",
    "add": "Add Sub-category",
    "edit": "Edit Sub-category",
    "delete": "Delete Sub-category",
    "name": "Sub-category Name",
    "optional": "Optional",
    "none": "None",
    "select": "Select a sub-category",
    "deleteConfirm": "Are you sure you want to delete this sub-category?",
    "deleteWarning": "Transactions will keep the parent category."
  }
}
```

## Edge Cases & Validation

### Business Rules

1. **Sub-category without category**: Not allowed (enforced by foreign key)
2. **Transaction with sub-category but different category**: Not allowed (enforce in form validation)
3. **Delete category with sub-categories**: Cascade delete all sub-categories
4. **Delete sub-category with transactions**: Set `sub_category_id` to NULL in transactions
5. **Duplicate sub-category names**: Allowed across different categories, but not within the same category

### Form Validation

```typescript
// In TransactionForm.vue
const validateSubCategory = (categoryId: string, subCategoryId?: string) => {
  if (!subCategoryId) return true // Optional

  const subCategory = categoryStore.subCategories.find((sc) => sc.id === subCategoryId)
  if (!subCategory) return false

  return subCategory.category_id === categoryId
}
```

## Performance Considerations

1. **Eager Loading**: Load sub-categories with categories to avoid N+1 queries
2. **Caching**: Store sub-categories in Pinia store to minimize API calls
3. **Indexing**: Database indexes on `category_id` and `user_id` for fast lookups
4. **Lazy Loading**: Only fetch sub-categories when category section is expanded (optional optimization)

## Future Enhancements (Out of Scope)

- Sub-category level budgets
- Sub-category icons/colors (inherit from parent for now)
- Multi-level sub-categories (sub-sub-categories)
- Bulk import/export of sub-categories
- Sub-category usage statistics
- Automatic sub-category suggestions based on transaction descriptions

## Testing Checklist

- [ ] Create sub-category for existing category
- [ ] Edit sub-category name
- [ ] Delete sub-category (transactions should keep category)
- [ ] Delete category with sub-categories (cascade delete)
- [ ] Create transaction with sub-category
- [ ] Create transaction without sub-category (optional)
- [ ] Edit transaction to add sub-category
- [ ] Edit transaction to remove sub-category
- [ ] Change transaction category (should clear sub-category)
- [ ] Sub-category dropdown filters by selected category
- [ ] RLS policies prevent access to other users' sub-categories
- [ ] Mobile responsive layout
- [ ] i18n strings display correctly (pt-BR and en)

## References

- Database schema: `docs/sub-categories-supabase.md`
- Main schema documentation: `docs/supabase-schema.md`
- Category management: `src/stores/categories.ts`
- Transaction types: `src/types/database.ts`
