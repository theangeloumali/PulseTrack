# Authentication & Authorization System

This document provides comprehensive documentation for the authentication and authorization system used in the Project Management System.

## Overview

The system uses **Supabase Auth** for authentication with custom authorization logic implemented through role-based access control (RBAC). The architecture supports multi-tenancy through company isolation and provides secure access to resources based on user roles.

## Authentication Flow

### User Registration

1. **Signup Process**:

   ```typescript
   // File: apps/web/screens/signup/page.tsx
   const { signUp } = useAuthStore();
   await signUp(email, password, firstName, lastName);
   ```

2. **Email Verification**:
   - User receives verification email from Supabase
   - Clicks verification link
   - Redirected to `/auth/callback` for session creation
   - Final redirect to dashboard

3. **Company Assignment**:
   - New users are assigned to a default company
   - Role defaults to `user` unless specified during invitation

### User Login

1. **Login Process**:

   ```typescript
   // File: apps/web/screens/login/page.tsx
   const { signIn } = useAuthStore();
   await signIn(email, password);
   ```

2. **Session Creation**:
   - Supabase creates authenticated session
   - User data fetched from database
   - Auth store populated with user information
   - Redirect to intended page or dashboard

### Invitation Flow

1. **Admin Invites User**:

   ```typescript
   // File: apps/web/lib/db/service.ts
   export async function inviteUser(userData: NewUser): Promise<void> {
     // Create user record with invited status
     // Send invitation email with secure token
     // Set expiration time for invitation
   }
   ```

2. **User Accepts Invitation**:
   ```typescript
   // File: apps/web/app/auth/accept-invitation/page.tsx
   // Verify invitation token
   // Allow user to set password
   // Activate user account
   // Redirect to dashboard
   ```

## Authentication Components

### Auth Store (Zustand)

Central state management for authentication:

```typescript
// File: apps/web/lib/stores/auth.ts
interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}
```

### Auth Initializer

Handles authentication state on app startup:

```typescript
// File: apps/web/components/auth-initializer.tsx
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { user, loading, refreshUserData } = useAuthStore();

  useEffect(() => {
    // Check for existing session
    // Subscribe to auth state changes
    // Refresh user data if authenticated
  }, []);

  if (loading) return <LoadingSpinner />;
  return <>{children}</>;
}
```

### Route Protection

Pages are protected using role-based guards:

```typescript
// File: apps/web/screens/company/users/page.tsx
export default function CompanyUsersPage() {
  const { canAccessCompany } = useRoleAccess();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessCompany()) {
      router.push("/dashboard");
    }
  }, [canAccessCompany, router]);

  // Page content
}
```

## Authorization System

### Role-Based Access Control

The system implements hierarchical RBAC as documented in [`role-system.md`](./role-system.md):

```typescript
// File: apps/web/lib/hooks/useRoleAccess.ts
export function useRoleAccess() {
  const { user } = useAuthStore();

  const hasRole = (requiredRoles: UserRole | UserRole[]): boolean => {
    if (!user || !user.role) return false;
    const roles = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles];
    return roles.includes(user.role as UserRole);
  };

  // Hierarchical permission checks
  const canAccessCompany = (): boolean =>
    hasRole(["super_admin", "system_admin", "company_admin", "manager"]);
}
```

### Company Isolation

Multi-tenancy is enforced through company-based data isolation:

```typescript
// All database queries filter by company_id
const projects = await getProjects(user.company_id);

// Super admins can override company isolation
if (user.role === "super_admin") {
  const allProjects = await getAllProjects();
}
```

### API Route Protection

API routes implement authentication and authorization:

```typescript
// File: apps/web/app/api/admin/users/route.ts
export async function GET(request: Request) {
  try {
    // Extract and verify JWT token
    const user = await getAuthenticatedUser(request);

    // Check role permissions
    if (!user || !["super_admin"].includes(user.role)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Handle authorized request
    const users = await getAllUsers();
    return Response.json(users);
  } catch (error) {
    return new Response("Unauthorized", { status: 401 });
  }
}
```

## Security Implementation

### Token Management

Supabase handles JWT token lifecycle:

```typescript
// File: apps/web/lib/supabase/client.ts
export const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
});

// Automatic token refresh
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "TOKEN_REFRESHED") {
    // Update auth store with new session
  }
});
```

### Password Security

