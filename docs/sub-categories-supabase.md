# Sub-Categories Supabase Migration

## Overview

This document contains the SQL migration scripts and Supabase configuration needed to implement the sub-categories feature.

## Migration Steps

### Step 1: Create `sub_categories` Table

```sql
-- Create sub_categories table
CREATE TABLE IF NOT EXISTS public.sub_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure unique sub-category names within a category for each user
  CONSTRAINT unique_sub_category_per_category UNIQUE (user_id, category_id, name)
);

-- Create indexes for performance
CREATE INDEX idx_sub_categories_user_id ON public.sub_categories(user_id);
CREATE INDEX idx_sub_categories_category_id ON public.sub_categories(category_id);
CREATE INDEX idx_sub_categories_user_category ON public.sub_categories(user_id, category_id);

-- Add comment to table
COMMENT ON TABLE public.sub_categories IS 'Sub-categories for more granular transaction classification';
COMMENT ON COLUMN public.sub_categories.category_id IS 'Parent category - inherits type (income/expense) from parent';
COMMENT ON CONSTRAINT unique_sub_category_per_category ON public.sub_categories IS 'Prevents duplicate sub-category names within the same category for a user';
```

### Step 2: Add `sub_category_id` to `transactions` Table

```sql
-- Add sub_category_id column to transactions table
ALTER TABLE public.transactions
ADD COLUMN sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL;

-- Create index for joins and filtering
CREATE INDEX idx_transactions_sub_category_id ON public.transactions(sub_category_id);

-- Add comment
COMMENT ON COLUMN public.transactions.sub_category_id IS 'Optional sub-category for more granular classification';
```

### Step 3: Create Row Level Security (RLS) Policies

```sql
-- Enable RLS on sub_categories table
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own sub-categories
CREATE POLICY "Users can view their own sub-categories"
  ON public.sub_categories
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own sub-categories
CREATE POLICY "Users can insert their own sub-categories"
  ON public.sub_categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sub-categories
CREATE POLICY "Users can update their own sub-categories"
  ON public.sub_categories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own sub-categories
CREATE POLICY "Users can delete their own sub-categories"
  ON public.sub_categories
  FOR DELETE
  USING (auth.uid() = user_id);
```

### Step 4: Create Trigger for `updated_at` Timestamp

```sql
-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sub_categories
CREATE TRIGGER set_sub_categories_updated_at
  BEFORE UPDATE ON public.sub_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### Step 5: Add Validation Function (Optional but Recommended)

```sql
-- Function to validate that sub-category belongs to the correct category
CREATE OR REPLACE FUNCTION public.validate_transaction_sub_category()
RETURNS TRIGGER AS $$
BEGIN
  -- If sub_category_id is provided, verify it belongs to the selected category
  IF NEW.sub_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.sub_categories
      WHERE id = NEW.sub_category_id
        AND category_id = NEW.category_id
        AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Sub-category must belong to the selected category and user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on transactions table
CREATE TRIGGER validate_sub_category_before_insert_update
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_sub_category();
```

## Rollback Migration (If Needed)

```sql
-- WARNING: This will delete all sub-category data!

-- Drop triggers
DROP TRIGGER IF EXISTS validate_sub_category_before_insert_update ON public.transactions;
DROP TRIGGER IF EXISTS set_sub_categories_updated_at ON public.sub_categories;

-- Drop functions
DROP FUNCTION IF EXISTS public.validate_transaction_sub_category();
-- Note: Don't drop handle_updated_at() if other tables use it

-- Drop column from transactions
ALTER TABLE public.transactions DROP COLUMN IF EXISTS sub_category_id;

-- Drop indexes (will be dropped automatically with table)
-- DROP INDEX IF EXISTS idx_sub_categories_user_id;
-- DROP INDEX IF EXISTS idx_sub_categories_category_id;
-- DROP INDEX IF EXISTS idx_sub_categories_user_category;
-- DROP INDEX IF EXISTS idx_transactions_sub_category_id;

-- Drop table (CASCADE will remove foreign key constraints)
DROP TABLE IF EXISTS public.sub_categories CASCADE;
```

## Data Validation Queries

### After Migration - Verify Setup

```sql
-- Check table exists and has correct structure
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sub_categories'
ORDER BY ordinal_position;

