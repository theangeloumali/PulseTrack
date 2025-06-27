import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getTicketsByProject,
  getTicketById,
  createTicket,
  // TODO: Add updateTicket, deleteTicket to service
} from '@/lib/db/service';
import { NewTicket, Ticket } from '@/lib/db/schema';
import { useAuthStore } from '@/lib/stores/auth';

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
