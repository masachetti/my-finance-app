# Supabase Setup for Recurrent Transactions Feature

**Document Version:** 1.0.0
**Created:** 2025-10-18
**Status:** Ready for Implementation

## Overview

This document provides step-by-step instructions for setting up the database schema in Supabase to support the recurrent transactions feature. You will need to execute the SQL scripts provided below in your Supabase SQL Editor.

## Prerequisites

- Access to your Supabase project dashboard
- Database access with sufficient permissions to create tables and policies
- The `uuid-ossp` extension should be enabled (usually enabled by default)

## Setup Instructions

### Step 1: Access Supabase SQL Editor

1. Log in to your Supabase dashboard at https://supabase.com
2. Select your project
3. Navigate to the **SQL Editor** in the left sidebar
4. Click "New Query" to create a new SQL script

### Step 2: Execute the Migration Script

Copy and paste the following SQL script into the SQL Editor and click **Run** (or press Ctrl/Cmd + Enter):

```sql
-- ============================================================================
-- RECURRENT TRANSACTIONS FEATURE - DATABASE MIGRATION
-- Version: 1.0.0
-- Created: 2025-10-18
-- ============================================================================

-- Create recurrent_transactions table
CREATE TABLE IF NOT EXISTS recurrent_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE CHECK (end_date IS NULL OR end_date >= start_date),
  last_generated_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints for frequency-specific fields
  CONSTRAINT check_weekly_has_day_of_week CHECK (
    (frequency != 'weekly') OR (day_of_week IS NOT NULL)
  ),
  CONSTRAINT check_monthly_has_day_of_month CHECK (
    (frequency != 'monthly') OR (day_of_month IS NOT NULL)
  ),
  CONSTRAINT check_daily_no_days CHECK (
    (frequency != 'daily') OR (day_of_week IS NULL AND day_of_month IS NULL)
  )
);

-- Create indexes for recurrent_transactions
CREATE INDEX IF NOT EXISTS idx_recurrent_transactions_user_id
  ON recurrent_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrent_transactions_is_active
  ON recurrent_transactions(is_active);
CREATE INDEX IF NOT EXISTS idx_recurrent_transactions_composite
  ON recurrent_transactions(user_id, is_active, start_date);

-- Create pending_recurrent_approvals table
CREATE TABLE IF NOT EXISTS pending_recurrent_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurrent_transaction_id UUID NOT NULL REFERENCES recurrent_transactions(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  is_approved BOOLEAN DEFAULT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate approvals for same recurrence and date
  CONSTRAINT unique_approval_per_date UNIQUE (recurrent_transaction_id, scheduled_date)
);

-- Create indexes for pending_recurrent_approvals
CREATE INDEX IF NOT EXISTS idx_pending_approvals_user_id
  ON pending_recurrent_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_is_approved
  ON pending_recurrent_approvals(is_approved);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_recurrent_id
  ON pending_recurrent_approvals(recurrent_transaction_id);

-- Add recurrent_transaction_id to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS recurrent_transaction_id UUID
  REFERENCES recurrent_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_recurrent_id
  ON transactions(recurrent_transaction_id);

-- Add update trigger to recurrent_transactions
-- First, create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Then create the trigger
DROP TRIGGER IF EXISTS update_recurrent_transactions_updated_at ON recurrent_transactions;
CREATE TRIGGER update_recurrent_transactions_updated_at
  BEFORE UPDATE ON recurrent_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE recurrent_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_recurrent_approvals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Users can view their own recurrent transactions" ON recurrent_transactions;
DROP POLICY IF EXISTS "Users can insert their own recurrent transactions" ON recurrent_transactions;
DROP POLICY IF EXISTS "Users can update their own recurrent transactions" ON recurrent_transactions;
DROP POLICY IF EXISTS "Users can delete their own recurrent transactions" ON recurrent_transactions;

DROP POLICY IF EXISTS "Users can view their own pending approvals" ON pending_recurrent_approvals;
DROP POLICY IF EXISTS "Users can insert their own pending approvals" ON pending_recurrent_approvals;
DROP POLICY IF EXISTS "Users can update their own pending approvals" ON pending_recurrent_approvals;
DROP POLICY IF EXISTS "Users can delete their own pending approvals" ON pending_recurrent_approvals;

-- RLS Policies for recurrent_transactions
CREATE POLICY "Users can view their own recurrent transactions"
  ON recurrent_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurrent transactions"
  ON recurrent_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurrent transactions"
  ON recurrent_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurrent transactions"
  ON recurrent_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for pending_recurrent_approvals
CREATE POLICY "Users can view their own pending approvals"
  ON pending_recurrent_approvals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pending approvals"
  ON pending_recurrent_approvals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending approvals"
  ON pending_recurrent_approvals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending approvals"
  ON pending_recurrent_approvals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('recurrent_transactions', 'pending_recurrent_approvals')
ORDER BY table_name;

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('recurrent_transactions', 'pending_recurrent_approvals')
ORDER BY tablename;

-- Verify column was added to transactions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'recurrent_transaction_id';

-- Verify indexes were created
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%recurrent%' OR
    indexname LIKE '%pending_approvals%'
  )
ORDER BY tablename, indexname;

-- Verify RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('recurrent_transactions', 'pending_recurrent_approvals')
ORDER BY tablename, policyname;
```