-- Check RLS policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'sub_categories';

-- Check indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('sub_categories', 'transactions')
  AND indexname LIKE '%sub_category%';

-- Check foreign key constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('sub_categories', 'transactions')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

## Testing Queries

### Insert Test Data

```sql
-- Get a test user_id and category_id first
-- Replace these UUIDs with actual values from your database

-- Example: Create sub-categories for "Food" category
INSERT INTO public.sub_categories (user_id, category_id, name)
VALUES
  ('your-user-id-here', 'food-category-id-here', 'Groceries'),
  ('your-user-id-here', 'food-category-id-here', 'Restaurants'),
  ('your-user-id-here', 'food-category-id-here', 'Delivery');

-- Example: Create sub-categories for "Transport" category
INSERT INTO public.sub_categories (user_id, category_id, name)
VALUES
  ('your-user-id-here', 'transport-category-id-here', 'Gas'),
  ('your-user-id-here', 'transport-category-id-here', 'Public Transit'),
  ('your-user-id-here', 'transport-category-id-here', 'Parking');
```

### Query Categories with Sub-Categories

```sql
-- Get all categories with their sub-categories
SELECT
  c.id as category_id,
  c.name as category_name,
  c.type as category_type,
  sc.id as sub_category_id,
  sc.name as sub_category_name
FROM public.categories c
LEFT JOIN public.sub_categories sc ON sc.category_id = c.id
WHERE c.user_id = 'your-user-id-here'
ORDER BY c.name, sc.name;
```

### Query Transactions with Sub-Categories

```sql
-- Get transactions with category and sub-category names
SELECT
  t.id,
  t.description,
  t.amount,
  t.date,
  c.name as category,
  sc.name as sub_category
FROM public.transactions t
JOIN public.categories c ON c.id = t.category_id
LEFT JOIN public.sub_categories sc ON sc.id = t.sub_category_id
WHERE t.user_id = 'your-user-id-here'
ORDER BY t.date DESC
LIMIT 20;
```

### Test Cascade Deletion

```sql
-- Test 1: Delete a sub-category (transactions should keep category, lose sub-category)
-- First, create a test transaction with sub-category
INSERT INTO public.transactions (user_id, category_id, sub_category_id, amount, date, type, description)
VALUES ('your-user-id-here', 'category-id', 'sub-category-id', 100, '2024-01-01', 'expense', 'Test transaction');

-- Delete the sub-category
DELETE FROM public.sub_categories WHERE id = 'sub-category-id';

-- Verify transaction still exists but sub_category_id is NULL
SELECT * FROM public.transactions WHERE description = 'Test transaction';

-- Test 2: Delete a category (should cascade delete sub-categories)
-- First, count sub-categories for a category
SELECT COUNT(*) FROM public.sub_categories WHERE category_id = 'category-id';

-- Delete the category
DELETE FROM public.categories WHERE id = 'category-id';

-- Verify sub-categories are also deleted
SELECT COUNT(*) FROM public.sub_categories WHERE category_id = 'category-id'; -- Should be 0
```

### Test Unique Constraint

```sql
-- This should succeed (different names)
INSERT INTO public.sub_categories (user_id, category_id, name)
VALUES ('user-id', 'category-id', 'Groceries');

-- This should fail (duplicate name in same category)
INSERT INTO public.sub_categories (user_id, category_id, name)
VALUES ('user-id', 'category-id', 'Groceries');
-- ERROR: duplicate key value violates unique constraint "unique_sub_category_per_category"

-- This should succeed (same name but different category)
INSERT INTO public.sub_categories (user_id, category_id, name)
VALUES ('user-id', 'different-category-id', 'Groceries');
```

### Test RLS Policies

```sql
-- As authenticated user, should only see own sub-categories
SELECT * FROM public.sub_categories; -- Should only return current user's sub-categories

-- Trying to insert sub-category for another user should fail
INSERT INTO public.sub_categories (user_id, category_id, name)
VALUES ('different-user-id', 'category-id', 'Hacked'); -- Should fail RLS policy
```

