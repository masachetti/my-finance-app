# Supabase Database Schema

**Last Updated:** 2025-11-04
**Schema Version:** 1.2.0

This document describes the current database schema for the My Finance App. All tables use Row Level Security (RLS) to ensure single-user data isolation.

## Overview

The database consists of 6 main tables:
- `profiles` - User profile information
- `categories` - Income/expense categories
- `sub_categories` - Sub-categories for granular transaction classification
- `transactions` - Financial transaction records
- `budgets` - Monthly budget limits
- `events` - Event grouping for transactions (trips, projects, etc.)

## Security Model

**CRITICAL:** All tables MUST have:
1. A `user_id` column that references `auth.users(id)`
2. RLS policies that filter by `auth.uid() = user_id`

This ensures that only the authenticated user can access their own data.

## Table Definitions

### `profiles`

Stores extended user profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique profile ID |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE CASCADE, UNIQUE, NOT NULL | Reference to authenticated user |
| `full_name` | TEXT | NULL | User's full name |
| `avatar_url` | TEXT | NULL | URL to user's avatar image |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Profile creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique constraint on `user_id`

**RLS Policies:**
- `Users can view their own profile` - SELECT WHERE auth.uid() = user_id
- `Users can insert their own profile` - INSERT WITH CHECK auth.uid() = user_id
- `Users can update their own profile` - UPDATE WHERE auth.uid() = user_id

---

### `categories`

Stores transaction categories (both income and expense).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique category ID |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE CASCADE, NOT NULL | Reference to authenticated user |
| `name` | TEXT | NOT NULL | Category name |
| `type` | TEXT | NOT NULL, CHECK (type IN ('income', 'expense')) | Category type |
| `color` | TEXT | NOT NULL | Hex color code for UI display |
| `icon` | TEXT | NULL | Icon identifier (optional) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Category creation timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id` for filtering
- Suggested: Composite index on `(user_id, type)` for type filtering

**RLS Policies:**
- `Users can view their own categories` - SELECT WHERE auth.uid() = user_id
- `Users can insert their own categories` - INSERT WITH CHECK auth.uid() = user_id
- `Users can update their own categories` - UPDATE WHERE auth.uid() = user_id
- `Users can delete their own categories` - DELETE WHERE auth.uid() = user_id

---

### `sub_categories`

Stores optional sub-categories for more granular transaction classification. Sub-categories inherit the type (income/expense) from their parent category.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique sub-category ID |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE CASCADE, NOT NULL | Reference to authenticated user |
| `category_id` | UUID | REFERENCES categories(id) ON DELETE CASCADE, NOT NULL | Reference to parent category |
| `name` | TEXT | NOT NULL | Sub-category name |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Sub-category creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id` for filtering
- Index on `category_id` for filtering
- Composite index on `(user_id, category_id)` for efficient lookups
- Unique constraint on `(user_id, category_id, name)` to prevent duplicate sub-category names

**RLS Policies:**
- `Users can view their own sub-categories` - SELECT WHERE auth.uid() = user_id
- `Users can insert their own sub-categories` - INSERT WITH CHECK auth.uid() = user_id
- `Users can update their own sub-categories` - UPDATE WHERE auth.uid() = user_id
- `Users can delete their own sub-categories` - DELETE WHERE auth.uid() = user_id

**Important Notes:**
- Sub-categories are **optional** for transactions
- Unique constraint prevents duplicate sub-category names within the same category
- Sub-category names CAN be duplicated across different categories
- `category_id` uses ON DELETE CASCADE so sub-category is removed if parent category is deleted
- Transactions keep their parent category when a sub-category is deleted (ON DELETE SET NULL)

---

### `transactions`

