import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useSessionAwareQuery} from './useSessionAwareQuery';
import {useEffect} from 'react';
import {useAuth} from './useAuth';
import {
  getUsersInCompany,
  getCompanyUsers,
  updateUserRole,
  updateUserStatus,
  updateUserHourlyRate,
  removeUserFromCompany,
  inviteUserToCompany,
  getAssignableUsers,
} from '@/lib/db/service';
import {canElevateRole} from '@/lib/auth-utils';
import type {UserRole} from '@/lib/db/schema';
import {useAuthStore} from '@/lib/stores/auth';
import {useCompanyStore} from '@/lib/stores/company';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  byCompany: (companyId: string) => [...userKeys.all, 'company', companyId] as const,
  companyUsers: (companyId: string) => [...userKeys.all, 'company-users', companyId] as const,
  assignableUsers: (companyId: string) => [...userKeys.all, 'assignable', companyId] as const,
};

// Get users in the current user's company (for assignment)
export function useUsersInCompany() {
  const {user} = useAuth();

  return useSessionAwareQuery({
    queryKey: userKeys.byCompany(user?.company_id || ''),
    queryFn: () => getUsersInCompany(user?.company_id || ''),
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 10, // 10 minutes (users don't change often)
  });
}

/**
 * Hook to fetch company users with full details for management
 */
export function useCompanyUsers() {
  const {user} = useAuthStore();
  const {setUsers, setUsersLoading, setUsersError} = useCompanyStore();

  const query = useSessionAwareQuery({
    queryKey: userKeys.companyUsers(user?.company_id || ''),
    queryFn: async () => {
      if (!user?.company_id) throw new Error('No company ID available');
      return getCompanyUsers(user.company_id);
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Handle state updates in useEffect-like pattern
  useEffect(() => {
    if (query.data) {
      setUsers(query.data as any); // Type assertion needed due to complex type matching
      setUsersLoading(false);
      setUsersError(null);
    } else if (query.error) {
      setUsersError(query.error instanceof Error ? query.error.message : 'Failed to load users');
      setUsersLoading(false);
    } else if (query.isLoading) {
      setUsersLoading(true);
    }
  }, [query.data, query.error, query.isLoading, setUsers, setUsersLoading, setUsersError]);

  return query;
}

/**
 * Hook to fetch assignable users (active users only)
 */
export function useAssignableUsers() {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: userKeys.assignableUsers(user?.company_id || ''),
    queryFn: async () => {
      if (!user?.company_id) throw new Error('No company ID available');
      return getAssignableUsers(user.company_id);
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to update user role
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user';
    }) => updateUserRole(userId, role),
    onSuccess: () => {
      // Invalidate and refetch company users
      queryClient.invalidateQueries({
        queryKey: userKeys.companyUsers(user?.company_id || ''),
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.assignableUsers(user?.company_id || ''),
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.byCompany(user?.company_id || ''),
      });
    },
  });
}

/**
 * Hook to update user status
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: ({userId, status}: {userId: string; status: 'active' | 'inactive'}) =>
      updateUserStatus(userId, status),
    onSuccess: () => {
      // Invalidate and refetch company users
      queryClient.invalidateQueries({
        queryKey: userKeys.companyUsers(user?.company_id || ''),
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.assignableUsers(user?.company_id || ''),
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.byCompany(user?.company_id || ''),
      });
    },
  });
}

/**
 * Hook to update user hourly rate
 */
export function useUpdateUserHourlyRate() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: ({userId, hourlyRate}: {userId: string; hourlyRate: number | null}) =>
      updateUserHourlyRate(userId, hourlyRate),
    onSuccess: () => {
      // Invalidate and refetch company users
      queryClient.invalidateQueries({
        queryKey: userKeys.companyUsers(user?.company_id || ''),
      });

      // Invalidate billing reports since hourly rates affect billing calculations
      queryClient.invalidateQueries({queryKey: ['billing-report']});
    },
  });
}

/**
 * Hook to remove user from company
 */
export function useRemoveUser() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: (userId: string) => removeUserFromCompany(userId),
    onSuccess: () => {
      // Invalidate and refetch company users
      queryClient.invalidateQueries({
        queryKey: userKeys.companyUsers(user?.company_id || ''),
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.assignableUsers(user?.company_id || ''),
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.byCompany(user?.company_id || ''),
      });
    },
  });
}

/**
 * Hook to invite user to company
 */
export function useInviteUser() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: (data: {
      email: string;
      role: 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user';
      firstName?: string;
      lastName?: string;
      hourlyRate?: number;
    }) => {
      if (!user?.company_id || !user?.id) {
        throw new Error('User or company information not available');
      }

      return inviteUserToCompany({
        ...data,
        companyId: user.company_id,
        invitedBy: user.id,
      });
    },
    onSuccess: () => {
      // Invalidate and refetch company users
      queryClient.invalidateQueries({
        queryKey: userKeys.companyUsers(user?.company_id || ''),
      });
    },
  });
}

/**
 * Hook to elevate user role with permission checks
 */
export function useElevateUserRole() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: ({userId, newRole}: {userId: string; newRole: UserRole}) => {
      if (!user?.role) {
        throw new Error('Current user role not available');
      }

      if (!canElevateRole(user.role as UserRole, newRole)) {
        throw new Error(`You don't have permission to elevate users to ${newRole} role`);
      }

      return updateUserRole(userId, newRole);
    },
    onSuccess: () => {
      // Invalidate and refetch company users
      queryClient.invalidateQueries({
        queryKey: userKeys.companyUsers(user?.company_id || ''),
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.assignableUsers(user?.company_id || ''),
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.byCompany(user?.company_id || ''),
      });
    },
  });
}

/**
 * Hook to check if current user can elevate another user to a specific role
 */
export function useCanElevateRole() {
  const {user} = useAuthStore();

  return (targetRole: UserRole): boolean => {
    if (!user?.role) return false;
    return canElevateRole(user.role as UserRole, targetRole);
  };
}

/**
 * Hook to get available roles that the current user can assign
 */
export function useAvailableRoles() {
  const {user} = useAuthStore();

  const allRoles: UserRole[] = ['super_admin', 'system_admin', 'company_admin', 'manager', 'user'];

  return allRoles.filter((role) => {
    if (!user?.role) return false;
    return canElevateRole(user.role as UserRole, role);
  });
}
