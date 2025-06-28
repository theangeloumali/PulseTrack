import { useAuthStore } from '@/lib/stores/auth';

export type UserRole = 'admin' | 'manager' | 'user';

export function useRoleAccess() {
  const { user } = useAuthStore();

  const hasRole = (requiredRoles: UserRole | UserRole[]): boolean => {
    if (!user || !user.role) return false;
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(user.role as UserRole);
  };

  const isAdmin = (): boolean => hasRole('admin');
  const isManager = (): boolean => hasRole('manager');
  const isUser = (): boolean => hasRole('user');
  
  const canAccessCompany = (): boolean => hasRole(['admin', 'manager']);
  const canAccessDiagnostics = (): boolean => hasRole(['admin', 'manager']);
  const canManageUsers = (): boolean => hasRole(['admin', 'manager']);
  const canCreateProjects = (): boolean => hasRole(['admin', 'manager']);

  return {
    user,
    hasRole,
    isAdmin,
    isManager,
    isUser,
    canAccessCompany,
    canAccessDiagnostics,
    canManageUsers,
    canCreateProjects,
  };
}
