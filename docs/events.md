# Events Feature Planning

**Status:** Planning Phase
**Created:** 2025-11-04
**Related:** [events-supabase.md](./events-supabase.md)

## Overview

The Events feature allows users to group related transactions under time-bound events. This is useful for tracking expenses/income associated with specific activities like travels, projects, celebrations, or any other event with a defined timeframe.

### Use Cases

- **Travel**: Track all expenses during a trip to Paris (flights, hotels, restaurants, shopping)
- **Project**: Group income and expenses related to a freelance project
- **Celebration**: Track expenses for a wedding, birthday party, or other celebration
- **Home Renovation**: Group all expenses related to a home improvement project
- **Course/Education**: Track tuition, materials, and related expenses for a course

## Feature Requirements

### Core Functionality

1. **Event Management**
   - Create events with name, description, start date, and optional end date
   - Update event details (name, description, dates)
   - Delete events (with option to keep or unlink transactions)
   - View list of all events (active and completed)
   - Filter events by date range or status (active/completed)

2. **Transaction Linking**
   - Link existing transactions to an event
   - Unlink transactions from an event
   - Create new transactions directly associated with an event
   - View all transactions associated with an event
   - Bulk link/unlink multiple transactions

3. **Event Analytics**
   - Total income for an event
   - Total expenses for an event
   - Net balance (income - expenses)
   - Expense breakdown by category
   - Transaction count per event
   - Date range visualization

4. **Event Status**
   - **Active**: Current events (start_date <= today, end_date is null or >= today)
   - **Upcoming**: Future events (start_date > today)
   - **Completed**: Past events (end_date < today)
   - **Open-ended**: Events without an end date

## Data Model

### Events Table Schema

```typescript
interface Event {
  id: string // UUID
  user_id: string // UUID, references auth.users
  name: string // Event name (e.g., "Trip to Paris")
  description: string | null // Detailed description (optional)
  start_date: string // ISO date (YYYY-MM-DD)
  end_date: string | null // ISO date (YYYY-MM-DD), null for open-ended events
  color: string // Hex color code for UI display (#RRGGBB)
  icon: string | null // Icon identifier (optional)
  created_at: string // Timestamp
  updated_at: string // Timestamp
}
```

### Transactions Modification

The existing `transactions` table needs a new column:

- `event_id`: UUID | null (references events.id ON DELETE SET NULL)

This allows transactions to exist independently even if the event is deleted.

## UI Components Structure

### Pages

1. **Events List Page** (`/events`)
   - Display all events grouped by status (Active, Upcoming, Completed)
   - Summary card for each event (name, date range, total spent/earned, transaction count)
   - Quick actions: view details, edit, delete
   - Filter and search functionality
   - "Create Event" button

2. **Event Details Page** (`/events/:id`)
   - Event header (name, description, dates)
   - Financial summary (total income, expenses, balance)
   - Chart: expense breakdown by category
   - Timeline of transactions associated with the event
   - Actions: edit event, delete event, link transactions
   - Quick add transaction button (pre-fills event_id)

3. **Event Form** (Modal or separate page)
   - Event name (required)
   - Description (optional textarea)
   - Start date (required date picker)
   - End date (optional date picker)
   - Color picker (default to random color)
   - Icon picker (optional)

### Reusable Components

```
src/components/events/
├── EventCard.vue              # Summary card for event list
├── EventForm.vue              # Create/edit event form
├── EventHeader.vue            # Event details header with metadata
├── EventStats.vue             # Financial stats component
├── EventTransactionList.vue   # List of transactions for an event
├── EventLinkModal.vue         # Modal to link existing transactions to event
└── EventDeleteModal.vue       # Confirmation modal for event deletion
```

### Integration with Existing Components

1. **Transaction Form** (existing)
   - Add optional "Event" dropdown to select associated event
   - Show current event if editing a linked transaction
   - Filter events by date (show events active during transaction date)

2. **Transaction List** (existing)
   - Add event badge/tag to transactions that are linked to events
   - Filter transactions by event
   - Quick action to link/unlink from event

3. **Dashboard** (existing)
   - Add "Active Events" widget showing current events and their totals
   - Quick navigation to event details

