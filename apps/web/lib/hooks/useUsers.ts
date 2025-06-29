import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { 
  getUsersInCompany,
  getCompanyUsers, 
  updateUserRole, 
  updateUserStatus, 
  updateUserHourlyRate,
  removeUserFromCompany,
  inviteUserToCompany,
  getAssignableUsers
} from '@/lib/db/service'
import { useAuthStore } from '@/lib/stores/auth'
import { useCompanyStore } from '@/lib/stores/company'

// Query keys
export const userKeys = {
  all: ['users'] as const,
  byCompany: (companyId: string) => [...userKeys.all, 'company', companyId] as const,
  companyUsers: (companyId: string) => [...userKeys.all, 'company-users', companyId] as const,
  assignableUsers: (companyId: string) => [...userKeys.all, 'assignable', companyId] as const,
}

// Get users in the current user's company (for assignment)
export function useUsersInCompany() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: userKeys.byCompany(user?.company_id || ''),
    queryFn: () => getUsersInCompany(user?.company_id || ''),
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 10, // 10 minutes (users don't change often)
  })
}

/**
 * Hook to fetch company users with full details for management
 */
export function useCompanyUsers() {
  const { user } = useAuthStore();
  const { setUsers, setUsersLoading, setUsersError } = useCompanyStore();

  const query = useQuery({
    queryKey: userKeys.companyUsers(user?.company_id || ''),
    queryFn: async () => {
      if (!user?.company_id) throw new Error('No company ID available');
      return getCompanyUsers(user.company_id);
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
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
  const { user } = useAuthStore();

  return useQuery({
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
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'manager' | 'user' }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      // Invalidate and refetch company users
      queryClient.invalidateQueries({ queryKey: userKeys.companyUsers(user?.company_id || '') });
      queryClient.invalidateQueries({ queryKey: userKeys.assignableUsers(user?.company_id || '') });
      queryClient.invalidateQueries({ queryKey: userKeys.byCompany(user?.company_id || '') });
    },
  });
}

/**
 * Hook to update user status
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) =>
      updateUserStatus(userId, status),
    onSuccess: () => {
      // Invalidate and refetch company users
      queryClient.invalidateQueries({ queryKey: userKeys.companyUsers(user?.company_id || '') });
      queryClient.invalidateQueries({ queryKey: userKeys.assignableUsers(user?.company_id || '') });
      queryClient.invalidateQueries({ queryKey: userKeys.byCompany(user?.company_id || '') });
    },
  });
}

/**
 * Hook to update user hourly rate
 */
export function useUpdateUserHourlyRate() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ userId, hourlyRate }: { userId: string; hourlyRate: number | null }) =>
      updateUserHourlyRate(userId, hourlyRate),
    onSuccess: () => {
      // Invalidate and refetch company users
      queryClient.invalidateQueries({ queryKey: userKeys.companyUsers(user?.company_id || '') });
      
      // Invalidate billing reports since hourly rates affect billing calculations
      queryClient.invalidateQueries({ queryKey: ['billing-report'] });
    },
  });
}

/**
 * Hook to remove user from company
 */
export function useRemoveUser() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (userId: string) => removeUserFromCompany(userId),
    onSuccess: () => {
      // Invalidate and refetch company users
      queryClient.invalidateQueries({ queryKey: userKeys.companyUsers(user?.company_id || '') });
      queryClient.invalidateQueries({ queryKey: userKeys.assignableUsers(user?.company_id || '') });
      queryClient.invalidateQueries({ queryKey: userKeys.byCompany(user?.company_id || '') });
    },
  });
}

/**
 * Hook to invite user to company
 */
export function useInviteUser() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (data: {
      email: string;
      role: 'admin' | 'manager' | 'user';
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
      queryClient.invalidateQueries({ queryKey: userKeys.companyUsers(user?.company_id || '') });
    },
  });
}
