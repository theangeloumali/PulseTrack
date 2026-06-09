# Database Schema Documentation

This document provides comprehensive documentation for the database schema used in the Project Management System.

## Overview

The system uses **PostgreSQL** via **Supabase** with **Drizzle ORM** for type-safe database operations. The schema supports multi-tenancy through company isolation and implements a hierarchical role-based access control system.

## Core Tables

### Companies

The `companies` table serves as the top-level tenant isolation mechanism.

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**TypeScript Interface:**

```typescript
export interface Company extends BaseRecord {
  name: string;
  slug: string;
}
```

### Users

The `users` table stores user information with role-based access control.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  hourly_rate DECIMAL(10,2),
  status user_status DEFAULT 'active',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**TypeScript Interface:**

```typescript
export interface User extends BaseRecord {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  company_id: string;
  hourly_rate?: number | null;
  status?: "active" | "inactive";
  invited_by?: string | null;
  invited_at?: string | null;
}
```

### Projects

The `projects` table manages project information within companies.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'active',
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**TypeScript Interface:**

```typescript
export interface Project extends BaseRecord {
  name: string;
  description?: string | null;
  status: ProjectStatus;
  company_id: string;
  created_by: string;
  start_date?: string | null;
  end_date?: string | null;
}
```

### Tickets

The `tickets` table manages tasks and issues within projects.

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status ticket_status NOT NULL DEFAULT 'new',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**TypeScript Interface:**

```typescript
export interface Ticket extends BaseRecord {
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  project_id: string;
  assigned_to?: string | null;
  created_by: string;
  estimated_hours?: number | null;
  actual_hours?: number | null;
}
```

### Time Entries

The `time_entries` table tracks time spent on tickets and projects.

```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  description TEXT,
  hours DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL,
  billable BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**TypeScript Interface:**

```typescript
export interface TimeEntry extends BaseRecord {
  user_id: string;
  project_id: string;
  ticket_id?: string | null;
  description?: string | null;
  hours: number;
  date: string;
  billable?: boolean;
  hourly_rate?: number | null;
}
```

## Enum Types

### User Roles

```sql
CREATE TYPE user_role AS ENUM (
  'super_admin',
  'system_admin',
  'company_admin',
  'manager',
  'user'
);
```

**TypeScript Type:**

```typescript
export type UserRole =
  | "super_admin"
  | "system_admin"
  | "company_admin"
  | "manager"
  | "user";
```

### User Status

```sql
CREATE TYPE user_status AS ENUM ('active', 'inactive');
```

**TypeScript Type:**

```typescript
export type UserStatus = "active" | "inactive";
```

### Project Status

```sql
CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');
```

**TypeScript Type:**

```typescript
export type ProjectStatus = "active" | "archived" | "completed";
```

### Ticket Status

```sql
CREATE TYPE ticket_status AS ENUM ('new', 'in_progress', 'review', 'done');
```

**TypeScript Type:**

```typescript
export type TicketStatus = "new" | "in_progress" | "review" | "done";
```

### Ticket Priority

```sql
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
```

**TypeScript Type:**

```typescript
export type TicketPriority = "low" | "medium" | "high" | "critical";
```

## Billing System Tables

### Billing Settings

```sql
CREATE TABLE billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_frequency billing_frequency NOT NULL DEFAULT 'monthly',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);
```

### Billing Rates

```sql
CREATE TABLE billing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT,
  hourly_rate DECIMAL(10,2) NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Billing Periods

```sql
CREATE TABLE billing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status billing_status NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Relationship Tables

### Project Members

```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

### Comments

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Indexes and Constraints

### Performance Indexes

```sql
-- User lookup indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);

-- Project indexes
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- Ticket indexes
CREATE INDEX idx_tickets_project_id ON tickets(project_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);

-- Time entry indexes
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_billable ON time_entries(billable);

-- Billing indexes
CREATE INDEX idx_billing_periods_company_id ON billing_periods(company_id);
CREATE INDEX idx_billing_rates_company_id ON billing_rates(company_id);
```

### Foreign Key Constraints

All foreign key relationships include appropriate CASCADE or RESTRICT actions:

- **ON DELETE CASCADE**: Used for company-owned data (when company deleted, all related data is removed)
- **ON DELETE SET NULL**: Used for user assignments (when user deleted, assignments become null)
- **ON DELETE RESTRICT**: Used for critical relationships that should prevent deletion

## Data Access Patterns

### Company Isolation

All queries must filter by `company_id` to ensure multi-tenant isolation:

```sql
-- Good: Company-isolated query
SELECT * FROM projects WHERE company_id = $1;

-- Bad: Cross-company query (only allowed for super_admin)
SELECT * FROM projects;
```

### Role-Based Filtering

Queries include role-based filtering:

```sql
-- Manager can see all company projects
SELECT * FROM projects WHERE company_id = $1;

-- User can only see assigned projects
SELECT p.* FROM projects p
JOIN project_members pm ON p.id = pm.project_id
WHERE p.company_id = $1 AND pm.user_id = $2;
```

## Migration Strategy

### Drizzle Migrations

Migrations are managed through Drizzle ORM:

```bash
# Generate migration
cd apps/web && pnpm migration:generate

# Run migration
cd apps/web && pnpm migration:run
```

### Schema Evolution

When updating schema:

1. Create migration files in `apps/web/lib/db/migrations/`
2. Update TypeScript types in `apps/web/lib/db/schema.ts`
3. Update service layer in `apps/web/lib/db/service.ts`
4. Test migrations in development
5. Deploy with downtime window if needed

## Security Considerations

### Row Level Security (RLS)

Supabase RLS policies enforce access control:

```sql
-- Example: Users can only see their company's data
CREATE POLICY company_isolation ON projects
  FOR ALL USING (company_id = (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));
```

### Data Validation

- All enum values are validated at database level
- Foreign key constraints prevent orphaned records
- NOT NULL constraints ensure data integrity
- Unique constraints prevent duplicates

### Audit Trail

Consider implementing audit logging for sensitive operations:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Performance Considerations

### Query Optimization

- Use appropriate indexes for frequent queries
- Avoid N+1 queries with proper JOINs
- Use connection pooling in production
- Monitor slow queries and optimize

### Data Archival

Consider archival strategy for large datasets:

- Archive old time entries
- Soft delete vs hard delete for critical data
- Separate reporting database for historical data

## Related Documentation

- [`role-system.md`](./role-system.md) - Role hierarchy and permissions
- [`api-endpoints.md`](./api-endpoints.md) - API data access patterns
- [`authentication.md`](./authentication.md) - User authentication flow
- [`CLAUDE.md`](../CLAUDE.md) - Database setup and migration commands
