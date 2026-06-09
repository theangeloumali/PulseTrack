import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useSessionAwareQuery} from './useSessionAwareQuery';
import {
  getClientsWithCounts,
  getClientDetail,
  createClient,
  updateClient,
  archiveClient,
  createClientContact,
  updateClientContact,
  deleteClientContact,
} from '@/lib/db/clients-service';
import type {NewClient, NewClientContact} from '@/lib/db/schema';
import {useAuthStore} from '@/lib/stores/auth';

// Query keys for consistency and cache invalidation
export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (companyId: string) => [...clientKeys.lists(), companyId] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
};

// Clients list (with counts + owner) for the current user's company
export function useClients() {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: clientKeys.list(user?.company_id || ''),
    queryFn: async () => {
      if (!user?.company_id) throw new Error('No company ID available');
      return getClientsWithCounts(user.company_id);
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Single client with contacts + projects
export function useClientDetail(id: string) {
  return useSessionAwareQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => getClientDetail(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// Create client mutation
export function useCreateClient() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: (data: Omit<NewClient, 'company_id'>) => {
      if (!user?.company_id) {
        throw new Error('Company information not available');
      }
      return createClient({...data, company_id: user.company_id});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: clientKeys.list(user?.company_id || ''),
      });
    },
  });
}

// Update client mutation
export function useUpdateClient() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: ({id, updates}: {id: string; updates: Partial<NewClient>}) =>
      updateClient(id, updates),
    onSuccess: (_, {id}) => {
      queryClient.invalidateQueries({
        queryKey: clientKeys.list(user?.company_id || ''),
      });
      queryClient.invalidateQueries({queryKey: clientKeys.detail(id)});
    },
  });
}

// Archive client mutation
export function useArchiveClient() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: (id: string) => archiveClient(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: clientKeys.list(user?.company_id || ''),
      });
      queryClient.invalidateQueries({queryKey: clientKeys.detail(id)});
    },
  });
}

// Create client contact mutation
export function useCreateClientContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewClientContact) => createClientContact(data),
    onSuccess: (_, {client_id}) => {
      queryClient.invalidateQueries({queryKey: clientKeys.detail(client_id)});
      queryClient.invalidateQueries({queryKey: clientKeys.lists()});
    },
  });
}

// Update client contact mutation
export function useUpdateClientContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      clientId: string;
      updates: Partial<NewClientContact>;
    }) => updateClientContact(id, updates),
    onSuccess: (_, {clientId}) => {
      queryClient.invalidateQueries({queryKey: clientKeys.detail(clientId)});
    },
  });
}

// Delete client contact mutation
export function useDeleteClientContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id}: {id: string; clientId: string}) => deleteClientContact(id),
    onSuccess: (_, {clientId}) => {
      queryClient.invalidateQueries({queryKey: clientKeys.detail(clientId)});
      queryClient.invalidateQueries({queryKey: clientKeys.lists()});
    },
  });
}
