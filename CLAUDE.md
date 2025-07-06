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

**IMPORTANT**: Task Master commands must be run from the **project root directory** (`/Users/angelo/Desktop/Work/ZKidz/PulseTrack`), NOT from `apps/web/`. The `.taskmaster/` directory is located at the project root.

```bash
# Always navigate to project root first
cd /Users/angelo/Desktop/Work/ZKidz/PulseTrack

# Then run task-master commands
task-master next
task-master add-task --prompt="..." --research
task-master set-status --id=<task-id> --status=done
```

**Workflow Steps**:
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

## Problem-Solving Memory: Complex Bug Resolution

### 🔬 Systematic Debugging Approach for Persistent Issues

When facing complex bugs that don't resolve with standard fixes, follow this proven methodology:

#### **1. Document the Problem-Solving Journey**
- Create mental or written notes tracking each attempt
- Document: **Problem → Fix → Result** for each iteration
- Maintain running theory of root cause
- Plan next steps if current attempt fails

#### **2. Add Comprehensive Debugging**
- Use emoji-coded console logs for easy identification
- Make invisible state changes visible
- Track the full flow: input → processing → output → side effects

#### **3. Build Custom Solutions When Libraries Fail**
- Don't rely solely on library defaults
- Create context-aware handlers for complex interaction patterns
- Implement smart collision detection, custom state management, etc.

### 🎯 **Case Study: Drag-and-Drop Persistence Bug (July 2025)**

**Issue**: Manual reordering within kanban columns reverted to original state despite multiple implementation attempts.

**Root Causes Found**:
1. **State Management Inconsistency**: Mixed usage of `setLocalTickets` vs `setOptimisticTickets`
2. **Cache Invalidation Conflict**: React Query cache invalidation was overriding optimistic updates

**Solution Pattern**:
```typescript
// ❌ WRONG: Mixed state management
setLocalTickets(prevTickets => { /* update */ });      // Wrong variable
setOptimisticTickets(prevTickets => { /* update */ }); // Correct variable

// ❌ WRONG: Aggressive cache invalidation
onSuccess: () => {
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ticketKeys.all });
  }, 500); // This overrides optimistic updates!
}

// ✅ CORRECT: Persistent optimistic updates
onSuccess: () => {
  console.log('✅ Sort order update successful - keeping optimistic state');
  // No invalidation - let optimistic state persist
},
onError: (error) => {
  // Only invalidate on error to revert
  queryClient.invalidateQueries({ queryKey: ticketKeys.all });
}
```

**Key Lesson**: When optimistic updates keep getting overridden, check for:
- Inconsistent state variable usage
- Automatic cache invalidation timing conflicts
- Multiple state management patterns in the same component

### 🧠 **Application to Future Complex Issues**

#### **For State Management Bugs**:
1. **Audit state variable consistency** - Use single source of truth
2. **Review cache invalidation timing** - Avoid overriding optimistic updates
3. **Add debugging logs** to track state flow
4. **Test error scenarios** to ensure proper fallback behavior

#### **For UI Interaction Issues**:
1. **Document each attempt** with specific results
2. **Add visible debugging** with clear markers
3. **Build custom solutions** when libraries don't handle your exact use case
4. **Test edge cases** systematically

#### **General Problem-Solving Pattern**:
```
Complex Issue?
├── Document attempts → Track what's been tried
├── Add debugging → Make invisible visible  
├── Identify patterns → Look for systematic issues
├── Build custom solution → Don't rely only on defaults
└── Test systematically → Verify all interaction patterns
```

This methodology turned a frustrating persistent bug into a robust, well-debugged feature! 🎉

### 🎯 **Case Study: Z-Index Dropdown Visibility Bug (July 2025)**

**Issue**: Dropdown menus and popups in the kanban board were appearing behind ticket cards and other UI elements, making them invisible or partially obscured.

**Root Causes Found**:
1. **CSS Stacking Context Limitations**: Parent containers with transforms, opacity, or other CSS properties create stacking contexts that limit z-index effectiveness
2. **Relative Positioning Conflicts**: Dropdowns rendered within component hierarchy were constrained by parent z-index values

