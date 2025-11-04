# Events Feature - Supabase Migration Guide

**Migration Version:** 1.2.0
**Created:** 2025-11-04
**Related:** [events.md](./events.md)

## Overview

This document contains the complete SQL migration scripts to implement the Events feature, including:
1. Creating the `events` table
2. Adding `event_id` column to the `transactions` table
3. Setting up Row Level Security (RLS) policies
4. Creating indexes for performance
5. Adding database triggers for data integrity

## Migration Scripts

### Step 1: Create the `events` table

```sql
-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure end_date is after or equal to start_date
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Add comment to table
COMMENT ON TABLE public.events IS 'Stores user events for grouping related transactions';

-- Add comments to columns
COMMENT ON COLUMN public.events.id IS 'Unique event identifier';
COMMENT ON COLUMN public.events.user_id IS 'Reference to the user who owns this event';
COMMENT ON COLUMN public.events.name IS 'Event name (e.g., Trip to Paris)';
COMMENT ON COLUMN public.events.description IS 'Optional detailed description of the event';
COMMENT ON COLUMN public.events.start_date IS 'Event start date';
COMMENT ON COLUMN public.events.end_date IS 'Event end date (NULL for open-ended events)';
COMMENT ON COLUMN public.events.color IS 'Hex color code for UI display';
COMMENT ON COLUMN public.events.icon IS 'Optional icon identifier';
COMMENT ON COLUMN public.events.created_at IS 'Timestamp when event was created';
COMMENT ON COLUMN public.events.updated_at IS 'Timestamp when event was last updated';
```

### Step 2: Create indexes for performance

```sql
-- Index on user_id for filtering
CREATE INDEX IF NOT EXISTS idx_events_user_id
  ON public.events(user_id);

-- Index on start_date for date range queries
CREATE INDEX IF NOT EXISTS idx_events_start_date
  ON public.events(start_date);

-- Index on end_date for filtering active/completed events
CREATE INDEX IF NOT EXISTS idx_events_end_date
  ON public.events(end_date);

-- Composite index for user-specific date range queries
CREATE INDEX IF NOT EXISTS idx_events_user_dates
  ON public.events(user_id, start_date, end_date);
```

### Step 3: Add `updated_at` trigger

```sql
-- Apply the update_updated_at_column trigger to events table
-- (Assumes the trigger function already exists from previous migrations)
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Step 4: Enable Row Level Security (RLS)

```sql
-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own events
CREATE POLICY "Users can view their own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert their own events"
  ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own events
CREATE POLICY "Users can update their own events"
  ON public.events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete their own events"
  ON public.events
  FOR DELETE
  USING (auth.uid() = user_id);
```

### Step 5: Add `event_id` to transactions table

```sql
-- Add event_id column to transactions table
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS event_id UUID
  REFERENCES public.events(id) ON DELETE SET NULL;

-- Add comment to column
COMMENT ON COLUMN public.transactions.event_id IS 'Optional reference to an event that this transaction is associated with';

-- Create index on event_id for filtering transactions by event
CREATE INDEX IF NOT EXISTS idx_transactions_event_id
  ON public.transactions(event_id);

-- Composite index for user-event queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_event
  ON public.transactions(user_id, event_id);
```

### Step 6: Create validation trigger for event ownership

```sql
-- Function to validate that event belongs to the same user as the transaction
CREATE OR REPLACE FUNCTION validate_transaction_event_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- If event_id is NULL, no validation needed
  IF NEW.event_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check that the event belongs to the same user
  IF NOT EXISTS (
    SELECT 1
    FROM public.events
    WHERE id = NEW.event_id
      AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Event must belong to the same user as the transaction';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to transactions table
CREATE TRIGGER validate_transaction_event
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_event_ownership();
```

## Complete Migration Script

Here's the complete migration script that can be run all at once:

```sql
-- ============================================
-- Events Feature Migration - Version 1.2.0
-- Created: 2025-11-04
-- ============================================

BEGIN;

-- Step 1: Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE public.events IS 'Stores user events for grouping related transactions';
COMMENT ON COLUMN public.events.id IS 'Unique event identifier';
COMMENT ON COLUMN public.events.user_id IS 'Reference to the user who owns this event';
COMMENT ON COLUMN public.events.name IS 'Event name (e.g., Trip to Paris)';
COMMENT ON COLUMN public.events.description IS 'Optional detailed description of the event';
COMMENT ON COLUMN public.events.start_date IS 'Event start date';
COMMENT ON COLUMN public.events.end_date IS 'Event end date (NULL for open-ended events)';
COMMENT ON COLUMN public.events.color IS 'Hex color code for UI display';
COMMENT ON COLUMN public.events.icon IS 'Optional icon identifier';

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON public.events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_user_dates ON public.events(user_id, start_date, end_date);

-- Step 3: Add updated_at trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Enable RLS and create policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id);