- Passwords hashed using Supabase's built-in bcrypt
- Minimum password requirements enforced
- Password reset flow through secure email tokens

### Session Security

```typescript
// File: apps/web/lib/supabase/middleware.ts
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerComponentClient({
    cookies: () => request.cookies,
  });

  // Verify session validity
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect unauthenticated users
  if (!session && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
```

## Authentication Utilities

### Server-Side Authentication

```typescript
// File: apps/web/lib/auth-utils.ts
export async function getAuthenticatedUser(
  request: Request,
): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.substring(7);
    const supabase = createServerComponentClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Fetch full user data from database
    const userData = await getUserByEmail(user.email!);
    return userData;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}
```

### Role Hierarchy Validation

```typescript
// File: apps/web/lib/auth-utils.ts
export function hasPermission(
  userRole: UserRole,
  requiredRoles: UserRole[],
): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    manager: 2,
    company_admin: 3,
    system_admin: 4,
    super_admin: 5,
  };

  const userLevel = roleHierarchy[userRole];
  const minRequiredLevel = Math.min(
    ...requiredRoles.map((role) => roleHierarchy[role]),
  );

  return userLevel >= minRequiredLevel;
}
```

## Error Handling

### Authentication Errors

```typescript
// Common authentication error patterns
try {
  await signIn(email, password);
} catch (error) {
  if (error.message === "Invalid login credentials") {
    setError("Email or password is incorrect");
  } else if (error.message === "Email not confirmed") {
    setError("Please check your email and verify your account");
  } else {
    setError("An error occurred during login");
  }
}
```

### Authorization Errors

```typescript
// API route error handling
if (!user) {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

if (!hasPermission(user.role, ["super_admin", "system_admin"])) {
  return new Response("Forbidden", {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
```

## Testing Authentication

### Unit Tests

```typescript
// Example test for role permissions
describe("useRoleAccess", () => {
  it("should allow super admin access to all features", () => {
    const mockUser = { role: "super_admin" };
    const { canAccessCompany } = renderHookWithUser(useRoleAccess, mockUser);

    expect(canAccessCompany()).toBe(true);
  });

  it("should deny user access to company features", () => {
    const mockUser = { role: "user" };
    const { canAccessCompany } = renderHookWithUser(useRoleAccess, mockUser);

    expect(canAccessCompany()).toBe(false);
  });
});
```

### Integration Tests

```typescript
// Example API route test
describe("/api/admin/users", () => {
  it("should return 403 for non-admin users", async () => {
    const token = await getTokenForRole("user");
    const response = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(403);
  });
});
```

## Security Best Practices

### Client-Side Security

1. **Never store sensitive data in client storage**
2. **Use HTTPS in production**
3. **Implement proper CORS policies**
4. **Validate all user inputs**
5. **Use role-based UI rendering**

### Server-Side Security

1. **Always verify tokens server-side**
2. **Implement rate limiting**
3. **Use parameterized queries**
4. **Log security events**
5. **Implement proper error handling**

### Database Security

1. **Enable Row Level Security (RLS)**
2. **Use principle of least privilege**
3. **Encrypt sensitive data**
4. **Regular security audits**
5. **Backup encryption**

## Debugging Authentication Issues

### Common Issues

1. **Token Expiration**:

   ```typescript
   // Check token validity
   const {
     data: { session },
   } = await supabase.auth.getSession();
   if (!session) {
     // Token expired, redirect to login
   }
   ```

2. **Role Synchronization**:

   ```typescript
   // Refresh user data after role changes
   await refreshUserData();
   ```

3. **Company Isolation**:
   ```typescript
   // Verify company_id in queries
   console.log("User company:", user.company_id);
   console.log("Query company:", queryCompanyId);
   ```

### Debug Tools

```typescript
// Add debug logging
const DEBUG_AUTH = process.env.NODE_ENV === "development";

if (DEBUG_AUTH) {
  console.log("Auth state:", { user, loading, error });
  console.log("Role permissions:", { canAccessCompany, isSuperAdmin });
}
```

## Related Documentation

- [`role-system.md`](./role-system.md) - Complete role hierarchy documentation
- [`database-schema.md`](./database-schema.md) - User and company schema
- [`api-endpoints.md`](./api-endpoints.md) - API authentication patterns
- [`troubleshooting.md`](./troubleshooting.md) - Common authentication issues