Stores all financial transactions (income and expenses).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique transaction ID |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE CASCADE, NOT NULL | Reference to authenticated user |
| `category_id` | UUID | REFERENCES categories(id) ON DELETE SET NULL | Reference to category |
| `sub_category_id` | UUID | REFERENCES sub_categories(id) ON DELETE SET NULL, NULL | Optional reference to sub-category |
| `amount` | DECIMAL(12, 2) | NOT NULL | Transaction amount (positive value) |
| `description` | TEXT | NULL | Optional transaction description |
| `date` | DATE | NOT NULL | Transaction date |
| `type` | TEXT | NOT NULL, CHECK (type IN ('income', 'expense')) | Transaction type |
| `event_id` | UUID | REFERENCES events(id) ON DELETE SET NULL, NULL | Optional reference to event |
| `recurrent_transaction_id` | UUID | REFERENCES recurrent_transactions(id) ON DELETE SET NULL, NULL | Optional reference to recurrent transaction |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id` for filtering
- Index on `date` for date range queries
- Index on `sub_category_id` for joins and filtering
- Index on `event_id` for joins and filtering
- Suggested: Composite index on `(user_id, date DESC)` for dashboard queries

**RLS Policies:**
- `Users can view their own transactions` - SELECT WHERE auth.uid() = user_id
- `Users can insert their own transactions` - INSERT WITH CHECK auth.uid() = user_id
- `Users can update their own transactions` - UPDATE WHERE auth.uid() = user_id
- `Users can delete their own transactions` - DELETE WHERE auth.uid() = user_id

**Important Notes:**
- `amount` is always stored as a positive DECIMAL(12,2) value
- Use `currency.js` library for all amount calculations to avoid floating-point errors
- `category_id` uses ON DELETE SET NULL to preserve transaction history if category is deleted
- `sub_category_id` is **optional** and uses ON DELETE SET NULL to preserve transaction history
- `event_id` is **optional** and uses ON DELETE SET NULL to preserve transaction history if event is deleted
- A validation trigger ensures sub-category belongs to the same category and user
- A validation trigger ensures event belongs to the same user

---

### `budgets`

Stores monthly budget limits per category.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique budget ID |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE CASCADE, NOT NULL | Reference to authenticated user |
| `category_id` | UUID | REFERENCES categories(id) ON DELETE CASCADE, NOT NULL | Reference to category |
| `amount` | DECIMAL(12, 2) | NOT NULL | Budget limit amount |
| `month` | TEXT | NOT NULL | Month in YYYY-MM format (e.g., "2024-01") |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Budget creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id` for filtering
- Unique constraint on `(user_id, category_id, month)` to prevent duplicate budgets

**RLS Policies:**
- `Users can view their own budgets` - SELECT WHERE auth.uid() = user_id
- `Users can insert their own budgets` - INSERT WITH CHECK auth.uid() = user_id
- `Users can update their own budgets` - UPDATE WHERE auth.uid() = user_id
- `Users can delete their own budgets` - DELETE WHERE auth.uid() = user_id

**Important Notes:**
- `month` format is strictly YYYY-MM (use `date-fns` to format)
- Unique constraint prevents duplicate budgets for same category/month combination
- `category_id` uses ON DELETE CASCADE so budget is removed if category is deleted

---

### `events`

Stores events for grouping related transactions (e.g., trips, projects, special occasions).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique event ID |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE CASCADE, NOT NULL | Reference to authenticated user |
| `name` | TEXT | NOT NULL | Event name (e.g., "Trip to Paris") |
| `description` | TEXT | NULL | Optional detailed description |
| `start_date` | DATE | NOT NULL | Event start date |
| `end_date` | DATE | NULL | Event end date (NULL for open-ended events) |
| `color` | TEXT | NOT NULL, DEFAULT '#3B82F6' | Hex color code for UI display |
| `icon` | TEXT | NULL | Optional icon/emoji identifier |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Event creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id` for filtering
- Index on `start_date` for date range queries
- Index on `end_date` for filtering active/completed events
- Composite index on `(user_id, start_date, end_date)` for user-specific date range queries

**RLS Policies:**
- `Users can view their own events` - SELECT WHERE auth.uid() = user_id
- `Users can insert their own events` - INSERT WITH CHECK auth.uid() = user_id
- `Users can update their own events` - UPDATE WHERE auth.uid() = user_id
- `Users can delete their own events` - DELETE WHERE auth.uid() = user_id

**Important Notes:**
- `end_date` is **optional** (NULL indicates open-ended event)
- Date range constraint: `end_date` must be >= `start_date` when provided
- Deleting an event sets `event_id` to NULL on linked transactions (preserves transaction history)
- Events are useful for tracking expenses/income for specific projects, trips, or time periods
- Smart filtering in UI shows only events matching transaction dates

---

## Database Triggers

### `update_updated_at_column()`

Automatically updates the `updated_at` timestamp on row updates.

**Applied to:**
- `profiles` table
- `sub_categories` table
- `transactions` table
- `budgets` table
- `events` table

**Trigger Definition:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### `validate_transaction_sub_category()`

Validates that a sub-category belongs to the selected category and user before insert/update.

**Applied to:**
- `transactions` table (BEFORE INSERT OR UPDATE)

**Trigger Definition:**
```sql
CREATE OR REPLACE FUNCTION validate_transaction_sub_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sub_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM sub_categories
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
```

### `validate_transaction_event()`

Validates that an event belongs to the same user before insert/update.

**Applied to:**
- `transactions` table (BEFORE INSERT OR UPDATE)

**Trigger Definition:**
```sql
CREATE OR REPLACE FUNCTION validate_transaction_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM events
      WHERE id = NEW.event_id
        AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Event must belong to the same user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Common Query Patterns

