# PulseTrack - Project Management System

![PulseTrack Logo](./assets/pulsetrack%20assets/logo.png)

**PulseTrack** is a comprehensive project management system that includes ticket tracking, user management, time tracking, and billing features. Built with Next.js 15 and Supabase as a modern, scalable monorepo solution.

## 🚀 Features

- **Project Management**: Create and manage projects with team collaboration
- **Ticket Tracking**: Kanban-style ticket board with drag-and-drop functionality
- **Time Tracking**: Track time spent on tickets with automatic billing calculation
- **Billing System**: Generate invoices, manage billing periods, and payment tracking
- **User Management**: Role-based access control with company-based isolation
- **Real-time Updates**: Live updates across all connected clients
- **Dark Mode**: Built-in theme switching with system preference detection

## 🏗️ Architecture

### Tech Stack

**Frontend:**

- Next.js 15 (React 19) with App Router
- TypeScript 5.7.3
- Tailwind CSS + shadcn/ui components
- Zustand for state management
- TanStack Query (React Query) for data fetching
- React Hook Form + Zod for form validation
- Drag-and-drop with @dnd-kit

**Backend:**

- Next.js 15 API Routes
- Supabase (PostgreSQL) for database
- Drizzle ORM for type-safe database operations
- Supabase Auth for authentication
- Row Level Security (RLS) for data isolation

**Development:**

- Turbo monorepo with pnpm workspaces
- ESLint + Prettier for code quality
- Vercel Analytics for monitoring

### Project Structure

```
PulseTrack/
├── apps/
│   ├── web/                     # Main Next.js application
│   │   ├── app/                 # Next.js App Router pages and API routes
│   │   ├── components/          # React components and UI components
│   │   ├── lib/                 # Core application logic and utilities
│   │   │   ├── db/              # Database schema, queries, and services
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── stores/          # Zustand state stores
│   │   │   └── supabase/        # Supabase client configuration
│   │   ├── screens/             # Page-specific components
│   │   └── tests/               # Test files and debugging utilities
│   └── landing/                 # Marketing landing page (Vite)
├── packages/                    # Shared workspace packages
│   └── ui/                      # Shared UI components
├── docs/                        # Comprehensive project documentation
└── assets/                      # Static assets and branding
```

## 🛠️ Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase account and project

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

Copy the environment template and configure your Supabase credentials:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Configure the following environment variables in `apps/web/.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:4649
```

**Where to find these values:**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and Project API keys

### 3. Database Setup

Run the database migrations to set up your schema:

```bash
cd apps/web && pnpm migration:run
```

### 4. Start Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:4649](http://localhost:4649)

## 📋 Available Commands

### Root Level Commands

```bash
# Start all development servers
pnpm dev

# Build all applications for production
pnpm build

# Run linting across all packages
pnpm lint

# Format code with prettier
pnpm format
```

### Web App Commands

```bash
cd apps/web

# Start development server with Turbopack
pnpm dev

# Build for production
pnpm build

# Run type checking
pnpm typecheck

# Run and fix linting issues
pnpm lint:fix

# Generate new database migration
pnpm migration:generate

# Apply database migrations
pnpm migration:run
```

## 🔐 Authentication & Authorization

PulseTrack uses Supabase Auth with a comprehensive role-based access control system:

### User Roles (Hierarchical)

- **Super Admin**: Global system access
- **System Admin**: Multi-company management
- **Company Admin**: Company-wide management
- **Manager**: Project and team management
- **User**: Basic project access + personal billing period generation

### Data Isolation

- Company-based data isolation using Row Level Security (RLS)
- Users can only access data within their company
- Admins have appropriate cross-company access based on role

For detailed authentication flows, see [docs/authentication.md](./docs/authentication.md)

## 💾 Database Schema

The application uses PostgreSQL with Drizzle ORM for type-safe database operations. Key entities include:

- **Companies**: Multi-tenant organization structure
- **Users**: Authentication and role management
- **Projects**: Work organization with team access
- **Tickets**: Task tracking with status and priority
- **Time Entries**: Time tracking linked to tickets
- **Billing**: Automated billing calculations and invoice generation

