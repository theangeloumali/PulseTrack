# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PulseTrack is a project management system with ticket tracking, time tracking, and billing features. Built as a Turbo monorepo with Next.js 15 (App Router) and Supabase.

## Commands

```bash
# Development
pnpm dev                              # Start dev server (http://localhost:4649)
pnpm build                            # Build all apps
pnpm lint                             # Lint all packages
pnpm format                           # Format with Prettier

# Web app specific (from apps/web/)
cd apps/web && pnpm typecheck         # TypeScript check (run before commits)
cd apps/web && pnpm migration:generate # Generate new Drizzle migration
cd apps/web && pnpm migration:run     # Apply migrations
```

**Always run `pnpm build` and `pnpm typecheck` before completing work.**

## Architecture

### Monorepo Structure

```
apps/web/          # Main Next.js 15 application
├── app/           # App Router pages and API routes
├── components/    # React components (shadcn/ui based)
├── lib/
│   ├── db/        # Database layer (schema, service, queries)
│   ├── hooks/     # TanStack Query hooks for data fetching
│   ├── stores/    # Zustand stores (auth.ts is primary)
│   └── supabase/  # Supabase client configuration
└── screens/       # Page-specific screen components
packages/ui/       # Shared UI components (@workspace/ui)
docs/              # System documentation (role-system.md, database-schema.md, etc.)
```

### Data Flow Pattern

```
Component → useHook (TanStack Query) → service.ts → Supabase
                                          ↓
                                    queries.ts (field selectors)
```

1. **Components** use custom hooks from `lib/hooks/`
2. **Hooks** wrap TanStack Query for caching/mutations
3. **Service layer** (`lib/db/service.ts`) handles all database operations
4. **Query fragments** (`lib/db/queries.ts`) define reusable field selectors

### Key Files

- `lib/db/schema.ts` - TypeScript types for all database entities
- `lib/db/service.ts` - All database CRUD operations (use this, not raw Supabase calls)
- `lib/stores/auth.ts` - Zustand auth store with session management
- `lib/hooks/` - Domain-specific hooks: `useTickets`, `useBilling`, `useProjects`, etc.
- `components/providers.tsx` - App wrapper with QueryProvider, AuthGate, SidebarLayout

### Authentication Flow

```
providers.tsx → AuthGate → SidebarLayout → Page
                   ↓
            useAuthStore (Zustand)
                   ↓
            Supabase Auth + users table
```

- Supabase Auth handles authentication
- `users` table stores app-specific user data (role, company_id, hourly_rate)
- AuthGate prevents rendering until auth state is resolved

### Role Hierarchy

`super_admin` > `system_admin` > `company_admin` > `manager` > `user`

See `docs/role-system.md` for complete permission matrix.

## Coding Patterns

### Database Operations

```typescript
// ✅ CORRECT: Use service layer
import { getTicketById, createTicket } from "@/lib/db/service";
const ticket = await getTicketById(id);

// ❌ WRONG: Direct Supabase calls in components
const { data } = await supabase.from("tickets").select("*");
```

### Data Fetching in Components

```typescript
// Use domain-specific hooks
import { useTickets } from "@/lib/hooks/useTickets";
const { tickets, isLoading } = useTickets(companyId);
```

### State Management

- **Server state**: TanStack Query (via hooks in `lib/hooks/`)
- **Client state**: Zustand (auth store, UI state)
- **Form state**: React Hook Form + Zod validation

### Component Exports

Use named exports, not default exports:

```typescript
// ✅ export function MyComponent() {}
// ❌ export default function MyComponent() {}
```

## Deployment

- Deployed to pulsetrack.zkidzdev.com as a standalone app
- Middleware in `lib/supabase/middleware.ts` handles auth routing

## Known Patterns

### Optimistic Updates with TanStack Query

Don't invalidate cache on success for optimistic updates - only invalidate on error to revert:

```typescript
onSuccess: () => { /* keep optimistic state */ },
onError: () => { queryClient.invalidateQueries({ queryKey: ticketKeys.all }); }
```

### Portal Pattern for Dropdowns

Use React portals for dropdowns in complex layouts (kanban cards) to escape stacking contexts.

### Drag-and-Drop

Use dedicated drag handles (not entire cards) to avoid click delay issues. See `components/tickets/ticket-board.tsx`.