**Solution Pattern - Portal-Based Dropdowns**:
```typescript
// ❌ WRONG: Traditional z-index approach (fails in stacking contexts)
<div className="relative">
  <button>Trigger</button>
  <div className="absolute z-[9999] top-full left-0">
    Dropdown content
  </div>
</div>

// ✅ CORRECT: Portal-based approach with smart positioning
import { createPortal } from 'react-dom';

function DropdownPortal({ 
  isOpen, 
  triggerRef, 
  children, 
  position = 'bottom-left' 
}: { 
  isOpen: boolean; 
  triggerRef: React.RefObject<HTMLElement>; 
  children: React.ReactNode;
  position?: 'bottom-left' | 'bottom-right';
}) {
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

      let top = rect.bottom + scrollY + 8; // 8px below trigger
      let left = position === 'bottom-right' ? rect.right + scrollX : rect.left + scrollX;

      setDropdownPosition({ top, left });
    }
  }, [isOpen, triggerRef, position]);

  if (!isOpen || typeof window === 'undefined') return null;
  
  return createPortal(
    <div 
      className="fixed z-[9999] pointer-events-auto"
      style={{ 
        top: dropdownPosition.top, 
        left: dropdownPosition.left 
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// Usage in component:
const triggerRef = React.useRef<HTMLButtonElement>(null);
const [isOpen, setIsOpen] = useState(false);

return (
  <>
    <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
      Trigger
    </button>
    <DropdownPortal 
      isOpen={isOpen} 
      triggerRef={triggerRef}
      position="bottom-left"
    >
      Dropdown content
    </DropdownPortal>
  </>
);
```

**Key Technical Concepts**:
- **React Portal (`createPortal`)**: Renders dropdown at document root level, completely bypassing stacking context constraints
- **Smart Positioning Algorithm**: Uses `getBoundingClientRect()` to calculate exact pixel coordinates relative to trigger elements
- **Scroll-Aware Positioning**: Accounts for page scroll position using `window.pageYOffset` and `document.documentElement.scrollTop`
- **Fixed Positioning**: Uses CSS `fixed` positioning with calculated coordinates for reliable placement
- **Configurable Alignment**: Supports different positioning strategies (bottom-left, bottom-right) for various use cases

**When to Use This Pattern**:
1. **Dropdown/Popup Visibility Issues**: When z-index approaches fail due to stacking contexts
2. **Complex Component Hierarchies**: In nested layouts where traditional positioning is constrained
3. **Consistent UX Requirements**: When all dropdowns need uniform behavior across the application
4. **Kanban Boards**: Specifically useful in card-based layouts where cards create stacking contexts

**Implementation Checklist**:
- [ ] Create reusable `DropdownPortal` component
- [ ] Add refs to all dropdown trigger elements (`useRef<HTMLElement>`)
- [ ] Implement position calculation with scroll awareness
- [ ] Add positioning options for different alignment needs
- [ ] Apply portal pattern consistently across all dropdowns
- [ ] Test dropdown positioning with page scrolling
- [ ] Verify dropdowns appear above all other content

**Files Updated**: `components/tickets/ticket-board.tsx:56-97` - DropdownPortal component implementation

This portal-based solution provides bulletproof dropdown visibility by rendering outside the normal component hierarchy! 🎯

### 🔐 **Case Study: Authentication Session Persistence Fix (July 2025)**

**Issue**: Users reported that authentication sessions were being lost and required page refreshes to work again, indicating poor session persistence.

**Root Causes Found**:
1. **Multiple Session Managers Conflict**: The app had three competing session management systems:
   - Zustand auth store
   - SessionManager singleton  
   - Supabase's built-in session management
2. **Race Conditions**: Multiple components could trigger session refresh simultaneously without coordination
3. **Poor Storage Configuration**: Missing explicit Supabase client storage options
4. **Initialization Conflicts**: Auth initialization happening at multiple points without proper coordination

**Solution Pattern - Consolidated Session Management**:
```typescript
// ❌ WRONG: Multiple competing session managers
// SessionManager + AuthStore + Supabase all managing sessions independently

// ✅ CORRECT: Single source of truth with proper coordination
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Race condition prevention in auth store
initialize: async () => {
  const { isInitializing } = get();
  
  // Prevent multiple simultaneous initialization calls
  if (isInitializing) {
    console.log('🔄 Auth Store: Initialization already in progress, waiting...');
    let attempts = 0;
    while (get().isInitializing && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return;
  }

  try {
    set({ isInitializing: true });
    // ... initialization logic
  } finally {
    set({ isInitializing: false });
  }
}
```

