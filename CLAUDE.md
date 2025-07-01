# Claude Collaboration File

This file helps Claude understand this project to provide more relevant and accurate assistance. By keeping this file updated, you can improve the AI's ability to help with development tasks.

## 1. Project Overview

This is PulseTrack, a comprehensive project management system that includes ticket tracking, user management, time tracking, and billing features. It's built with Next.js 15 and Supabase as a monorepo using Turbo and pnpm workspaces.

## 2. Tech Stack

**Frontend:**
* Framework: Next.js 15 (React 19) with App Router
* Styling: Tailwind CSS, shadcn/ui components
* State Management: Zustand
* Data Fetching: TanStack Query (React Query)
* Forms: React Hook Form with Zod validation
* Themes: next-themes
* Icons: Lucide React

**Backend:**
* Framework: Next.js 15 API Routes
* Database: Supabase (PostgreSQL)
* ORM: Drizzle ORM
* Authentication: Supabase Auth
* Analytics: Vercel Analytics

**Development:**
* Monorepo: Turbo with pnpm workspaces
* Package Manager: pnpm
* TypeScript: 5.7.3
* Build Tool: Turbo
* Linting: ESLint with custom workspace config

## 3. Getting Started & Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Copy `.env.local.example` to `.env.local` and fill in the required Supabase values.
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   ```

3. **Run database migrations:**
   ```bash
   cd apps/web && pnpm migration:run
   ```

## 4. Common Commands

* **Run development server:**
  ```bash
  pnpm dev
  ```

* **Build for production:**
  ```bash
  pnpm build
  ```

* **Run linter:**
  ```bash
  pnpm lint
  ```

* **Check for type errors:**
  ```bash
  cd apps/web && pnpm typecheck
  ```

* **Generate database migrations:**
  ```bash
  cd apps/web && pnpm migration:generate
  ```

* **Run database migrations:**
  ```bash
  cd apps/web && pnpm migration:run
  ```

## 5. Directory Structure Overview

* `apps/web/`: Main Next.js application
* `apps/web/app/`: Next.js App Router pages and API routes
* `apps/web/components/`: Shared React components and UI components
* `apps/web/lib/`: Core application logic, database queries, and utility functions
* `apps/web/lib/db/`: Drizzle ORM schema, queries, and database service logic
* `apps/web/lib/supabase/`: Supabase client and helper configurations
* `apps/web/screens/`: Page-specific components and screens
* `apps/web/tests/`: Test files and debugging utilities
* `packages/`: Shared workspace packages
* `.taskmaster/`: Task Master AI configuration and tasks
* `docs/`: **Comprehensive project documentation** - See [Documentation Overview](#8-project-documentation)

## 6. Coding Conventions & Style

* Follow Next.js 15 App Router conventions
* All database interactions should go through the service layer in `lib/db/service.ts`
* Use named exports instead of default exports for components
* API routes should be organized by feature under `app/api/`
* Use Drizzle ORM for all database operations
* Supabase Auth for authentication and authorization
* TanStack Query for data fetching and caching
* Zustand for client-side state management
* **IMPORTANT**: Run `pnpm build` after making changes if needed to ensure the project builds without errors
* **IMPORTANT**: Always run `cd apps/web && pnpm typecheck` to check for TypeScript errors  
* **IMPORTANT**: Use `pnpm lint` to check for linting issues

## 7. Deployment

The application is deployed to Vercel. Pushes to the `main` branch trigger an automatic production deployment. Preview deployments are created for all pull requests.

### Proxy Deployment Configuration

The Next.js app is configured to work as a sub-path under another domain using Vercel rewrites:

**Next.js Configuration (`next.config.mjs`):**
```javascript
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  basePath: "/pulse",
  assetPrefix: "/pulse",
}
```

**Middleware Proxy Detection (`lib/supabase/middleware.ts`):**
```javascript
// Check if we're being accessed through a proxy
const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
const isProxiedRequest = host === 'zkidzdev.com' || host === 'www.zkidzdev.com';

if (isProxiedRequest) {
  // Maintain the /pulse prefix for proxied requests
  url.pathname = '/pulse/login';
} else {
  url.pathname = '/login';
}
```

**Vite Project Vercel Configuration (`vercel.json`):**
```json
{
  "rewrites": [
    {
      "source": "/pulse",
      "destination": "https://pulsetrack-zkidz-web.vercel.app/pulse"
    },
    {
      "source": "/pulse/:path*",
      "destination": "https://pulsetrack-zkidz-web.vercel.app/pulse/:path*"
    }
  ]
}
```

This configuration allows:
- **Direct access**: `https://pulsetrack-zkidz-web.vercel.app/pulse/` works normally
- **Proxy access**: `https://www.zkidzdev.com/pulse/` proxies to the Next.js app
- **Static assets**: All CSS, JS, and font files load correctly with the `/pulse` prefix
- **Authentication**: Login redirects work properly for both direct and proxy access

## 8. Project Documentation

**Comprehensive documentation is available in the [`docs/`](./docs/) folder:**

### Core System Documentation
- **[`docs/role-system.md`](./docs/role-system.md)** - Complete role-based access control system
  - Role hierarchy: Super Admin → System Admin → Company Admin → Manager → User
  - Permission matrices and access controls
  - Implementation details and usage patterns
  
- **[`docs/authentication.md`](./docs/authentication.md)** - Authentication and authorization guide
  - Supabase Auth integration
  - User registration and invitation flows
  - Session management and security

- **[`docs/database-schema.md`](./docs/database-schema.md)** - Database structure and relationships
  - Complete schema documentation
  - Enum types and constraints
  - Performance indexes and security considerations

- **[`docs/api-endpoints.md`](./docs/api-endpoints.md)** - API documentation and usage
  - Complete endpoint reference
  - Authentication and authorization patterns
  - Error handling and rate limiting

### Quick Reference
- **Role Permissions**: See [`docs/role-system.md`](./docs/role-system.md) for complete role hierarchy
- **API Security**: Check [`docs/api-endpoints.md`](./docs/api-endpoints.md) for authentication patterns
- **Database Access**: Reference [`docs/database-schema.md`](./docs/database-schema.md) for schema details

**Important**: Always reference the documentation when working with roles, permissions, or database operations to ensure consistency and security.

---

# Development Best Practices

## Development Workflow Reminders

* **Always make sensible variables**
* **Always update Task Master before and after implementing features**
* **Run `pnpm build` before handing over work to verify no build errors**

### Variable Naming Conventions
* Use descriptive, meaningful names
* Follow camelCase for variables and functions
* Use PascalCase for component and class names
* Avoid single-letter or overly abbreviated names
* Be consistent with naming across the project

### Task Master Update Workflow
1. Before starting work: `task-master next`
2. Mark task as in-progress: `task-master set-status --id=<current-task-id> --status=in-progress`
3. Implement feature/fix
4. Before completion: 
   - Run `pnpm build`
   - Run `pnpm typecheck`
5. Update Task Master: 
   - `task-master add-task --prompt="Implemented [feature description]" --research`
   - `task-master set-status --id=<new-task-id> --status=done`
6. Mark current task as done: `task-master set-status --id=<current-task-id> --status=done`

**CRITICAL**: Always verify build and type checking before marking tasks complete!