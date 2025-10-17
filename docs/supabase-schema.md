# Supabase Database Schema

**Last Updated:** 2025-10-17
**Schema Version:** 1.0.0

This document describes the current database schema for the My Finance App. All tables use Row Level Security (RLS) to ensure single-user data isolation.

## Overview

The database consists of 4 main tables:
- `profiles` - User profile information
- `categories` - Income/expense categories
- `transactions` - Financial transaction records
- `budgets` - Monthly budget limits

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

### `transactions`

Stores all financial transactions (income and expenses).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique transaction ID |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE CASCADE, NOT NULL | Reference to authenticated user |
| `category_id` | UUID | REFERENCES categories(id) ON DELETE SET NULL | Reference to category |
| `amount` | DECIMAL(12, 2) | NOT NULL | Transaction amount (positive value) |
| `description` | TEXT | NULL | Optional transaction description |
| `date` | DATE | NOT NULL | Transaction date |
| `type` | TEXT | NOT NULL, CHECK (type IN ('income', 'expense')) | Transaction type |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id` for filtering
- Index on `date` for date range queries
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

## Database Triggers

### `update_updated_at_column()`

Automatically updates the `updated_at` timestamp on row updates.

**Applied to:**
- `profiles` table
- `transactions` table
- `budgets` table

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

---

## Common Query Patterns

### Fetching User Transactions
```typescript
// RLS automatically filters by auth.uid()
const { data, error } = await supabase
  .from('transactions')
  .select('*, categories(*)')
  .order('date', { ascending: false })
```

### Inserting a Transaction
```typescript
const { data, error } = await supabase
  .from('transactions')
  .insert({
    user_id: authStore.user!.id,
    category_id: categoryId,
    amount: 100.50,
    description: 'Grocery shopping',
    date: '2024-01-15',
    type: 'expense'
  })
```

### Monthly Budget Summary
```typescript
const { data, error } = await supabase
  .from('budgets')
  .select('*, categories(*)')
  .eq('month', '2024-01')
```

---

## Migration History

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
- [src/types/database.ts](../src/types/database.ts) - TypeScript type definitions
- [CLAUDE.md](../CLAUDE.md) - Development guidelines and architecture