**Key Technical Concepts**:
- **Single Source of Truth**: Use only one session management system (Supabase + Auth Store)
- **Race Condition Prevention**: Add initialization locks to prevent conflicts
- **Proper Storage Configuration**: Explicitly configure localStorage for session persistence
- **Coordinated Initialization**: Ensure auth initialization only happens once

**When to Use This Pattern**:
1. **Multiple Session Managers**: When different parts of the app are managing auth state independently
2. **Session Loss After Refresh**: When users lose authentication state on page refresh
3. **Race Conditions**: When components trigger conflicting session operations
4. **Poor Session Persistence**: When auth tokens aren't properly stored/retrieved

**Implementation Checklist**:
- [ ] Configure Supabase client with explicit storage options
- [ ] Add race condition prevention in auth store initialization
- [ ] Disable conflicting session managers (SessionManager singleton)
- [ ] Fix auth initializer timing issues
- [ ] Add proper error handling for auth vs network errors
- [ ] Test session persistence across page refreshes
- [ ] Verify no competing auth state modifications

**Files Updated**: 
- `lib/supabase/client.ts:3-14` - Added proper storage configuration
- `lib/stores/auth.ts:276-393` - Added race condition prevention and improved initialization
- `lib/session-manager.ts:11-19` - Disabled to prevent conflicts
- `components/auth-initializer.tsx:37-105` - Fixed timing issues and coordination

**Key Lesson**: When authentication sessions are unstable, look for:
- Multiple systems managing the same state
- Race conditions in initialization
- Missing storage configuration
- Competing error handling strategies

This consolidated approach ensures reliable session persistence by eliminating conflicts between multiple session managers! 🔐

### 🚀 **Case Study: Smooth Auth Loading Experience (July 2025)**

**Issue**: Users experienced jarring authentication flows with flashes of login page before being redirected to dashboard, creating a poor first-load experience.

**Root Causes Found**:
1. **Multiple Redirect Layers**: Server middleware + client AuthInitializer both performing redirects simultaneously
2. **Flash of Login Page**: Users saw login page briefly before being redirected to dashboard
3. **Uncoordinated Loading States**: Different components managing loading independently without coordination
4. **Race Conditions**: Multiple auth checks happening simultaneously causing visual flickers

**Solution Pattern - Global Auth Gate**:
```typescript
// ❌ WRONG: Multiple components doing route protection independently
// Middleware redirects → AuthInitializer redirects → SidebarLayout checks → Flash!

// ✅ CORRECT: Single Auth Gate that prevents rendering until auth is resolved
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRouteResolved, setIsRouteResolved] = useState(false);
  const { user, isLoading, isInitializing, initialize } = useAuthStore();

  // Prevent any route rendering until auth is fully resolved
  if (!isHydrated || isLoading || isInitializing || !isRouteResolved) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}

// Reduced middleware aggression - only protect specific routes
const specificProtectedRoutes = ['/admin', '/settings'];
const needsProtection = specificProtectedRoutes.some(route => 
  request.nextUrl.pathname.startsWith(route)
);

if (!user && needsProtection) {
  // Only redirect for highly sensitive routes
  return NextResponse.redirect(url);
}
```

**Key Technical Concepts**:
- **Global Auth Gate**: Single component that prevents route rendering until auth is resolved
- **Coordinated Loading States**: All auth states managed through one component
- **Professional Loading Screen**: Branded loading experience with progress indicators
- **Reduced Server Redirects**: Let client handle most routing decisions
- **Route Resolution Control**: Only show content when auth state is fully determined

**When to Use This Pattern**:
1. **Flash of Wrong Content**: When users see login page before dashboard redirect
2. **Poor Loading UX**: When auth loading feels jarring or unprofessional
3. **Multiple Redirect Sources**: When server and client both do route protection
4. **Inconsistent Loading States**: When different components show different loading states

**Implementation Checklist**:
- [ ] Create Global AuthGate component with professional loading screen
- [ ] Reduce middleware redirect scope to only critical routes
- [ ] Replace AuthInitializer with AuthGate in app providers
- [ ] Add coordinated loading states (isHydrated, isRouteResolved)
- [ ] Add progress indicators and smooth animations
- [ ] Test first-load experience on various routes
- [ ] Verify no flash of wrong content during auth resolution