## Store Structure

### Events Store (`src/stores/events.ts`)

```typescript
interface EventsState {
  events: Event[]
  currentEvent: Event | null
  isLoading: boolean
  error: string | null
}

interface EventsActions {
  // CRUD operations
  fetchEvents(): Promise<void>
  fetchEventById(id: string): Promise<void>
  createEvent(event: EventInsert): Promise<Event | null>
  updateEvent(id: string, updates: EventUpdate): Promise<void>
  deleteEvent(id: string): Promise<void>

  // Transaction linking
  linkTransactionToEvent(transactionId: string, eventId: string): Promise<void>
  unlinkTransactionFromEvent(transactionId: string): Promise<void>
  bulkLinkTransactions(transactionIds: string[], eventId: string): Promise<void>

  // Analytics
  getEventTransactions(eventId: string): Promise<Transaction[]>
  getEventStats(eventId: string): Promise<EventStats>

  // Filters
  getActiveEvents(): Event[]
  getUpcomingEvents(): Event[]
  getCompletedEvents(): Event[]
}

interface EventStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  transactionCount: number
  categoryBreakdown: { category: Category; total: number }[]
}
```

## Routing

Add new routes to `src/router/index.ts`:

```typescript
{
  path: '/events',
  name: 'events',
  component: () => import('@/views/EventsView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/events/:id',
  name: 'event-details',
  component: () => import('@/views/EventDetailsView.vue'),
  meta: { requiresAuth: true }
}
```

Add "Events" to the navigation menu in `AppNavbar.vue`.

## Implementation Phases

### Phase 1: Database & Types

- [ ] Create `events` table in Supabase with RLS policies
- [ ] Add `event_id` column to `transactions` table
- [ ] Update TypeScript types in `src/types/database.ts`
- [ ] Test database queries and RLS policies

### Phase 2: Store & API Layer

- [ ] Create events store (`src/stores/events.ts`)
- [ ] Implement CRUD operations
- [ ] Implement transaction linking methods
- [ ] Implement analytics/stats methods
- [ ] Add error handling and loading states

### Phase 3: UI Components

- [ ] Create reusable event components
- [ ] Implement EventCard component
- [ ] Implement EventForm component (with validation)
- [ ] Implement EventStats component
- [ ] Implement EventTransactionList component

### Phase 4: Pages

- [ ] Create Events List page (`EventsView.vue`)
- [ ] Create Event Details page (`EventDetailsView.vue`)
- [ ] Add routing and navigation
- [ ] Implement filtering and search

### Phase 5: Integration

- [ ] Add event selector to transaction form
- [ ] Add event badges to transaction lists
- [ ] Add active events widget to dashboard
- [ ] Implement bulk link/unlink functionality

### Phase 6: Internationalization

- [ ] Add i18n strings for pt-BR
- [ ] Add i18n strings for en
- [ ] Test language switching

### Phase 7: Polish & Testing

- [ ] Responsive design testing (mobile-first)
- [ ] Add empty states
- [ ] Add loading skeletons
- [ ] Error handling and user feedback
- [ ] Test edge cases (delete event with transactions, etc.)

## Internationalization Keys

### pt-BR (`src/locales/pt-BR.json`)

```json
{
  "events": {
    "title": "Eventos",
    "subtitle": "Organize transações por eventos",
    "createEvent": "Criar Evento",
    "editEvent": "Editar Evento",
    "deleteEvent": "Excluir Evento",
    "noEvents": "Nenhum evento criado ainda.",
    "active": "Ativos",
    "upcoming": "Próximos",
    "completed": "Concluídos",
    "form": {
      "name": "Nome do Evento",
      "namePlaceholder": "Ex: Viagem a Paris",
      "description": "Descrição",
      "descriptionPlaceholder": "Detalhes sobre o evento",
      "startDate": "Data de Início",
      "endDate": "Data de Término",
      "endDateOptional": "Data de Término (Opcional)",
      "color": "Cor",
      "icon": "Ícone"
    },
    "stats": {
      "totalIncome": "Receitas Totais",
      "totalExpenses": "Despesas Totais",
      "balance": "Saldo",
      "transactions": "Transações"
    },
    "actions": {
      "linkTransactions": "Vincular Transações",
      "unlinkTransaction": "Desvincular",
      "viewDetails": "Ver Detalhes"
    },
    "delete": {
      "title": "Excluir Evento?",
      "message": "As transações vinculadas não serão excluídas, apenas desvinculadas do evento.",
      "confirm": "Excluir"
    }
  }
}
```