-- Step 5: Add event_id to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS event_id UUID
  REFERENCES public.events(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.transactions.event_id IS 'Optional reference to an event that this transaction is associated with';

CREATE INDEX IF NOT EXISTS idx_transactions_event_id ON public.transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_event ON public.transactions(user_id, event_id);

-- Step 6: Create validation trigger
CREATE OR REPLACE FUNCTION validate_transaction_event_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = NEW.event_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Event must belong to the same user as the transaction';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_transaction_event
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_event_ownership();

COMMIT;
```

## Rollback Script

If you need to rollback this migration:

```sql
-- ============================================
-- Events Feature Rollback
-- ============================================

BEGIN;

-- Remove trigger from transactions
DROP TRIGGER IF EXISTS validate_transaction_event ON public.transactions;
DROP FUNCTION IF EXISTS validate_transaction_event_ownership();

-- Remove event_id column from transactions
DROP INDEX IF EXISTS idx_transactions_user_event;
DROP INDEX IF EXISTS idx_transactions_event_id;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS event_id;

-- Drop events table (this will cascade and remove all policies)
DROP TABLE IF EXISTS public.events CASCADE;

COMMIT;
```

## TypeScript Type Definitions

Add these types to `src/types/database.ts`:

```typescript
// Add to Database.public.Tables interface
events: {
  Row: {
    id: string
    user_id: string
    name: string
    description: string | null
    start_date: string  // ISO date string (YYYY-MM-DD)
    end_date: string | null  // ISO date string (YYYY-MM-DD)
    color: string
    icon: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    name: string
    description?: string | null
    start_date: string
    end_date?: string | null
    color?: string
    icon?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    name?: string
    description?: string | null
    start_date?: string
    end_date?: string | null
    color?: string
    icon?: string | null
    created_at?: string
    updated_at?: string
  }
}

// Update transactions Row interface to add:
// event_id: string | null

// Update transactions Insert interface to add:
// event_id?: string | null

// Update transactions Update interface to add:
// event_id?: string | null
```

Add helper types after the Database interface:

```typescript
// Helper types for events
export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

// Helper type for event with transaction count
export interface EventWithStats extends Event {
  transaction_count?: number
  total_income?: number
  total_expenses?: number
  balance?: number
}

// Helper type for transaction with event
export interface TransactionWithEvent
  extends Database['public']['Tables']['transactions']['Row'] {
  events?: Event | null
  categories?: Database['public']['Tables']['categories']['Row']
  sub_categories?: SubCategory | null
}
```

## Common Query Patterns

### Fetch all user events ordered by start date

```typescript
const { data: events, error } = await supabase
  .from('events')
  .select('*')
  .order('start_date', { ascending: false })
```

### Fetch a single event with transaction count and totals

```typescript
const { data, error } = await supabase
  .from('events')
  .select(`
    *,
    transactions (
      id,
      amount,
      type
    )
  `)
  .eq('id', eventId)
  .single()

// Calculate stats in frontend
const transactions = data?.transactions || []
const stats = {
  totalIncome: transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0),
  totalExpenses: transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0),
  transactionCount: transactions.length
}
```

### Fetch transactions for a specific event

```typescript
const { data: transactions, error } = await supabase
  .from('transactions')
  .select(`
    *,
    categories (*),
    sub_categories (*)
  `)
  .eq('event_id', eventId)
  .order('date', { ascending: false })
```

### Link a transaction to an event

```typescript
const { error } = await supabase
  .from('transactions')
  .update({ event_id: eventId })
  .eq('id', transactionId)
```

### Unlink a transaction from an event

```typescript
const { error } = await supabase
  .from('transactions')
  .update({ event_id: null })
  .eq('id', transactionId)
```

### Bulk link multiple transactions to an event

```typescript
const { error } = await supabase
  .from('transactions')
  .update({ event_id: eventId })
  .in('id', transactionIds)
```

### Fetch active events (ongoing or future)

```typescript
const today = new Date().toISOString().split('T')[0]

const { data: activeEvents, error } = await supabase
  .from('events')
  .select('*')
  .lte('start_date', today)
  .or(`end_date.is.null,end_date.gte.${today}`)
  .order('start_date', { ascending: false })
```

### Fetch completed events

```typescript
const today = new Date().toISOString().split('T')[0]