**Files Updated**:
- `components/auth-gate.tsx:1-169` - New global auth gate with smooth loading
- `lib/supabase/middleware.ts:95-117` - Reduced redirect aggression
- `components/providers.tsx:5-31` - Replaced AuthInitializer with AuthGate

**Key Lesson**: When authentication flows feel jarring, look for:
- Multiple components doing route protection
- Server vs client redirect conflicts
- Uncoordinated loading states
- Missing professional loading experiences

This global auth gate pattern provides a smooth, professional first-load experience that never shows the wrong content to users! 🚀

### 🎯 **Case Study: Drag-and-Drop Navigation Interference Fix (July 2025)**

**Issue**: Clicking on ticket titles in the kanban board didn't immediately navigate - there was a noticeable delay before the link activated, creating poor user experience.

**Root Causes Found**:
1. **Drag Sensor Activation Delay**: `PointerSensor` with `activationConstraint: { distance: 3 }` required 3px movement before determining click vs drag intent
2. **Entire Card as Drag Target**: Drag listeners (`{...listeners}`) applied to the whole card intercepted all click events
3. **Event Handler Competition**: Link clicks competed with drag detection, causing delays while the system determined user intent

**Solution Pattern - Dedicated Drag Handle**:
```typescript
// ❌ WRONG: Entire card has drag listeners causing click delays
<Card 
  {...attributes}
  {...listeners} // This intercepts ALL clicks on the card
  className="cursor-grab active:cursor-grabbing"
>
  <Link href="/ticket/123">Click me</Link> // Delayed by drag detection
</Card>

// ✅ CORRECT: Only grip handle has drag listeners
<Card 
  {...attributes}
  className="cursor-default" // Normal cursor for card
>
  <div 
    {...listeners} // Only the grip handle is draggable
    className="cursor-grab active:cursor-grabbing hover:text-gray-600"
    title="Drag to reorder"
  >
    <GripVertical className="h-4 w-4" />
  </div>
  <Link 
    href="/ticket/123"
    className="cursor-pointer hover:text-blue-600" // Immediate navigation
  >
    Click me
  </Link>
</Card>

// Improved sensor configuration for remaining drag interactions
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      delay: 100, // Time-based instead of distance-based
      tolerance: 5, // Allow slight movement during delay
    },
  })
);
```

**Key Technical Concepts**:
- **Dedicated Drag Handle**: Only specific UI elements (grip icons) trigger drag operations
- **Time-Based Activation**: Use delay instead of distance for more predictable behavior
- **Event Separation**: Separate click and drag event handlers to prevent interference
- **Clear UX Patterns**: Visual indication of draggable vs clickable areas

**When to Use This Pattern**:
1. **Click Delays in Draggable Items**: When clickable content within draggable containers feels sluggish
2. **Mixed Interaction Patterns**: When same element needs both click and drag functionality
3. **Poor User Feedback**: When users are unsure if clicks registered or drag will activate
4. **Complex Interactive Cards**: When cards have multiple interactive elements (links, buttons, etc.)

**Implementation Checklist**:
- [ ] Move drag listeners from container to dedicated handle element
- [ ] Use time-based activation instead of distance-based
- [ ] Add visual indicators for draggable areas (grip icons, cursor changes)
- [ ] Remove `cursor-grab` from main content areas
- [ ] Test click responsiveness on all interactive elements
- [ ] Ensure drag functionality still works smoothly
- [ ] Add hover states for better UX feedback

**Files Updated**:
- `components/tickets/ticket-board.tsx:573-580` - Improved sensor configuration with delay-based activation
- `components/tickets/ticket-board.tsx:315-341` - Moved drag listeners to grip handle only

**Key Lesson**: When clickable elements in draggable containers feel sluggish, look for:
- Drag listeners applied too broadly (entire container vs specific handle)
- Distance-based activation constraints causing delays
- Competing event handlers for same interaction area
- Missing visual separation between clickable and draggable areas

This dedicated drag handle pattern provides immediate click responsiveness while maintaining smooth drag functionality! 🎯

## Development Efficiency Memories

### Parallel Tool Invocation

* **For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.**