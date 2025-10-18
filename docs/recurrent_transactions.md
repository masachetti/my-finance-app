# Recurrent Transactions Feature

**Document Version:** 1.0.0
**Created:** 2025-10-17
**Status:** Planning

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Database Schema](#database-schema)
4. [Business Logic](#business-logic)
5. [User Interface](#user-interface)
6. [Technical Implementation](#technical-implementation)
7. [Migration Strategy](#migration-strategy)
8. [Testing Considerations](#testing-considerations)
9. [Future Enhancements](#future-enhancements)

---

## Overview

This document outlines the design and implementation plan for adding recurrent transaction functionality to the personal finance application. Recurrent transactions allow users to automatically create transactions that repeat on a regular schedule (daily, weekly, or monthly).

### Key Features

- **Flexible Scheduling**: Support for daily, weekly (specific day), and monthly (specific day) recurrence
- **Approval Workflow**: Optional approval mechanism for pending transactions
- **Visual Indicators**: Display upcoming recurrent transactions in dashboard and transactions view
- **Transaction Generation**: Automated transaction creation based on recurrence rules

---

## Requirements

### Functional Requirements

1. **Recurrence Patterns**
   - Daily: Transaction repeats every day
   - Weekly: Transaction repeats on a specific day of the week (e.g., every Monday)
   - Monthly: Transaction repeats on a specific day of the month (e.g., every 1st, 15th, 30th)

2. **Transaction Generation**
   - Transactions are only created on the scheduled date (not in advance)
   - A background process or client-side check determines when to generate transactions
   - Each generated transaction is a regular transaction record linked to its source recurrence

3. **Approval Mechanism**
   - Each recurrent transaction can be configured to:
     - **Auto-approve**: Transaction automatically created on the scheduled date
     - **Require approval**: Notification displayed; transaction only created when user approves
   - Pending approvals should be visible in the UI

4. **Upcoming Transactions Display**
   - Dashboard shows the next N upcoming recurrent transactions
   - Transactions view displays upcoming recurrent transactions separately from regular transactions
   - List sorted by date (soonest first)

5. **Recurrence Management**
   - Create new recurrent transactions
   - Edit existing recurrent transactions (affects future transactions only)
   - Delete recurrent transactions (with option to keep/delete generated transactions)
   - Pause/resume recurrent transactions (optional)

### Non-Functional Requirements

- **Security**: All recurrence data must be user-scoped with RLS policies
- **Performance**: Efficient queries for upcoming transactions calculation
- **Data Integrity**: Clear relationship between recurrent transactions and generated transactions
- **Localization**: Support for pt-BR locale in date displays and notifications

---

## Database Schema

### New Table: `recurrent_transactions`

Stores the recurrence rules and metadata for recurring transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique recurrence ID |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE CASCADE, NOT NULL | Reference to authenticated user |
| `category_id` | UUID | REFERENCES categories(id) ON DELETE SET NULL | Reference to category |
| `amount` | DECIMAL(12, 2) | NOT NULL | Transaction amount (positive value) |
| `description` | TEXT | NULL | Optional transaction description |
| `type` | TEXT | NOT NULL, CHECK (type IN ('income', 'expense')) | Transaction type |
| `frequency` | TEXT | NOT NULL, CHECK (frequency IN ('daily', 'weekly', 'monthly')) | Recurrence frequency |
| `day_of_week` | INTEGER | CHECK (day_of_week >= 0 AND day_of_week <= 6), NULL | Day of week for weekly recurrence (0=Sunday, 6=Saturday) |
| `day_of_month` | INTEGER | CHECK (day_of_month >= 1 AND day_of_month <= 31), NULL | Day of month for monthly recurrence |
| `requires_approval` | BOOLEAN | NOT NULL, DEFAULT false | Whether transaction needs approval before creation |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether recurrence is currently active |
| `start_date` | DATE | NOT NULL | Date when recurrence starts |
| `end_date` | DATE | NULL | Optional end date for recurrence |
| `last_generated_date` | DATE | NULL | Date of last generated transaction (for tracking) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id` for filtering
- Index on `is_active` for active recurrences query
- Composite index on `(user_id, is_active, start_date)` for efficient filtering

**RLS Policies:**
- `Users can view their own recurrent transactions` - SELECT WHERE auth.uid() = user_id
- `Users can insert their own recurrent transactions` - INSERT WITH CHECK auth.uid() = user_id
- `Users can update their own recurrent transactions` - UPDATE WHERE auth.uid() = user_id
- `Users can delete their own recurrent transactions` - DELETE WHERE auth.uid() = user_id

**Constraints:**
- If `frequency = 'weekly'`, then `day_of_week` must NOT be NULL
- If `frequency = 'monthly'`, then `day_of_month` must NOT be NULL
- If `frequency = 'daily'`, both `day_of_week` and `day_of_month` must be NULL
- `end_date` must be >= `start_date` if provided

### New Table: `pending_recurrent_approvals`

Stores pending transactions that require user approval.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique pending approval ID |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE CASCADE, NOT NULL | Reference to authenticated user |
| `recurrent_transaction_id` | UUID | REFERENCES recurrent_transactions(id) ON DELETE CASCADE, NOT NULL | Reference to recurrence rule |
| `scheduled_date` | DATE | NOT NULL | Date this transaction should be created |
| `is_approved` | BOOLEAN | DEFAULT NULL | NULL = pending, true = approved, false = rejected |
| `approved_at` | TIMESTAMP WITH TIME ZONE | NULL | Timestamp when approved/rejected |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Record creation timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id` for filtering
- Index on `is_approved` for pending approvals query
- Unique constraint on `(recurrent_transaction_id, scheduled_date)` to prevent duplicate approvals

**RLS Policies:**
- `Users can view their own pending approvals` - SELECT WHERE auth.uid() = user_id
- `Users can insert their own pending approvals` - INSERT WITH CHECK auth.uid() = user_id
- `Users can update their own pending approvals` - UPDATE WHERE auth.uid() = user_id
- `Users can delete their own pending approvals` - DELETE WHERE auth.uid() = user_id

### Modified Table: `transactions`

Add optional reference to track which recurrent transaction generated this transaction.

| Column (New) | Type | Constraints | Description |
|--------------|------|-------------|-------------|
| `recurrent_transaction_id` | UUID | REFERENCES recurrent_transactions(id) ON DELETE SET NULL, NULL | Reference to source recurrence (if generated) |

**Migration:**
```sql
ALTER TABLE transactions
ADD COLUMN recurrent_transaction_id UUID REFERENCES recurrent_transactions(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_recurrent_transaction_id
ON transactions(recurrent_transaction_id);
```

---

## Business Logic

### Recurrence Calculation Rules

#### Daily Recurrence
- Generate transaction every day starting from `start_date`
- Stop at `end_date` if provided, otherwise continue indefinitely
- Skip if `is_active = false`

#### Weekly Recurrence
- Generate transaction on specific `day_of_week` (0=Sunday, 6=Saturday)
- Example: `day_of_week = 1` means every Monday
- Calculate next occurrence based on current date

#### Monthly Recurrence
- Generate transaction on specific `day_of_month`
- Handle edge cases:
  - If `day_of_month = 31` and month has < 31 days, use last day of month
  - Example: February 31 → February 28/29
  - This ensures consistent behavior for "end of month" transactions

### Transaction Generation Flow

```
1. Check active recurrences (is_active = true)
2. For each recurrence:
   a. Calculate next scheduled date based on frequency rules
   b. Check if scheduled date is today
   c. Check if scheduled date <= end_date (if set)
   d. Check if not already generated (last_generated_date < today)
   e. If requires_approval:
      - Create pending approval record
      - Show notification to user
   f. If auto-approve:
      - Create transaction immediately
      - Set recurrent_transaction_id reference
      - Update last_generated_date
```

### Next Occurrences Calculation

For displaying upcoming transactions, calculate the next N occurrences for each active recurrence:

```typescript
interface UpcomingTransaction {
  recurrentTransactionId: string
  scheduledDate: string // ISO date string
  amount: number
  description: string | null
  type: 'income' | 'expense'
  category: Category
  requiresApproval: boolean
}

function calculateNextOccurrences(
  recurrence: RecurrentTransaction,
  fromDate: Date,
  count: number
): Date[] {
  // Returns array of next N dates when this recurrence will trigger
}
```

**Algorithm:**
- Daily: Simply add days sequentially
- Weekly: Find next occurrence of specified day_of_week
- Monthly: Find next occurrence of specified day_of_month (handle month-end edge cases)

### Approval Workflow

1. **Pending Creation**
   - System creates `pending_recurrent_approvals` record when scheduled date arrives
   - User sees notification badge/list

2. **User Approval**
   - User clicks "Approve" → Set `is_approved = true`, create transaction
   - User clicks "Reject" → Set `is_approved = false`, no transaction created
   - User ignores → Record remains pending (optional: auto-approve after N days)

3. **Cleanup**
   - Keep approved/rejected records for audit trail
   - Optional: Archive old approvals after N days

---

## User Interface

### 1. Recurrent Transactions Management Page

**Route:** `/recurrent-transactions`
**Component:** `src/views/RecurrentTransactions.vue`

**Layout:**
- Use `AppLayout` wrapper with `PageHeader`
- List of active recurrent transactions
- "Add Recurrent Transaction" button
- Each recurrence card shows:
  - Amount and type (income/expense)
  - Category with color indicator
  - Frequency description (e.g., "Every Monday", "Every 1st of month", "Daily")
  - Approval setting (auto/manual)
  - Active/Paused toggle
  - Edit/Delete actions
  - Next scheduled date

**Empty State:**
- Use `EmptyState` component: "No recurrent transactions yet."

### 2. Recurrent Transaction Form

**Component:** `src/components/forms/RecurrentTransactionForm.vue`

**Fields:**
- Category (dropdown)
- Amount (number input)
- Description (text input, optional)
- Type (income/expense radio buttons)
- Frequency (dropdown: Daily, Weekly, Monthly)
- **If Weekly:** Day of week (dropdown: Sunday-Saturday)
- **If Monthly:** Day of month (number input: 1-31)
- Start date (date picker, default: today)
- End date (date picker, optional)
- Requires approval (checkbox)

**Validation:**
- Amount > 0
- Category selected
- Frequency-specific fields required
- End date >= Start date

### 3. Pending Approvals Section

**Location:** Dashboard (top of page, above stats)
**Component:** `src/components/dashboard/PendingApprovals.vue`

**Display:**
- Alert banner if pending approvals exist
- List of pending transactions with:
  - Date, category, amount, description
  - "Approve" and "Reject" buttons
- Dismiss all option

**Badge:**
- Show notification badge in navbar if pending > 0

### 4. Upcoming Transactions Widget

**Location:** Dashboard (below main stats, before recent transactions)
**Component:** `src/components/dashboard/UpcomingRecurring.vue`

**Display:**
- "Upcoming Recurring Transactions" section
- Table showing next 5-10 upcoming transactions
- Columns: Date, Category, Description, Amount
- Visual indicator for approval requirement
- Link to full recurrent transactions page

### 5. Transactions View Integration

**Location:** `/transactions` page
**Component:** Add tab to `src/views/Transactions.vue`

**New Tab:**
- Add "Upcoming Recurring" tab alongside All/Income/Expense
- Shows calculated upcoming transactions from all active recurrences
- Read-only display (edit via recurrent transactions page)

### 6. Visual Indicators

**In Transaction Lists:**
- Icon or badge to indicate transaction was auto-generated from recurrence
- Link to source recurrent transaction

**In Dashboard:**
- Different styling for upcoming recurring vs. regular transactions
- Color-coded approval status

---

## Technical Implementation

### 1. TypeScript Types

**File:** `src/types/database.ts`

```typescript
export interface Database {
  public: {
    Tables: {
      // ... existing tables ...
      recurrent_transactions: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          amount: number
          description: string | null
          type: 'income' | 'expense'
          frequency: 'daily' | 'weekly' | 'monthly'
          day_of_week: number | null
          day_of_month: number | null
          requires_approval: boolean
          is_active: boolean
          start_date: string
          end_date: string | null
          last_generated_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string | null
          amount: number
          description?: string | null
          type: 'income' | 'expense'
          frequency: 'daily' | 'weekly' | 'monthly'
          day_of_week?: number | null
          day_of_month?: number | null
          requires_approval?: boolean
          is_active?: boolean
          start_date: string
          end_date?: string | null
          last_generated_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          amount?: number
          description?: string | null
          type?: 'income' | 'expense'
          frequency?: 'daily' | 'weekly' | 'monthly'
          day_of_week?: number | null
          day_of_month?: number | null
          requires_approval?: boolean
          is_active?: boolean
          start_date?: string
          end_date?: string | null
          last_generated_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pending_recurrent_approvals: {
        Row: {
          id: string
          user_id: string
          recurrent_transaction_id: string
          scheduled_date: string
          is_approved: boolean | null
          approved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recurrent_transaction_id: string
          scheduled_date: string
          is_approved?: boolean | null
          approved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recurrent_transaction_id?: string
          scheduled_date?: string
          is_approved?: boolean | null
          approved_at?: string | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          // ... existing fields ...
          recurrent_transaction_id: string | null
        }
        Insert: {
          // ... existing fields ...
          recurrent_transaction_id?: string | null
        }
        Update: {
          // ... existing fields ...
          recurrent_transaction_id?: string | null
        }
      }
    }
  }
}
```

### 2. Pinia Store

**File:** `src/stores/recurrentTransactions.ts`

```typescript
export const useRecurrentTransactionsStore = defineStore(
  'recurrent-transactions',
  () => {
    // State
    const recurrentTransactions = ref<RecurrentTransactionWithCategory[]>([])
    const pendingApprovals = ref<PendingApprovalWithDetails[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Computed
    const activeRecurrences = computed(() =>
      recurrentTransactions.value.filter((r) => r.is_active)
    )

    const pendingCount = computed(() =>
      pendingApprovals.value.filter((p) => p.is_approved === null).length
    )

    // Actions
    async function fetchRecurrentTransactions() { ... }
    async function fetchPendingApprovals() { ... }
    async function createRecurrentTransaction(data) { ... }
    async function updateRecurrentTransaction(id, data) { ... }
    async function deleteRecurrentTransaction(id) { ... }
    async function toggleActive(id) { ... }
    async function approveTransaction(approvalId) { ... }
    async function rejectTransaction(approvalId) { ... }

    // Utility functions
    function calculateNextOccurrences(
      recurrence: RecurrentTransaction,
      count: number
    ): UpcomingTransaction[] { ... }

    function getUpcomingTransactions(limit: number): UpcomingTransaction[] { ... }

    return {
      recurrentTransactions,
      pendingApprovals,
      loading,
      error,
      activeRecurrences,
      pendingCount,
      fetchRecurrentTransactions,
      fetchPendingApprovals,
      createRecurrentTransaction,
      updateRecurrentTransaction,
      deleteRecurrentTransaction,
      toggleActive,
      approveTransaction,
      rejectTransaction,
      calculateNextOccurrences,
      getUpcomingTransactions,
    }
  }
)
```

### 3. Transaction Generation Service

**File:** `src/services/recurrenceService.ts`

This service handles the logic for checking and generating transactions.

```typescript
export class RecurrenceService {
  /**
   * Check all active recurrences and generate transactions if needed
   * Should be called:
   * - On app initialization
   * - On dashboard mount
   * - Periodically (e.g., every hour if app is open)
   */
  static async processRecurrences(): Promise<void> {
    // 1. Fetch active recurrences
    // 2. For each recurrence, check if transaction should be generated today
    // 3. If requires_approval, create pending approval
    // 4. If auto-approve, create transaction
    // 5. Update last_generated_date
  }

  /**
   * Calculate if a recurrence should generate a transaction today
   */
  static shouldGenerateToday(recurrence: RecurrentTransaction): boolean {
    const today = startOfDay(new Date())
    const startDate = parseISO(recurrence.start_date)
    const lastGenerated = recurrence.last_generated_date
      ? parseISO(recurrence.last_generated_date)
      : null

    // Check if today >= start_date
    if (isBefore(today, startDate)) return false

    // Check if already generated today
    if (lastGenerated && isSameDay(lastGenerated, today)) return false

    // Check if past end_date
    if (recurrence.end_date) {
      const endDate = parseISO(recurrence.end_date)
      if (isAfter(today, endDate)) return false
    }

    // Check frequency-specific rules
    return this.matchesFrequency(recurrence, today)
  }

  /**
   * Check if today matches the recurrence frequency
   */
  private static matchesFrequency(
    recurrence: RecurrentTransaction,
    date: Date
  ): boolean {
    switch (recurrence.frequency) {
      case 'daily':
        return true

      case 'weekly':
        return getDay(date) === recurrence.day_of_week

      case 'monthly':
        const dayOfMonth = getDate(date)
        const targetDay = recurrence.day_of_month!

        // If target day > days in month, use last day of month
        const lastDayOfMonth = getDate(endOfMonth(date))
        const effectiveDay = Math.min(targetDay, lastDayOfMonth)

        return dayOfMonth === effectiveDay

      default:
        return false
    }
  }

  /**
   * Calculate next N occurrences for a recurrence
   */
  static calculateNextOccurrences(
    recurrence: RecurrentTransaction,
    count: number = 10
  ): Date[] {
    const results: Date[] = []
    let currentDate = startOfDay(new Date())
    const endDate = recurrence.end_date ? parseISO(recurrence.end_date) : null

    while (results.length < count) {
      currentDate = this.getNextOccurrence(recurrence, currentDate)

      if (endDate && isAfter(currentDate, endDate)) break

      results.push(currentDate)
    }

    return results
  }

  /**
   * Get next occurrence date after a given date
   */
  private static getNextOccurrence(
    recurrence: RecurrentTransaction,
    afterDate: Date
  ): Date {
    let nextDate = addDays(afterDate, 1)

    switch (recurrence.frequency) {
      case 'daily':
        return nextDate

      case 'weekly':
        while (getDay(nextDate) !== recurrence.day_of_week) {
          nextDate = addDays(nextDate, 1)
        }
        return nextDate

      case 'monthly':
        // Move to next month
        nextDate = addMonths(startOfDay(afterDate), 1)
        // Set to target day (or last day of month if target > days in month)
        const targetDay = recurrence.day_of_month!
        const lastDay = getDate(endOfMonth(nextDate))
        const effectiveDay = Math.min(targetDay, lastDay)
        return setDate(nextDate, effectiveDay)

      default:
        return nextDate
    }
  }
}
```

### 4. Composable for Recurrence Processing

**File:** `src/composables/useRecurrenceProcessor.ts`

```typescript
export function useRecurrenceProcessor() {
  const recurrentStore = useRecurrentTransactionsStore()
  const transactionsStore = useTransactionsStore()
  const authStore = useAuthStore()

  const processing = ref(false)

  async function processRecurrences() {
    if (processing.value) return
    processing.value = true

    try {
      await RecurrenceService.processRecurrences()
      // Refresh stores after processing
      await recurrentStore.fetchPendingApprovals()
      await transactionsStore.fetchTransactions()
    } catch (err) {
      console.error('Error processing recurrences:', err)
    } finally {
      processing.value = false
    }
  }

  // Auto-process on mount
  onMounted(() => {
    processRecurrences()
  })

  // Set up periodic check (every 30 minutes)
  const intervalId = setInterval(processRecurrences, 30 * 60 * 1000)

  onUnmounted(() => {
    clearInterval(intervalId)
  })

  return {
    processRecurrences,
    processing,
  }
}
```

### 5. Utility Functions

**File:** `src/utils/recurrenceHelpers.ts`

```typescript
/**
 * Format recurrence frequency as human-readable string
 */
export function formatRecurrenceFrequency(
  recurrence: RecurrentTransaction,
  locale: string = 'pt-BR'
): string {
  const { frequency, day_of_week, day_of_month } = recurrence

  switch (frequency) {
    case 'daily':
      return locale === 'pt-BR' ? 'Diariamente' : 'Daily'

    case 'weekly':
      const dayNames = locale === 'pt-BR'
        ? ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayName = dayNames[day_of_week!]
      return locale === 'pt-BR'
        ? `Toda ${dayName}`
        : `Every ${dayName}`

    case 'monthly':
      const daySuffix = locale === 'pt-BR' ? '' : getOrdinalSuffix(day_of_month!)
      return locale === 'pt-BR'
        ? `Todo dia ${day_of_month}`
        : `Every ${day_of_month}${daySuffix} of the month`

    default:
      return frequency
  }
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}
```

### 6. Router Configuration

**File:** `src/router/index.ts`

```typescript
{
  path: '/recurrent-transactions',
  name: 'recurrent-transactions',
  component: () => import('@/views/RecurrentTransactions.vue'),
  meta: { requiresAuth: true }
}
```

### 7. Navbar Integration

**File:** `src/components/common/AppNavbar.vue`

Add recurrent transactions link to nav items and pending approvals badge.

---

## Migration Strategy

### Phase 1: Database Setup

1. **Create Tables**
   - Run SQL migrations for `recurrent_transactions` table
   - Run SQL migrations for `pending_recurrent_approvals` table
   - Add `recurrent_transaction_id` column to `transactions` table

2. **Set Up RLS Policies**
   - Apply RLS policies for both new tables
   - Test policies with different user scenarios

3. **Create Indexes**
   - Add all necessary indexes for performance

4. **Update Triggers**
   - Add `update_updated_at_column()` trigger to `recurrent_transactions`

### Phase 2: Backend Logic

1. **Update TypeScript Types**
   - Add types to `src/types/database.ts`
   - Create helper types and interfaces

2. **Create Recurrence Service**
   - Implement `RecurrenceService` with all calculation logic
   - Write unit tests for date calculations

3. **Create Pinia Store**
   - Implement `useRecurrentTransactionsStore`
   - Add CRUD operations
   - Add approval operations

### Phase 3: UI Components

1. **Create Reusable Components**
   - `RecurrentTransactionForm.vue`
   - `RecurrentTransactionCard.vue`
   - `PendingApprovalsList.vue`
   - `UpcomingRecurringWidget.vue`

2. **Create Views**
   - `RecurrentTransactions.vue` main page
   - Integrate into `Dashboard.vue`
   - Add tab to `Transactions.vue`

3. **Update Navigation**
   - Add route to router
   - Update navbar with link and badge

### Phase 4: Testing & Polish

1. **Integration Testing**
   - Test recurrence generation logic
   - Test approval workflow
   - Test edge cases (month-end, leap years, etc.)

2. **UI/UX Polish**
   - Add loading states
   - Add error handling
   - Add confirmation dialogs
   - Add toast notifications

3. **Localization**
   - Add all i18n strings (pt-BR and en)
   - Test date formatting

### Phase 5: Documentation

1. **Update Documentation**
   - Update `docs/supabase-schema.md`
   - Add recurrence examples to `CLAUDE.md`
   - Create user guide (optional)

2. **Code Comments**
   - Document complex logic
   - Add JSDoc comments to service functions

---

## Testing Considerations

### Unit Tests

1. **RecurrenceService Tests**
   ```typescript
   describe('RecurrenceService', () => {
     describe('shouldGenerateToday', () => {
       test('daily recurrence generates every day')
       test('weekly recurrence generates on correct day')
       test('monthly recurrence generates on correct day')
       test('monthly recurrence handles month-end edge cases')
       test('respects start_date')
       test('respects end_date')
       test('does not generate twice on same day')
     })

     describe('calculateNextOccurrences', () => {
       test('calculates correct dates for daily')
       test('calculates correct dates for weekly')
       test('calculates correct dates for monthly')
       test('stops at end_date if provided')
       test('handles February 29/30/31 edge cases')
     })
   })
   ```

2. **Date Calculation Edge Cases**
   - Test day 31 in February (should use Feb 28/29)
   - Test day 31 in 30-day months (should use day 30)
   - Test leap years
   - Test year boundaries
   - Test DST transitions

### Integration Tests

1. **Approval Workflow**
   - Create recurrence with approval required
   - Verify pending approval is created
   - Approve and verify transaction is created
   - Reject and verify no transaction is created

2. **Auto-Generation**
   - Create auto-approve recurrence
   - Verify transaction is created on schedule
   - Verify no duplicate transactions

3. **RLS Policies**
   - Verify users can only see their own recurrences
   - Verify users can only approve their own pending transactions

### Manual Testing Checklist

- [ ] Create daily recurrence, verify generation
- [ ] Create weekly recurrence for each day of week
- [ ] Create monthly recurrence for days 1, 15, 28, 30, 31
- [ ] Test approval workflow end-to-end
- [ ] Test editing recurrence (verify future transactions update)
- [ ] Test deleting recurrence
- [ ] Test pausing/resuming recurrence
- [ ] Verify upcoming transactions display correctly
- [ ] Verify pending approvals badge shows correct count
- [ ] Test all UI states (loading, error, empty)
- [ ] Test responsive design on mobile
- [ ] Test localization (pt-BR)

---

## Future Enhancements

### Version 2.0 Potential Features

1. **Advanced Recurrence Patterns**
   - Bi-weekly (every 2 weeks)
   - Quarterly (every 3 months)
   - Yearly (annual transactions)
   - Custom intervals (every N days/weeks/months)

2. **Smart Scheduling**
   - Skip weekends option
   - Skip holidays
   - Move to next business day if falls on weekend

3. **Batch Approval**
   - Approve all pending at once
   - Auto-approve after N days

4. **Recurrence History**
   - View all transactions generated from a recurrence
   - Analytics on recurrence patterns

5. **Templates**
   - Save recurrence as template
   - Clone existing recurrences

6. **Notifications**
   - Email/push notifications for pending approvals
   - Reminders for upcoming large transactions

7. **Budget Integration**
   - Forecast future budget impact
   - Warn if recurrence exceeds budget

8. **Variable Amounts**
   - Allow amount to vary within a range
   - Prompt for amount on generation

9. **Conditional Recurrence**
   - Only generate if certain conditions met
   - Skip if similar transaction already exists

10. **Import/Export**
    - Import recurrences from CSV
    - Export schedule to calendar

---

## Implementation Checklist

### Database
- [ ] Create `recurrent_transactions` table with all constraints
- [ ] Create `pending_recurrent_approvals` table
- [ ] Add `recurrent_transaction_id` to `transactions` table
- [ ] Create RLS policies for both tables
- [ ] Create indexes for performance
- [ ] Add update trigger to `recurrent_transactions`

### Types & Interfaces
- [ ] Update `src/types/database.ts` with new table types
- [ ] Create helper interfaces (UpcomingTransaction, etc.)
- [ ] Update transaction types with new field

### Services & Logic
- [ ] Create `RecurrenceService` class
- [ ] Implement date calculation functions
- [ ] Implement transaction generation logic
- [ ] Create `useRecurrenceProcessor` composable
- [ ] Create utility functions for formatting

### Stores
- [ ] Create `useRecurrentTransactionsStore`
- [ ] Implement CRUD operations
- [ ] Implement approval operations
- [ ] Implement upcoming transactions calculation

### Components
- [ ] `RecurrentTransactionForm.vue`
- [ ] `RecurrentTransactionCard.vue` or list item
- [ ] `PendingApprovalsList.vue`
- [ ] `UpcomingRecurringWidget.vue`

### Views
- [ ] `RecurrentTransactions.vue` main page
- [ ] Update `Dashboard.vue` with pending approvals and upcoming widget
- [ ] Add upcoming tab to `Transactions.vue`

### Navigation & Routing
- [ ] Add route to router configuration
- [ ] Update `AppNavbar.vue` with link
- [ ] Add pending approvals badge to navbar

### Localization
- [ ] Add i18n keys for all UI strings (pt-BR)
- [ ] Add i18n keys for all UI strings (en)
- [ ] Add date formatting helpers

### Documentation
- [ ] Update `docs/supabase-schema.md`
- [ ] Update this planning document with final implementation notes
- [ ] Update `CLAUDE.md` with recurrence examples

### Testing
- [ ] Unit tests for `RecurrenceService`
- [ ] Integration tests for approval workflow
- [ ] Manual testing checklist completion

---

## SQL Migration Script

```sql
-- ============================================================================
-- RECURRENT TRANSACTIONS FEATURE - DATABASE MIGRATION
-- Version: 1.0.0
-- Created: 2025-10-17
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
CREATE INDEX idx_recurrent_transactions_user_id ON recurrent_transactions(user_id);
CREATE INDEX idx_recurrent_transactions_is_active ON recurrent_transactions(is_active);
CREATE INDEX idx_recurrent_transactions_composite
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
CREATE INDEX idx_pending_approvals_user_id ON pending_recurrent_approvals(user_id);
CREATE INDEX idx_pending_approvals_is_approved ON pending_recurrent_approvals(is_approved);
CREATE INDEX idx_pending_approvals_recurrent_id
  ON pending_recurrent_approvals(recurrent_transaction_id);

-- Add recurrent_transaction_id to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS recurrent_transaction_id UUID
  REFERENCES recurrent_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_recurrent_id
  ON transactions(recurrent_transaction_id);

-- Add update trigger to recurrent_transactions
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
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('recurrent_transactions', 'pending_recurrent_approvals');

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('recurrent_transactions', 'pending_recurrent_approvals');

-- Verify column was added to transactions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'recurrent_transaction_id';
```

---

## Conclusion

This planning document provides a comprehensive roadmap for implementing recurrent transactions functionality. The feature is designed to be:

- **User-friendly**: Simple UI for creating and managing recurrences
- **Flexible**: Support for multiple frequency patterns
- **Secure**: Full RLS policies and user-scoped data
- **Maintainable**: Clean separation of concerns with services, stores, and components
- **Extensible**: Foundation for future enhancements

Next steps: Review this plan, gather feedback, and begin implementation starting with Phase 1 (Database Setup).
