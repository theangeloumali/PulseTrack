# Role-Based Access Control System

This document provides comprehensive documentation for the role hierarchy and permission system implemented in the Project Management System.

## Role Hierarchy

The system implements a hierarchical role structure where higher-level roles inherit permissions from lower-level roles:

```
Super Admin (super_admin)
    ↓
System Admin (system_admin)
    ↓
Company Admin (company_admin)
    ↓
Manager (manager)
    ↓
User (user)
```

## Role Definitions

### Super Admin (`super_admin`)
**Description**: System-wide administrator with full access to all features and data across all companies.

**Permissions**:
- ✅ All system functionality
- ✅ Cross-company data access
- ✅ User management across all companies
- ✅ Company creation and management
- ✅ System diagnostics and configuration
- ✅ All lower-level role permissions

**Page Access**:
- Dashboard, Projects, Tickets, Time Tracking, Company, Billing, Settings, Diagnostics
- **Super Admin Only**: All Companies (`/admin/companies`), User Management (`/admin/users`)

### System Admin (`system_admin`)
**Description**: Technical administrator with broad system access but limited to company-level operations.

**Permissions**:
- ✅ Company-wide data access within their assigned company
- ✅ User management within their company
- ✅ System diagnostics for their company
- ✅ All manager-level permissions

**Page Access**:
- Dashboard, Projects, Tickets, Time Tracking, Company, Billing, Settings, Diagnostics
- ❌ Cannot access: All Companies, User Management (super admin only)

### Company Admin (`company_admin`)
**Description**: Administrative role for managing a specific company's operations and users.

**Permissions**:
- ✅ Company user management
- ✅ Billing and financial oversight
- ✅ Company settings configuration
- ✅ All manager-level permissions

**Page Access**:
- Dashboard, Projects, Tickets, Time Tracking, Company, Billing, Settings, Diagnostics
- ❌ Cannot access: All Companies, User Management (super admin only)

### Manager (`manager`)
**Description**: Project and team management role with operational permissions.

**Permissions**:
- ✅ Project creation and management
- ✅ User management within projects
- ✅ Team oversight and reporting
- ✅ All user-level permissions

**Page Access**:
- Dashboard, Projects, Tickets, Time Tracking, Company, Billing, Settings, Diagnostics
- ❌ Cannot access: All Companies, User Management (super admin only)

### User (`user`)
**Description**: Standard user role with basic operational access.

**Permissions**:
- ✅ View assigned projects and tickets
- ✅ Time tracking for own work
- ✅ Basic dashboard access
- ✅ Personal billing information

**Page Access**:
- Dashboard, Projects, Tickets, Time Tracking, Billing
- ❌ Cannot access: Company, Settings, Diagnostics, All Companies, User Management

## Implementation Details

### Database Schema

The role is stored in the `users` table as an enum:

```typescript
export type UserRole = 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user'

export interface User extends BaseRecord {
  email: string
  first_name?: string | null
  last_name?: string | null
  role: UserRole
  company_id: string
  // ... other fields
}
```

### Permission Checking

The `useRoleAccess` hook provides centralized permission checking:

```typescript
// File: apps/web/lib/hooks/useRoleAccess.ts
export function useRoleAccess() {
  const { user } = useAuthStore();

  // Hierarchical role checks
  const isSuperAdmin = (): boolean => hasRole('super_admin');
  const isSystemAdmin = (): boolean => hasRole(['super_admin', 'system_admin']);
  const isCompanyAdmin = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin']);
  const isManager = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']);
  const isUser = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager', 'user']);
  
  // Feature-specific permissions
  const canAccessCompany = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']);
  const canAccessDiagnostics = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']);
  const canManageUsers = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']);
  const canCreateProjects = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']);
}
```

### Navigation Access Control

The sidebar navigation is controlled by role-based visibility:

