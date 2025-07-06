import { useAuthStore } from '@/lib/stores/auth';
import { UserRole } from '@/lib/db/schema';

export function useRoleAccess() {
  const { user } = useAuthStore();

  const hasRole = (requiredRoles: UserRole | UserRole[]): boolean => {
    if (!user || !user.role) return false;
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(user.role as UserRole);
  };

  // Role hierarchy checks - super_admin has access to everything
  const isSuperAdmin = (): boolean => hasRole('super_admin');
  const isSystemAdmin = (): boolean => hasRole(['super_admin', 'system_admin']);
  const isCompanyAdmin = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin']);
  const isManager = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']);
  const isUser = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager', 'user']);
  
  const canAccessCompany = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']);
  const canAccessDiagnostics = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']);
  const canManageUsers = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']);
  const canCreateProjects = (): boolean => hasRole(['super_admin', 'system_admin', 'company_admin', 'manager']);

  // Time entry deletion permission checker
  const canDeleteTimeEntry = (timeEntry: {
    user_id: string;
    isPaidPeriod?: boolean;
    userCompanyId?: string;
  }): { canDelete: boolean; reason?: string } => {
    if (!user || !user.role) {
      return { canDelete: false, reason: 'User not authenticated' };
    }

    const isSuperAdmin = user.role === 'super_admin';
    const isSystemAdmin = user.role === 'system_admin';
    const isCompanyAdmin = user.role === 'company_admin';
    const isManager = user.role === 'manager';
    const isOwner = timeEntry.user_id === user.id;

    // Super admins can delete anything
    if (isSuperAdmin) {
      return { canDelete: true };
    }

    // For paid periods, only super admins can delete
    if (timeEntry.isPaidPeriod) {
      return { 
        canDelete: false, 
        reason: 'Only super administrators can delete time entries from paid billing periods'
      };
    }

    // System/Company admins and managers can delete within their company
    if (isSystemAdmin || isCompanyAdmin || isManager) {
      // Check company match if provided
      if (timeEntry.userCompanyId && timeEntry.userCompanyId !== user.company_id) {
        return { 
          canDelete: false, 
          reason: 'You can only delete time entries from your company'
        };
      }
      return { canDelete: true };
    }

    // Regular users can only delete their own time entries (if not billed)
    if (isOwner) {
      return { canDelete: true };
    }

    return { 
      canDelete: false, 
      reason: 'You do not have permission to delete this time entry'
    };
  };

  return {
    user,
    hasRole,
    isSuperAdmin,
    isSystemAdmin,
    isCompanyAdmin,
    isManager,
    isUser,
    canAccessCompany,
    canAccessDiagnostics,
    canManageUsers,
    canCreateProjects,
    canDeleteTimeEntry,
  };
}
