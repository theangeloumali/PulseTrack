# PulseTrack Repository Guide

## Overview

PulseTrack is a comprehensive project management and time tracking system built specifically for software development teams. It provides powerful ticket management, time tracking, billing, and user management capabilities with role-based access control.

## What PulseTrack Does

### Core Features

1. **Project Management**

   - Create and manage projects
   - Organize work with structured ticket system
   - Track project progress and analytics

2. **Ticket Management**

   - Create, assign, and track tickets
   - Kanban-style board with drag-and-drop functionality
   - Ticket status workflows (To Do, In Progress, Done, etc.)
   - Priority levels and due dates
   - Comments and collaboration

3. **Time Tracking**

   - Start/stop timers for tickets
   - Manual time entry logging
   - Automatic time calculations
   - Detailed time entry reports

4. **Billing System**

   - Automated billing period generation
   - Flexible billing rates (project-specific, user-specific, company defaults)
   - Invoice generation and payment tracking
   - User-specific billing periods
   - Outstanding payment management
   - PDF export capabilities

5. **User Management**

   - Role-based access control (Super Admin, System Admin, Company Admin, Manager, User)
   - Company-based user isolation
   - User invitation system
   - Profile management

6. **Authentication & Security**
   - Supabase authentication integration
   - Secure session management
   - Role-based permissions
   - Company data isolation

## Repository Structure

```
apps/web/                          # Main Next.js application
├── app/                           # Next.js App Router pages and API routes
│   ├── (dashboard)/              # Dashboard pages with authentication
│   ├── (auth)/                   # Authentication pages
│   └── api/                      # API routes
├── components/                   # React components
│   ├── ui/                      # Base UI components (shadcn/ui)
│   ├── auth/                    # Authentication components
│   ├── billing/                 # Billing and invoice components
│   ├── tickets/                 # Ticket management components
│   ├── payments/                # Payment tracking components
│   └── projects/                # Project management components
├── lib/                         # Core application logic
│   ├── db/                      # Database layer (Drizzle ORM)
│   ├── hooks/                   # React Query hooks
│   ├── stores/                  # Zustand state management
│   ├── supabase/               # Supabase client configuration
│   └── utils.ts                # Utility functions
├── screens/                     # Page-specific components
└── tests/                       # Test files and debugging
```

## Technology Stack

### Frontend

- **Framework**: Next.js 15 with App Router
- **React**: Version 19
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand for client state
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Themes**: next-themes for dark mode
- **Icons**: Lucide React

### Backend

- **API**: Next.js 15 API Routes
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM for type-safe database queries
- **Authentication**: Supabase Auth
- **File Storage**: Local filesystem (expandable to cloud storage)

### Development

- **Monorepo**: Turbo with pnpm workspaces
- **Package Manager**: pnpm
- **TypeScript**: 5.7.3 for full type safety
- **Build System**: Turbo for efficient builds
- **Linting**: ESLint with workspace configuration

## Key Architectural Decisions

### 1. Data Layer Architecture

- **Service Layer Pattern**: All database operations go through `lib/db/service.ts`
- **Type Safety**: Comprehensive TypeScript types from database schema
- **Query Optimization**: Efficient joins and indexes for performance
- **Data Isolation**: Company-based data separation for security

### 2. Authentication & Authorization

- **Supabase Auth**: Handles user authentication and session management
- **Role-Based Access Control**: Five-tier role system with granular permissions
- **Company Isolation**: Users can only access data within their company
- **Secure API Routes**: All endpoints verify user permissions

### 3. State Management Strategy

- **Server State**: TanStack Query for API data with caching
- **Client State**: Zustand for local UI state
- **Form State**: React Hook Form for complex forms
- **Global State**: Minimal global state, prefer component-level state

### 4. Component Architecture

- **Compound Components**: Complex components broken into smaller, reusable parts
- **Custom Hooks**: Business logic extracted into reusable hooks
- **UI Components**: shadcn/ui for consistent design system
- **Type Safety**: Full TypeScript coverage for all components

## How the System Works

### User Journey

1. **Authentication**: Users log in via Supabase Auth
2. **Company Context**: System determines user's company and role
3. **Dashboard Access**: Users see role-appropriate dashboard
4. **Project Work**: Users work on assigned projects and tickets
5. **Time Tracking**: Time is logged against tickets
6. **Billing Process**: Admins generate billing periods and invoices
7. **Payment Tracking**: Payment status is managed through completion

### Data Flow

1. **User Actions**: UI interactions trigger React hooks
2. **API Calls**: Hooks make authenticated API requests
3. **Service Layer**: API routes call service functions
4. **Database Operations**: Services execute optimized database queries
5. **Response Chain**: Data flows back through the same chain
6. **Cache Updates**: TanStack Query updates local cache
7. **UI Updates**: React re-renders with new data

### Key Business Logic

#### Billing System

- **Rate Priority**: Project rates > User rates > Company defaults
- **Time Entry Calculation**: Duration × Applicable rate = Billable amount
- **Period Generation**: Automated based on company billing frequency
- **User-Specific Billing**: Can generate periods for individual users
- **Payment Tracking**: Complete audit trail of payment status changes

#### Time Tracking

- **Real-time Timers**: Start/stop functionality with live updates
- **Manual Entries**: Direct time entry for flexibility
- **Ticket Association**: All time must be associated with a ticket
- **Validation**: Prevents overlapping time entries and invalid durations

#### Project Management

- **Hierarchical Structure**: Companies → Projects → Tickets → Time Entries
- **Status Workflows**: Configurable ticket status transitions
- **Assignment Logic**: Users can only be assigned within their company
- **Progress Tracking**: Automatic progress calculation based on ticket completion

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up environment variables (copy `.env.local.example`)
4. Run database migrations: `cd apps/web && pnpm migration:run`
5. Start development server: `pnpm dev`

### Common Development Tasks

- **Add new component**: Create in appropriate `components/` subdirectory
- **Add API endpoint**: Create in `app/api/` with proper authentication
- **Add database table**: Update schema in `lib/db/schema.ts` and generate migration
- **Add new page**: Create in `app/(dashboard)/` or `app/(auth)/`

## Development Workflow

### Making Changes

1. Create feature branch from main
2. Implement changes following existing patterns
3. Update tests if applicable
4. Run type checking: `cd apps/web && pnpm typecheck`
5. Run linting: `pnpm lint`
6. Build project: `pnpm build`
7. Create pull request

### Code Standards

- Follow TypeScript best practices
- Use consistent naming conventions
- Implement proper error handling
- Add JSDoc comments for complex functions
- Follow the established component patterns

### Testing

- Run type checking before commits
- Test in both light and dark modes
- Verify responsive design
- Test role-based access controls
- Validate billing calculations

## Deployment

PulseTrack is deployed to Vercel with automatic deployments from the main branch. The application supports both direct access and proxy deployment configurations for integration with existing domains.

## Further Reading

- [Billing System Documentation](./BILLING_SYSTEM.md) - Detailed billing system architecture
- [API Documentation](./docs/api-endpoints.md) - Complete API reference
- [Database Schema](./docs/database-schema.md) - Database structure and relationships
- [Role System](./docs/role-system.md) - Complete role-based access control guide
