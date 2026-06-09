import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useToast} from '@workspace/ui/hooks/use-toast';

interface CompanyActionParams {
  companyId: string;
}

export function useArchiveCompany() {
  const queryClient = useQueryClient();
  const {toast} = useToast();

  return useMutation({
    mutationFn: async ({companyId}: CompanyActionParams) => {
      const response = await fetch(`/api/admin/companies/${companyId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive company');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Company Archived',
        description: data.message || 'Company and all its users have been archived successfully.',
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({queryKey: ['super-admin-companies']});
      queryClient.invalidateQueries({queryKey: ['companies']});
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive company',
        variant: 'destructive',
      });
    },
  });
}

export function useRestoreCompany() {
  const queryClient = useQueryClient();
  const {toast} = useToast();

  return useMutation({
    mutationFn: async ({companyId}: CompanyActionParams) => {
      const response = await fetch(`/api/admin/companies/${companyId}/archive`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restore company');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Company Restored',
        description: data.message || 'Company and all its users have been restored successfully.',
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({queryKey: ['super-admin-companies']});
      queryClient.invalidateQueries({queryKey: ['companies']});
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore company',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  const {toast} = useToast();

  return useMutation({
    mutationFn: async ({companyId}: CompanyActionParams) => {
      const response = await fetch(`/api/admin/companies/${companyId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete company');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Company Deleted',
        description: data.message || 'Company and all its data have been marked for deletion.',
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({queryKey: ['super-admin-companies']});
      queryClient.invalidateQueries({queryKey: ['companies']});
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete company',
        variant: 'destructive',
      });
    },
  });
}
