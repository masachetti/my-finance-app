# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **single-user personal finance application** built with Vue 3, TypeScript, Vite, and Supabase. The app is designed to be publicly accessible but secured so only the authenticated owner can read/write data.

## Essential Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:5173
npm run build        # Type-check with vue-tsc, then build for production
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint with auto-fix
npm run format       # Format code with Prettier
```

## Architecture & Key Patterns

### Auto-Import System

This project uses `unplugin-auto-import` and `unplugin-vue-components`:
- Vue APIs (ref, computed, watch, etc.) are auto-imported - **no manual imports needed**
- Vue Router composables (useRouter, useRoute) are auto-imported
- Pinia composables (defineStore, storeToRefs) are auto-imported
- Components in `src/components/` are auto-registered
- Type definitions are auto-generated in `src/auto-imports.d.ts` and `src/components.d.ts`

**Important:** When writing code, DO NOT manually import these APIs. The build system handles it.

### Authentication Flow

The app uses a centralized auth store (`src/stores/auth.ts`) with Pinia persistence:

1. **Auth Store Initialization**: Must call `authStore.initialize()` on app mount to restore session
2. **Route Guards**: `src/router/index.ts` checks `meta.requiresAuth` and `meta.requiresGuest`
3. **Session Persistence**: User and session are persisted to localStorage via `pinia-plugin-persistedstate`
4. **Auth Methods Available**:
   - `signIn(email, password)` - Email/password authentication
   - `signUp(email, password)` - User registration
   - `signOut()` - Clear session

**Important:** The auth store MUST be initialized in `main.ts` or `App.vue` before routing begins.

### Supabase Integration

All Supabase interactions use the typed client from `src/lib/supabase.ts`:

```typescript
import { supabase } from '@/lib/supabase'
// Client is pre-configured with Database types
```

**Database Schema** (see `docs/supabase-schema.md` for detailed documentation):
- `profiles` - User profile (user_id references auth.users)
- `categories` - Income/expense categories (user_id scoped)
- `transactions` - Financial records (user_id scoped)
- `budgets` - Monthly budget limits (user_id scoped)

**Critical Security Pattern**: All tables MUST have `user_id` column and Row Level Security (RLS) policies filtering by `auth.uid()`. This ensures single-user data isolation.

**IMPORTANT:** When modifying the database schema, always update `docs/supabase-schema.md` with the changes, including table definitions, RLS policies, and migration notes.

### Environment Variables

Required variables in `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The Supabase client will throw an error if these are missing (enforced in `src/lib/supabase.ts`).

### Data Flow Pattern

1. **User authenticates** → Session stored in auth store
2. **Route guard checks** → Redirect if not authenticated
3. **Component mounts** → Fetch data using Supabase client
4. **Supabase RLS** → Automatically filters by authenticated user's `auth.uid()`

This ensures data isolation without explicit user_id filtering in frontend queries.

### Styling System

Tailwind CSS with custom utility classes defined in `src/assets/main.css`:
- `.btn`, `.btn-primary`, `.btn-secondary` - Button styles
- `.card` - Card container
- `.input` - Form input styling

Primary color customization: Edit `tailwind.config.js` → `theme.extend.colors.primary`

### Reusable Layout Components

**IMPORTANT:** Always use reusable components for consistent UI patterns. All authenticated pages should use the AppLayout pattern.

**Core Layout Components** (`src/components/common/`):
- `AppLayout.vue` - Main layout wrapper with navbar and content area (use for all authenticated pages)
- `AppNavbar.vue` - Navigation bar with active route detection and logout
- `PageHeader.vue` - Page title, subtitle, and optional action button
- `StatCard.vue` - Reusable stat display card with color variants (default, green, red)
- `EmptyState.vue` - Reusable empty state message component

**Example Page Structure:**
```vue
<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'

function handleAction() {
  // Handle button click
}
</script>

<template>
  <AppLayout>
    <PageHeader
      title="Page Title"
      subtitle="Page description"
      action-label="Add Item"
      @action="handleAction"
    />

    <EmptyState message="No items yet." />
  </AppLayout>
</template>
```

### Path Aliases

The `@` alias maps to `src/` directory:
```typescript
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
```

Configured in `vite.config.ts` and `tsconfig.app.json`.

## Adding New Features

### Creating a New Store

1. Create store in `src/stores/[name].ts`
2. Use composition API pattern (return object with state/actions)
3. Add persistence if needed:
   ```typescript
   export const useMyStore = defineStore('my-store', () => {
     // ... store logic
   }, {
     persist: {
       paths: ['field1', 'field2'] // Optional: specify fields to persist
     }
   })
   ```

### Creating a New Route