### Fetching User Transactions
```typescript
// RLS automatically filters by auth.uid()
const { data, error } = await supabase
  .from('transactions')
  .select(`
    *,
    categories (*),
    sub_categories (*),
    events (*)
  `)
  .order('date', { ascending: false })
```

### Inserting a Transaction
```typescript
const { data, error } = await supabase
  .from('transactions')
  .insert({
    user_id: authStore.user!.id,
    category_id: categoryId,
    sub_category_id: subCategoryId || null, // Optional
    amount: 100.50,
    description: 'Grocery shopping',
    date: '2024-01-15',
    type: 'expense',
    event_id: eventId || null // Optional - link to event
  })
```

### Fetching Categories with Sub-Categories
```typescript
const { data, error } = await supabase
  .from('categories')
  .select(`
    *,
    sub_categories (*)
  `)
  .order('name')
```

### Monthly Budget Summary
```typescript
const { data, error } = await supabase
  .from('budgets')
  .select('*, categories(*)')
  .eq('month', '2024-01')
```

### Fetching Event Transactions
```typescript
// Get all transactions for a specific event
const { data, error } = await supabase
  .from('transactions')
  .select(`
    *,
    categories (*),
    sub_categories (*)
  `)
  .eq('event_id', eventId)
  .order('date', { ascending: false })
```

### Bulk Linking Transactions to Event
```typescript
// Update multiple transactions to link them to an event
const { error } = await supabase
  .from('transactions')
  .update({ event_id: eventId })
  .in('id', transactionIds)
```

---

## Migration History

### Version 1.2.0 (2025-11-04)
- Added `events` table for grouping transactions by events
- Added `event_id` column to `transactions` table
- Implemented RLS policies for events
- Added `validate_transaction_event()` trigger for data integrity
- Created indexes on `event_id` and event date ranges for performance
- Updated query patterns to include events
- Added bulk transaction linking functionality
- Implemented smart event filtering by transaction date in UI

### Version 1.1.0 (2025-11-03)
- Added `sub_categories` table for granular transaction classification
- Added `sub_category_id` column to `transactions` table
- Implemented RLS policies for sub-categories
- Added `validate_transaction_sub_category()` trigger for data integrity
- Created indexes on `sub_category_id` for performance
- Updated query patterns to include sub-categories

### Version 1.0.0 (2025-10-17)
- Initial schema creation
- Created `profiles`, `categories`, `transactions`, `budgets` tables
- Implemented RLS policies for single-user security
- Added `update_updated_at_column()` trigger
- Created indexes for performance optimization

---

## Future Schema Changes

When modifying the schema:

1. **Always update this document** with the new schema version and changes
2. **Maintain RLS policies** on all new tables with `user_id` filtering
3. **Update TypeScript types** in `src/types/database.ts`
4. **Add migration notes** to the Migration History section
5. **Test RLS policies** to ensure data isolation

---

## See Also

- [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) - Full Supabase setup instructions with SQL scripts
- [docs/sub-categories-supabase.md](sub-categories-supabase.md) - Sub-categories migration guide with SQL scripts
- [docs/sub-categories.md](sub-categories.md) - Sub-categories feature planning and implementation guide
- [docs/events-supabase.md](events-supabase.md) - Events migration guide with SQL scripts
- [docs/events.md](events.md) - Events feature planning and implementation guide
- [src/types/database.ts](../src/types/database.ts) - TypeScript type definitions
- [CLAUDE.md](../CLAUDE.md) - Development guidelines and architecture