For complete schema documentation, see [docs/database-schema.md](./docs/database-schema.md)

## 🎯 Key Features Detail

### Project Management

- Create projects with team member assignment
- Role-based project access (public, company, private)
- Project-specific billing rates and settings

### Ticket Tracking

- Kanban board with drag-and-drop reordering
- Status tracking (New → In Progress → Review → Done)
- Priority levels (Low, Medium, High, Critical)
- Assignment and due date management
- Complete change history logging

### Time Tracking

- Start/stop timers linked to specific tickets
- Manual time entry with duration
- Automatic billing rate calculation
- Time entry validation and integrity checks

### Billing System

- Automatic billing period generation (admin and user self-service)
- Flexible billing rates (per-user, per-project, company default)
- Invoice generation with PDF export
- Payment status tracking and history
- Outstanding payment management
- **User Role Billing Access**: Regular users can access payments and billing periods tabs
- **Personal Billing Periods**: Users can generate their own billing periods for company review
- **Role-Based Data Filtering**: Users see only their own billing data, admins see company-wide data
- **Multi-Query Filtering**: Robust filtering system for user-specific billing periods

## 🔧 Configuration

### Deployment Configuration

The app is deployed as a standalone Next.js application at `pulsetrack.zkidzdev.com`. No `basePath` or `assetPrefix` is required.

### Theme Configuration

Built-in dark/light mode with system preference detection:

- Uses `next-themes` for theme management
- Tailwind CSS with CSS variables for theme colors
- Persistent theme selection per user

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[Authentication Guide](./docs/authentication.md)** - Auth flows and security
- **[Database Schema](./docs/database-schema.md)** - Complete database structure
- **[API Reference](./docs/api-endpoints.md)** - API endpoints and usage
- **[Role System](./docs/role-system.md)** - Access control and permissions

## 🧪 Testing

### Development Testing Commands

```bash
# Check TypeScript compilation
cd apps/web && pnpm typecheck

# Run linting
pnpm lint

# Test database connections
node apps/web/tests/check/check-database.cjs

# Test invitation flow
node apps/web/tests/test/test-invitation-flow.cjs
```

### Database Health Checks

```javascript
// Check for data integrity issues
import { checkTimeEntryIntegrity } from "@/lib/db/service";

const issues = await checkTimeEntryIntegrity("company-id");
console.log("Database health:", issues);
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: Add your Supabase credentials to Vercel
3. **Build Settings**: Turbo automatically handles the build process
4. **Domain Configuration**: Set up custom domain if needed

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## 🔒 Security

- **Row Level Security**: Database-level access control
- **Authentication**: Supabase Auth with secure session management
- **CORS**: Properly configured API access
- **Input Validation**: Zod schema validation on all forms
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Make Changes**: Follow existing code conventions
4. **Run Tests**: `pnpm typecheck && pnpm lint`
5. **Commit Changes**: `git commit -m 'Add amazing feature'`
6. **Push to Branch**: `git push origin feature/amazing-feature`
7. **Open Pull Request**

### Development Guidelines

- Follow existing code patterns and conventions
- Use TypeScript for all new code
- Add appropriate error handling
- Update documentation for new features
- Ensure all tests pass before submitting

## 📄 License

This project is proprietary software. All rights reserved.

## 🐛 Troubleshooting

### Common Issues

**Authentication Problems:**

- Verify Supabase credentials in `.env.local`
- Check Supabase project settings and RLS policies
- Ensure database migrations are applied

**Build Errors:**

- Run `pnpm typecheck` to identify TypeScript issues
- Check for missing dependencies with `pnpm install`
- Verify Node.js version compatibility (20+)

**Database Issues:**

- Apply pending migrations: `cd apps/web && pnpm migration:run`
- Check database connection in Supabase dashboard
- Verify RLS policies are properly configured

For additional troubleshooting, see the [documentation](./docs/) or check the existing issues in the repository.

---

**Built with ❤️ by the PulseTrack team**