### en (`src/locales/en.json`)

```json
{
  "events": {
    "title": "Events",
    "subtitle": "Organize transactions by events",
    "createEvent": "Create Event",
    "editEvent": "Edit Event",
    "deleteEvent": "Delete Event",
    "noEvents": "No events created yet.",
    "active": "Active",
    "upcoming": "Upcoming",
    "completed": "Completed",
    "form": {
      "name": "Event Name",
      "namePlaceholder": "Ex: Trip to Paris",
      "description": "Description",
      "descriptionPlaceholder": "Event details",
      "startDate": "Start Date",
      "endDate": "End Date",
      "endDateOptional": "End Date (Optional)",
      "color": "Color",
      "icon": "Icon"
    },
    "stats": {
      "totalIncome": "Total Income",
      "totalExpenses": "Total Expenses",
      "balance": "Balance",
      "transactions": "Transactions"
    },
    "actions": {
      "linkTransactions": "Link Transactions",
      "unlinkTransaction": "Unlink",
      "viewDetails": "View Details"
    },
    "delete": {
      "title": "Delete Event?",
      "message": "Linked transactions will not be deleted, only unlinked from the event.",
      "confirm": "Delete"
    }
  }
}
```

## Design Considerations

### Color System

- Each event has a customizable color for visual distinction
- Default colors can be randomly assigned from a predefined palette
- Colors should be used in event cards, badges, and charts

### Date Handling

- All dates stored in ISO format (YYYY-MM-DD)
- Use `date-fns` for date formatting and calculations
- Support open-ended events (no end date)
- Validate that end_date >= start_date

### Currency Formatting

- Use `currency.js` for all financial calculations
- Display amounts in R$ (Brazilian Real) format
- Follow existing currency formatting patterns

### Responsive Design

- Mobile-first approach
- Event cards should stack on mobile, grid on desktop
- Event details page should adapt to smaller screens
- Forms should be touch-friendly

### Performance

- Lazy load event transactions when viewing details
- Cache event stats to avoid recalculation
- Use Supabase real-time subscriptions for live updates (optional)

### User Experience

- Clear visual feedback for linked transactions
- Confirmation dialogs for destructive actions
- Empty states with helpful CTAs
- Loading states for async operations
- Toast notifications for success/error feedback

## Edge Cases & Validation

1. **Deleting an event**
   - Transactions remain in database with event_id set to NULL
   - User should be warned before deletion
   - Option to view/filter "unlinked" transactions

2. **Date validation**
   - End date must be >= start date
   - Cannot create event with past start date? (decision needed)
   - Transaction date should ideally fall within event date range (warning, not error)

3. **Event overlaps**
   - Multiple events can overlap in time (this is allowed)
   - A transaction can only be linked to ONE event

4. **Filtering transactions by event date**
   - When linking transactions, show only transactions within event date range?
   - Or allow linking any transaction regardless of date? (decision needed)

5. **Empty events**
   - Events with no linked transactions are allowed
   - Show helpful empty state in event details

## Future Enhancements (Out of Scope for MVP)

- Event templates (e.g., "Travel", "Project") with pre-defined categories
- Event budgets (set spending limits per event)
- Export event report as PDF/CSV
- Share event summary (read-only public link)
- Event attachments (photos, receipts, documents)
- Recurring events (e.g., "Monthly team lunch")
- Event collaboration (multi-user, but conflicts with single-user model)

## References

- [events-supabase.md](./events-supabase.md) - Database schema and migration scripts
- [supabase-schema.md](./supabase-schema.md) - Current database schema
- [CLAUDE.md](../CLAUDE.md) - Project guidelines and patterns

---

**Next Steps:**

1. Review and approve this plan
2. Proceed with Phase 1: Database & Types (see events-supabase.md)
3. Begin implementation following the project's code standards