1. Add component in `src/views/[Name].vue` using the AppLayout pattern:
   ```vue
   <script setup lang="ts">
   import AppLayout from '@/components/common/AppLayout.vue'
   import PageHeader from '@/components/common/PageHeader.vue'
   </script>

   <template>
     <AppLayout>
       <PageHeader title="My Page" subtitle="Description" />
       <!-- Page content here -->
     </AppLayout>
   </template>
   ```

2. Register in `src/router/index.ts`:
   ```typescript
   {
     path: '/my-route',
     name: 'my-route',
     component: () => import('@/views/MyRoute.vue'),
     meta: { requiresAuth: true } // or requiresGuest: true
   }
   ```

3. The route will automatically appear in AppNavbar - add it to the `navItems` array in `AppNavbar.vue`

### Creating a Supabase Table

1. Add SQL in Supabase dashboard (or document in SUPABASE_SETUP.md)
2. Update `src/types/database.ts` with Row/Insert/Update types
3. **ALWAYS** include:
   - `user_id UUID REFERENCES auth.users(id)` column
   - RLS policies filtering by `auth.uid() = user_id`

### Working with Currency

Use `currency.js` for precise financial calculations (already installed):
```typescript
import currency from 'currency.js'
const total = currency(amount1).add(amount2).value
```

**Never** use floating-point arithmetic for money calculations.

### Working with Dates

Use `date-fns` for date manipulation (already installed):
```typescript
import { format, parseISO, subDays } from 'date-fns'
const formatted = format(new Date(), 'yyyy-MM-dd')
```

## Important Constraints

### Single-User Security Model

- This app is designed for ONE user only
- Security relies on Supabase RLS policies checking `auth.uid()`
- DO NOT expose the service role key in frontend code
- Only the `anon` key should be in `.env.local`

### No Multi-Tenancy

- All data is tied to a single authenticated user
- There is NO concept of organizations, teams, or user roles
- New features should maintain this single-user assumption

### TypeScript Strictness

- Build process runs `vue-tsc` for type checking
- Type errors will fail the production build
- All Supabase queries are typed via `Database` interface

## Deployment Notes

### Environment Variables

When deploying, ensure hosting platform has:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Build Output

- Build command: `npm run build`
- Output directory: `dist/`
- This is a static SPA - no server-side rendering

### Supabase Configuration

Before deployment:
1. Run SQL scripts from `SUPABASE_SETUP.md` to create tables and RLS policies
2. Configure authentication settings (disable email confirmation for single-user)
3. Update Supabase Auth redirect URLs to include production domain

## Database Query Patterns

### Fetching User Data

```typescript
// RLS automatically filters by auth.uid()
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .order('date', { ascending: false })

// No need to add .eq('user_id', userId) - RLS handles it
```

### Inserting User Data

```typescript
// Must include user_id from auth store
const { data, error } = await supabase
  .from('transactions')
  .insert({
    user_id: authStore.user!.id,
    category_id: '...',
    amount: 100,
    date: '2024-01-01',
    type: 'expense'
  })
```

### Real-time Subscriptions

```typescript
// Subscribe to changes for authenticated user's data
const subscription = supabase
  .channel('transactions')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'transactions' },
    (payload) => {
      // RLS ensures you only receive your own data
      console.log('Change:', payload)
    }
  )
  .subscribe()

// Remember to unsubscribe on component unmount
onUnmounted(() => {
  subscription.unsubscribe()
})
```

## Troubleshooting

### "Missing Supabase environment variables" Error
- Ensure `.env.local` exists and contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Environment files are not committed to git - copy from `.env.local.example`

### Authentication Issues
- Check that auth store is initialized before routing
- Verify Supabase Auth settings (email confirmation should be disabled for single-user)
- Check browser console for Supabase auth errors

### Data Not Loading
- Verify RLS policies are created in Supabase (see SUPABASE_SETUP.md)
- Check that user is authenticated (inspect auth store state)
- Look for Supabase errors in Network tab

### Type Errors
- Run `npm run build` to see full TypeScript errors
- Check that `src/types/database.ts` matches your Supabase schema
- Ensure auto-import types are generated (`src/auto-imports.d.ts`)

## Reference Documentation

- **Database Schema**: See `docs/supabase-schema.md` for detailed table definitions, RLS policies, and query patterns
- **Supabase Setup**: See `SUPABASE_SETUP.md` for complete setup instructions and SQL scripts
- **Project Structure**: See `README.md` for feature list and deployment guides
- **Environment Setup**: See `.env.local.example` for required variables
- **TypeScript Types**: See `src/types/database.ts` for Supabase type definitions

## Code Standards

- **Always create reusable components** where possible - extract common patterns into `src/components/common/`
- **Use the AppLayout pattern** for all authenticated pages
- **Update schema documentation** (`docs/supabase-schema.md`) when modifying database structure
- **Maintain RLS policies** on all tables with `user_id` filtering for security
- Do not co-author claude on commits
- Use R$ for money
- Use pt-BR locale for dates