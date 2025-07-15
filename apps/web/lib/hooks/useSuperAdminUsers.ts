import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useSessionAwareQuery} from './useSessionAwareQuery';
import {useAuthStore} from '@/lib/stores/auth';
import type {UserRole, UserStatus} from '@/lib/db/schema';
import {getApiPath} from '@/lib/utils';

export interface SuperAdminUser {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: UserRole;
  status: UserStatus;
  hourly_rate?: number | null;
  invited_by?: string | null;
  invited_at?: string | null;
  created_at: string;
  updated_at: string;
  companies: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

// Query keys
export const superAdminUserKeys = {
  all: ['superAdminUsers'] as const,
  list: () => [...superAdminUserKeys.all, 'list'] as const,
};

// Get all users across all companies (super admin only)
export function useSuperAdminUsers() {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: superAdminUserKeys.list(),
    queryFn: async (): Promise<SuperAdminUser[]> => {
      const response = await fetch(getApiPath('admin/users'));
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
    enabled: !!user && user.role === 'super_admin',
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Update user role, status, or hourly rate (super admin only)
export function useSuperAdminUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: {
        role?: UserRole;
        status?: UserStatus;
        hourlyRate?: number | null;
      };
    }): Promise<SuperAdminUser> => {
      const response = await fetch(getApiPath(`admin/users/${userId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the user in the list
      queryClient.setQueryData<SuperAdminUser[]>(superAdminUserKeys.list(), (old) => {
        if (!old) return old;
        return old.map((user) => (user.id === updatedUser.id ? updatedUser : user));
      });

      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({queryKey: superAdminUserKeys.list()});
    },
  });
}

// Deactivate user (super admin only)
export function useSuperAdminDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<{message: string; user: SuperAdminUser}> => {
      const response = await fetch(getApiPath(`admin/users/${userId}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate user');
      }

      return response.json();
    },
    onSuccess: (result) => {
      // Update the user in the list to show as inactive
      queryClient.setQueryData<SuperAdminUser[]>(superAdminUserKeys.list(), (old) => {
        if (!old) return old;
        return old.map((user) =>
          user.id === result.user.id ? {...user, status: 'inactive' as UserStatus} : user,
        );
      });

      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({queryKey: superAdminUserKeys.list()});
    },
  });
}
