import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getTicketsByProject,
  getTicketsByCompany,
  getTicketById,
  createTicket,
  updateTicket,
  getRecentTicketsByProject,
  getTicketCountByProject,
  // TODO: Add deleteTicket to service
} from '@/lib/db/service';
import { NewTicket, Ticket } from '@/lib/db/schema';
import { useAuthStore } from '@/lib/stores/auth';
import { useAuth } from './useAuth';

// Query keys for tickets
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (projectId: string) => [...ticketKeys.lists(), projectId] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
};

// Tickets by project query
export function useProjectTicketsQuery(projectId: string) {
  return useQuery({
    queryKey: ticketKeys.list(projectId),
    queryFn: () => getTicketsByProject(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes (tickets change more frequently)
  });
}

// Tickets by company query (for main tickets page)
export function useCompanyTicketsQuery(companyId?: string) {
  return useQuery({
    queryKey: [...ticketKeys.all, 'company', companyId],
    queryFn: () => getTicketsByCompany(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Single ticket query
export function useTicketQuery(ticketId: string) {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: () => getTicketById(ticketId),
    enabled: !!ticketId && !!user,
    staleTime: 1000 * 60 * 2,
  });
}

// Create ticket mutation
export function useCreateTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTicket,
    onSuccess: (newTicket) => {
      // Invalidate project tickets list
      queryClient.invalidateQueries({ 
        queryKey: ticketKeys.list(newTicket.project_id) 
      });
      
      // Optimistically add to cache
      queryClient.setQueryData(
        ticketKeys.list(newTicket.project_id),
        (old: Ticket[] = []) => [newTicket, ...old]
      );
    },
  });
}

// Update ticket mutation
export function useUpdateTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewTicket> }) => 
      updateTicket(id, data),
    onSuccess: (updatedTicket: Ticket) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ 
        queryKey: ticketKeys.list(updatedTicket.project_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: ticketKeys.detail(updatedTicket.id) 
      });
      
      // Update the single ticket cache
      queryClient.setQueryData(
        ticketKeys.detail(updatedTicket.id),
        updatedTicket
      );
    },
  });
}

// Get recent tickets for project dashboard
export function useRecentProjectTicketsQuery(projectId: string, limit: number = 5) {
  return useQuery({
    queryKey: [...ticketKeys.all, 'recent', projectId, limit],
    queryFn: () => getRecentTicketsByProject(projectId, limit),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Get ticket count for project
export function useProjectTicketCountQuery(projectId: string) {
  return useQuery({
    queryKey: [...ticketKeys.all, 'count', projectId],
    queryFn: () => getTicketCountByProject(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