```typescript
// File: apps/web/components/sidebar-layout.tsx
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'] },
  { name: 'Projects', href: '/projects', icon: FolderOpen, roles: ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'] },
  { name: 'Tickets', href: '/tickets', icon: Ticket, roles: ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'] },
  { name: 'Time Tracking', href: '/time-tracking', icon: Clock, roles: ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'] },
  { name: 'Company', href: '/company/users', icon: Users, roles: ['super_admin', 'system_admin', 'company_admin', 'manager'] },
  { name: 'Billing', href: '/billing', icon: CreditCard, roles: ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'] },
  { name: 'All Companies', href: '/admin/companies', icon: Building2, roles: ['super_admin'] },
  { name: 'User Management', href: '/admin/users', icon: Shield, roles: ['super_admin'] },
  { name: 'Diagnostics', href: '/diagnostics', icon: Bug, roles: ['super_admin', 'system_admin', 'company_admin', 'manager'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['super_admin', 'system_admin', 'company_admin', 'manager'] },
];
```

### Page-Level Protection

Pages implement role-based redirects:

```typescript
// Example: Company users page
const { canAccessCompany } = useRoleAccess();

useEffect(() => {
  if (!canAccessCompany()) {
    router.push('/dashboard');
  }
}, [canAccessCompany, router]);
```

## Role Assignment and Management

### Initial Role Assignment

- **Super Admin**: Manually assigned during system setup
- **System Admin**: Assigned by Super Admin
- **Company Admin**: Assigned by Super Admin or System Admin
- **Manager**: Assigned by Company Admin or higher
- **User**: Default role for new invitations

### Role Change Process

1. **Permission Check**: Only users with sufficient privileges can change roles
2. **Validation**: Ensure role change maintains system integrity
3. **Update**: Role updated in database and auth store
4. **Notification**: User notified of role change (if applicable)

## Security Considerations

### Role Validation

- All role checks are performed server-side where possible
- Client-side role checks are for UI purposes only
- Database queries filter data based on user role and company affiliation

### Data Isolation

- **Company Isolation**: Users can only access data from their assigned company (except Super Admin)
- **Project Isolation**: Users can only access projects they're assigned to
- **Hierarchical Access**: Higher roles can access data from lower-level users

### Authentication Integration

The role system integrates with Supabase Auth:

```typescript
// File: apps/web/lib/stores/auth.ts
interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  company_id: string;
  // ... other fields
}
```

## Common Usage Patterns

### Conditional Rendering

```typescript
const { isSuperAdmin, canAccessCompany } = useRoleAccess();

return (
  <div>
    {canAccessCompany() && <CompanySettings />}
    {isSuperAdmin() && <SuperAdminPanel />}
  </div>
);
```

### API Route Protection

```typescript
// Example API route protection
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  
  if (!user || !['super_admin', 'system_admin'].includes(user.role)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Handle request
}
```

### Bulk Permission Checks

```typescript
const { hasRole } = useRoleAccess();

const adminRoles = ['super_admin', 'system_admin', 'company_admin'];
const isAdmin = hasRole(adminRoles);
```

## Troubleshooting

### Common Issues

1. **Role Not Recognized**: Check if role exists in UserRole type definition
2. **Permission Denied**: Verify user has correct role in database
3. **Navigation Not Showing**: Check navigation array role requirements
4. **Page Access Blocked**: Verify useRoleAccess implementation in page component

### Debugging Role Issues

```typescript
// Add debugging to role checks
const { user, hasRole } = useRoleAccess();
console.log('Current user role:', user?.role);
console.log('Can access company:', hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']));
```

## Future Enhancements

### Planned Features

1. **Granular Permissions**: More specific permissions beyond role hierarchy
2. **Role Templates**: Predefined permission sets for common use cases
3. **Audit Trail**: Track role changes and permission usage
4. **Temporary Roles**: Time-limited role assignments

### Migration Considerations

When updating the role system:

1. Update database schema and migrations
2. Update TypeScript type definitions
3. Update useRoleAccess hook
4. Test all protected routes and components
5. Update navigation configuration
6. Run full permission testing suite

## Related Documentation

- [`authentication.md`](./authentication.md) - Authentication system details
- [`database-schema.md`](./database-schema.md) - Database structure
- [`api-endpoints.md`](./api-endpoints.md) - API security and role checks
- [`CLAUDE.md`](../CLAUDE.md) - Development workflow and setup