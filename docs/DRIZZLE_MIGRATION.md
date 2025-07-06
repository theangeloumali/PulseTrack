# Drizzle ORM Migration

This project has been migrated from raw SQL and Supabase client queries to Drizzle ORM for better type safety, easier migrations, and more maintainable database operations.

## What Changed

### Database Schema

- **Before**: Raw SQL in `database.sql` with manual triggers
- **After**: Type-safe Drizzle schema in `lib/db/schema.ts` with proper relations

### Database Operations

- **Before**: Supabase client with raw SQL queries
- **After**: Drizzle ORM with type-safe queries in `lib/db/service.ts`

### User Creation

- **Before**: Database triggers + client-side fallback (causing race conditions)
- **After**: Explicit client-side user creation with Drizzle

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

### 2. Environment Variables

Add to your `.env.local`:

```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.tdpkueqdmnnzeqeunhia.supabase.co:5432/postgres
```

Get the DATABASE_URL from your Supabase project:

1. Go to Settings > Database
2. Copy the Connection string for Nodejs
3. Replace `[YOUR-PASSWORD]` with your database password

### 3. Run the Migration

Execute the SQL in `lib/db/migrations/0000_initial.sql` in your Supabase SQL editor.

This migration includes:

- All table definitions with proper constraints
- RLS policies for multi-tenant security
- Updated triggers for `updated_at` columns
- **Removed** the problematic user creation trigger

### 4. Update Your Code

The migration maintains backward compatibility:

- Existing type imports from `lib/types/database.ts` still work
- All Zustand stores continue to work without changes
- Auth flows now use explicit Drizzle-based user creation

## New Drizzle Features

### Type-Safe Queries

```typescript
import { getUserWithCompany, createProject } from "@/lib/db/service";

// Get user with company (type-safe)
const user = await getUserWithCompany(userId);

// Create project (with proper TypeScript types)
const project = await createProject({
  name: "New Project",
  companyId: user.companyId,
  ownerId: userId,
});
```

### Schema Management

```bash
# Generate migrations from schema changes
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Open Drizzle Studio (GUI for database)
pnpm db:studio
```

### Relations

Drizzle automatically handles relations between tables:

```typescript
// This automatically joins the company data
const user = await getUserWithCompany(userId);
console.log(user.company.name); // Type-safe access
```

## Testing

### Test Pages

- `/test-drizzle` - Test the Drizzle ORM integration
- `/test-signup` - Test the signup flow with Drizzle

### Test the Setup

1. Navigate to `/test-drizzle`
2. Click "Test Drizzle Setup"
3. Verify all steps complete successfully

## Benefits

1. **Type Safety**: Full TypeScript support for all database operations
2. **Better DX**: Auto-completion and error checking in your IDE
3. **Maintainable**: Schema changes are tracked and versioned
4. **Performance**: Optimized queries with proper joins
5. **Debugging**: Better error messages and query introspection

## Migration Checklist

- [x] Install Drizzle dependencies
- [x] Create Drizzle schema matching existing database
- [x] Create database service functions
- [x] Update auth helpers to use Drizzle
- [x] Create migration SQL file
- [x] Add npm scripts for Drizzle commands
- [x] Create test pages for validation
- [ ] Run migration SQL in Supabase
- [ ] Test signup flow end-to-end
- [ ] Update existing components to use new service functions (optional)

## Next Steps

1. Run the migration SQL in your Supabase project
2. Test the signup flow at `/signup`
3. Verify the `/test-drizzle` page works correctly
4. Gradually migrate existing components to use the new service functions
5. Remove the old `database.sql` file once everything is working

The migration is designed to be backward compatible, so existing code should continue to work while you gradually adopt the new Drizzle-based approach.