### Step 3: Verify Setup

After running the migration script, the verification queries at the end should display:

1. **Tables Created**: You should see `recurrent_transactions` and `pending_recurrent_approvals` in the results
2. **RLS Enabled**: Both tables should show `rowsecurity = true`
3. **Transaction Column**: The `recurrent_transaction_id` column should appear in the `transactions` table
4. **Indexes**: You should see several indexes created for performance
5. **Policies**: You should see 8 RLS policies (4 for each table)

### Step 4: Test the Setup (Optional)

You can test the setup by running these queries:

```sql
-- Test: Create a sample recurrent transaction (replace with your user_id)
INSERT INTO recurrent_transactions (
  user_id,
  category_id,
  amount,
  description,
  type,
  frequency,
  day_of_month,
  start_date,
  requires_approval
) VALUES (
  auth.uid(),  -- This will use the authenticated user
  (SELECT id FROM categories WHERE user_id = auth.uid() LIMIT 1),
  100.00,
  'Test monthly subscription',
  'expense',
  'monthly',
  15,
  CURRENT_DATE,
  false
);

-- Test: View your recurrent transactions
SELECT * FROM recurrent_transactions WHERE user_id = auth.uid();

-- Test: Clean up (delete the test record)
DELETE FROM recurrent_transactions
WHERE user_id = auth.uid()
  AND description = 'Test monthly subscription';
```

## Database Schema Reference

### Table: `recurrent_transactions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reference to authenticated user |
| `category_id` | UUID | Reference to category (nullable) |
| `amount` | DECIMAL(12,2) | Transaction amount |
| `description` | TEXT | Optional description |
| `type` | TEXT | 'income' or 'expense' |
| `frequency` | TEXT | 'daily', 'weekly', or 'monthly' |
| `day_of_week` | INTEGER | 0-6 for weekly (0=Sunday) |
| `day_of_month` | INTEGER | 1-31 for monthly |
| `requires_approval` | BOOLEAN | Whether approval is needed |
| `is_active` | BOOLEAN | Whether recurrence is active |
| `start_date` | DATE | When recurrence starts |
| `end_date` | DATE | Optional end date |
| `last_generated_date` | DATE | Last date transaction was generated |
| `created_at` | TIMESTAMPTZ | Record creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

### Table: `pending_recurrent_approvals`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reference to authenticated user |
| `recurrent_transaction_id` | UUID | Reference to recurrence |
| `scheduled_date` | DATE | When transaction should be created |
| `is_approved` | BOOLEAN | NULL=pending, true=approved, false=rejected |
| `approved_at` | TIMESTAMPTZ | When approved/rejected |
| `created_at` | TIMESTAMPTZ | Record creation time |

### Modified Table: `transactions`

New column added:
- `recurrent_transaction_id` (UUID, nullable) - References the source recurrence if auto-generated

## Security Considerations

1. **Row Level Security (RLS)**: All tables have RLS enabled with policies that ensure users can only access their own data
2. **User Scoping**: Every record must have a `user_id` that matches `auth.uid()`
3. **Cascading Deletes**: When a user is deleted, all their recurrent transactions and approvals are automatically deleted
4. **Set NULL on Category Delete**: If a category is deleted, the recurrence remains but loses its category association

## Troubleshooting

### Error: "relation does not exist"
- Make sure you're running the script in the correct project
- Verify that the `categories` and `transactions` tables exist

### Error: "permission denied"
- Ensure you're logged in as a database owner or have sufficient permissions
- Try running the queries through the Supabase SQL Editor (not through the application)

### Error: "column already exists"
- This is safe to ignore if you're re-running the migration
- The script uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` clauses

### RLS Policies Not Working
- Verify RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'recurrent_transactions';`
- Check if policies exist: `SELECT * FROM pg_policies WHERE tablename = 'recurrent_transactions';`
- Make sure you're testing with an authenticated user (not anonymous)

## Next Steps

After completing this setup:

1. The frontend application should now be able to create and manage recurrent transactions
2. Test the feature by:
   - Creating a recurrent transaction
   - Verifying it appears in the list
   - Checking that pending approvals show up if enabled
   - Confirming that transactions are auto-generated on the scheduled date

## Rollback Instructions

If you need to remove the recurrent transactions feature:

```sql
-- WARNING: This will permanently delete all recurrent transactions data

-- Drop foreign key from transactions table
ALTER TABLE transactions DROP COLUMN IF EXISTS recurrent_transaction_id;

-- Drop tables (cascades to dependent objects)
DROP TABLE IF EXISTS pending_recurrent_approvals CASCADE;
DROP TABLE IF EXISTS recurrent_transactions CASCADE;

-- Verify cleanup
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%recurrent%';
```

## Support

If you encounter any issues:
1. Check the Supabase logs in the Dashboard > Logs section
2. Review the RLS policies to ensure they're correctly configured
3. Verify that your application's environment variables are correctly set
4. Test queries directly in the SQL Editor to isolate issues

---

**Document End**