## Performance Considerations

### Expected Index Usage

```sql
-- This query should use idx_sub_categories_user_category
EXPLAIN ANALYZE
SELECT * FROM public.sub_categories
WHERE user_id = 'user-id' AND category_id = 'category-id';

-- This query should use idx_transactions_sub_category_id
EXPLAIN ANALYZE
SELECT * FROM public.transactions
WHERE sub_category_id = 'sub-category-id';
```

### Optimization Notes

1. **Composite Index**: `idx_sub_categories_user_category` optimizes the most common query pattern (fetching sub-categories by user and category)
2. **Foreign Key Indexes**: Automatically improve join performance
3. **RLS Filtering**: Always filters by `user_id`, which is indexed
4. **Eager Loading**: Use Supabase joins to fetch categories + sub-categories in one query

## TypeScript Type Updates

After running the migration, update `src/types/database.ts`:

```typescript
export interface Database {
  public: {
    Tables: {
      // ... existing tables

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

      transactions: {
        Row: {
          // ... existing fields
          sub_category_id?: string | null // NEW FIELD
        }
        Insert: {
          // ... existing fields
          sub_category_id?: string | null // NEW FIELD
        }
        Update: {
          // ... existing fields
          sub_category_id?: string | null // NEW FIELD
        }
      }
    }
  }
}
```

## Common Query Patterns for Frontend

### Fetch Categories with Sub-Categories

```typescript
// In category store or component
const { data, error } = await supabase
  .from('categories')
  .select(`
    *,
    sub_categories (
      id,
      name,
      created_at,
      updated_at
    )
  `)
  .order('name')

// Sub-categories will be ordered by name within their category
```

### Fetch Transactions with Full Details

```typescript
const { data, error } = await supabase
  .from('transactions')
  .select(`
    *,
    categories (
      id,
      name,
      type,
      color
    ),
    sub_categories (
      id,
      name
    )
  `)
  .order('date', { ascending: false })
```

### Create Sub-Category

```typescript
const { data, error } = await supabase
  .from('sub_categories')
  .insert({
    user_id: authStore.user!.id,
    category_id: categoryId,
    name: subCategoryName,
  })
  .select()
  .single()
```

### Update Transaction with Sub-Category

```typescript
const { data, error } = await supabase
  .from('transactions')
  .update({
    sub_category_id: subCategoryId || null, // null to remove sub-category
  })
  .eq('id', transactionId)
```

### Delete Sub-Category

```typescript
// Transactions will automatically have sub_category_id set to NULL
const { error } = await supabase
  .from('sub_categories')
  .delete()
  .eq('id', subCategoryId)
```

## Migration Checklist

- [ ] Run Step 1: Create `sub_categories` table
- [ ] Run Step 2: Add `sub_category_id` to `transactions`
- [ ] Run Step 3: Create RLS policies
- [ ] Run Step 4: Create `updated_at` trigger
- [ ] Run Step 5: Create validation trigger
- [ ] Run validation queries to verify setup
- [ ] Test cascade deletion behavior
- [ ] Test unique constraint
- [ ] Test RLS policies
- [ ] Update `src/types/database.ts` with new types
- [ ] Update `docs/supabase-schema.md` with new table documentation

## Troubleshooting

### Error: "Sub-category must belong to the selected category and user"

This validation trigger ensures data integrity. Make sure:
- The sub-category exists
- The sub-category's `category_id` matches the transaction's `category_id`
- The sub-category's `user_id` matches the transaction's `user_id`

### Error: "duplicate key value violates unique constraint"

You're trying to create a sub-category with a name that already exists for that category and user. Either:
- Choose a different name
- Update the existing sub-category instead
- Delete the old sub-category first

### RLS Policy Blocks Query

Ensure you're authenticated with Supabase before querying:
- Check that `auth.uid()` returns a valid user ID
- Verify the user_id in the sub_category matches the authenticated user
- Check that RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'sub_categories'`

## References

- Main feature planning: `docs/sub-categories.md`
- Database schema documentation: `docs/supabase-schema.md`
- Supabase RLS documentation: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL CASCADE options: https://www.postgresql.org/docs/current/ddl-constraints.html
