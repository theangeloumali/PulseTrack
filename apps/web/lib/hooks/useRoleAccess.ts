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
  };
}