const { data: completedEvents, error } = await supabase
  .from('events')
  .select('*')
  .lt('end_date', today)
  .order('end_date', { ascending: false })
```

### Fetch upcoming events

```typescript
const today = new Date().toISOString().split('T')[0]

const { data: upcomingEvents, error } = await supabase
  .from('events')
  .select('*')
  .gt('start_date', today)
  .order('start_date', { ascending: true })
```

### Delete event (transactions are preserved with event_id = NULL)

```typescript
const { error } = await supabase
  .from('events')
  .delete()
  .eq('id', eventId)
```

### Fetch transactions without an event (orphaned transactions)

```typescript
const { data: orphanedTransactions, error } = await supabase
  .from('transactions')
  .select('*')
  .is('event_id', null)
  .order('date', { ascending: false })
```

## Validation & Testing

### Test RLS Policies

After running the migration, test that RLS policies work correctly:

```sql
-- As authenticated user (replace USER_ID with actual auth.uid())
SET request.jwt.claims.sub = 'USER_ID';

-- Should return only user's events
SELECT * FROM public.events;

-- Should succeed (inserting user's own event)
INSERT INTO public.events (user_id, name, start_date, color)
VALUES ('USER_ID', 'Test Event', '2025-11-01', '#3B82F6');

-- Should fail (inserting event for different user)
INSERT INTO public.events (user_id, name, start_date, color)
VALUES ('DIFFERENT_USER_ID', 'Test Event', '2025-11-01', '#3B82F6');
```

### Test Date Range Constraint

```sql
-- Should succeed (end_date after start_date)
INSERT INTO public.events (user_id, name, start_date, end_date, color)
VALUES (auth.uid(), 'Valid Event', '2025-11-01', '2025-11-10', '#3B82F6');

-- Should fail (end_date before start_date)
INSERT INTO public.events (user_id, name, start_date, end_date, color)
VALUES (auth.uid(), 'Invalid Event', '2025-11-10', '2025-11-01', '#3B82F6');
```

### Test Event Ownership Validation in Transactions

```sql
-- Should succeed (event belongs to user)
UPDATE public.transactions
SET event_id = 'VALID_EVENT_ID'
WHERE id = 'TRANSACTION_ID';

-- Should fail (event belongs to different user)
UPDATE public.transactions
SET event_id = 'DIFFERENT_USER_EVENT_ID'
WHERE id = 'TRANSACTION_ID';
```

### Test ON DELETE SET NULL behavior

```sql
-- Create event and link transaction
INSERT INTO public.events (user_id, name, start_date, color)
VALUES (auth.uid(), 'Test Event', '2025-11-01', '#3B82F6')
RETURNING id;

UPDATE public.transactions
SET event_id = 'EVENT_ID'
WHERE id = 'TRANSACTION_ID';

-- Delete event
DELETE FROM public.events WHERE id = 'EVENT_ID';

-- Verify transaction still exists with event_id = NULL
SELECT event_id FROM public.transactions WHERE id = 'TRANSACTION_ID';
-- Should return NULL
```

## Performance Considerations

1. **Indexes**: The migration includes indexes on frequently queried columns:
   - `user_id` for filtering user events
   - `start_date` and `end_date` for date range queries
   - Composite index on `(user_id, start_date, end_date)` for efficient user-specific date queries
   - `event_id` on transactions table for filtering by event

2. **Query Optimization**:
   - Use `.select()` with specific columns instead of `SELECT *` when possible
   - Avoid N+1 queries by using Supabase joins
   - Use `.single()` when fetching a single record
   - Consider pagination for large event lists

3. **Stats Calculation**:
   - For event stats (totals, counts), consider calculating in the frontend after fetching transactions
   - Alternatively, create a database view or function if stats calculation becomes expensive
   - Cache stats in the store to avoid recalculation

## Migration Checklist

Before running the migration:
- [ ] Backup your database
- [ ] Review the complete migration script
- [ ] Test migration in a development/staging environment first

After running the migration:
- [ ] Verify all tables and columns were created
- [ ] Test RLS policies with authenticated requests
- [ ] Test constraint validation (date range, event ownership)
- [ ] Update TypeScript types in `src/types/database.ts`
- [ ] Update `docs/supabase-schema.md` with new schema version
- [ ] Run test queries to ensure everything works
- [ ] Create a few test events and link transactions

## See Also

- [events.md](./events.md) - Complete feature planning and implementation guide
- [supabase-schema.md](./supabase-schema.md) - Current database schema documentation
- [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) - General Supabase setup instructions

---

**Schema Version After Migration:** 1.2.0
**Migration Date:** 2025-11-04
