import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useToast} from '@workspace/ui/hooks/use-toast';

interface UserActionParams {
  userId: string;
}

export function useArchiveUser() {
  const queryClient = useQueryClient();
  const {toast} = useToast();

  return useMutation({
    mutationFn: async ({userId}: UserActionParams) => {
      const response = await fetch(`/api/admin/users/${userId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive user');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'User Archived',
        description: data.message || 'User has been archived successfully.',
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({queryKey: ['company-users']});
      queryClient.invalidateQueries({queryKey: ['users']});
      queryClient.invalidateQueries({queryKey: ['super-admin-companies']});
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive user',
        variant: 'destructive',
      });
    },
  });
}

export function useRestoreUser() {
  const queryClient = useQueryClient();
  const {toast} = useToast();

  return useMutation({
    mutationFn: async ({userId}: UserActionParams) => {
      const response = await fetch(`/api/admin/users/${userId}/archive`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restore user');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'User Restored',
        description: data.message || 'User has been restored successfully.',
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({queryKey: ['company-users']});
      queryClient.invalidateQueries({queryKey: ['users']});
      queryClient.invalidateQueries({queryKey: ['super-admin-companies']});
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore user',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const {toast} = useToast();

  return useMutation({
    mutationFn: async ({userId}: UserActionParams) => {
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'User Deleted',
        description: data.message || 'User has been marked for deletion.',
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({queryKey: ['company-users']});
      queryClient.invalidateQueries({queryKey: ['users']});
      queryClient.invalidateQueries({queryKey: ['super-admin-companies']});
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });
}
