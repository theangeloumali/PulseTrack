import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionAwareQuery } from './useSessionAwareQuery';
import {
	getTicketsByProject,
	getTicketsByProjectWithCompanyAccess,
	getTicketsByCompany,
	getAccessibleTicketsByCompany,
	getTicketById,
	getTicketByIdWithCompanyAccess,
	createTicket,
	updateTicket,
	deleteTicket,
	updateTicketSortOrders,
	getRecentTicketsByProject,
	getRecentTicketsByProjectWithCompanyAccess,
	getTicketCountByProject,
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
	const { user } = useAuthStore();

	return useSessionAwareQuery({
		queryKey: ticketKeys.list(projectId),
		queryFn: () => {
			if (!user?.company_id) {
				throw new Error('User company information not available');
			}
			return getTicketsByProjectWithCompanyAccess(projectId, user.company_id);
		},
		enabled: !!projectId && !!user?.company_id,
		staleTime: 1000 * 60 * 2, // 2 minutes (tickets change more frequently)
	});
}

// Tickets by company query with access control (for main tickets page)
export function useCompanyTicketsQuery(companyId?: string) {
	const { user } = useAuthStore();

	return useSessionAwareQuery({
		queryKey: [...ticketKeys.all, 'company', companyId, user?.id, user?.role],
		queryFn: () => {
			if (!companyId || !user?.id || !user?.role) {
				throw new Error('User or company information not available');
			}
			return getAccessibleTicketsByCompany(companyId, user.id, user.role);
		},
		enabled: !!companyId && !!user?.id && !!user?.role,
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

// Admin-only hook to get all company tickets (unrestricted)
export function useAllCompanyTicketsQuery(companyId?: string) {
	const { user } = useAuthStore();

	return useSessionAwareQuery({
		queryKey: [...ticketKeys.all, 'allCompanyTickets', companyId],
		queryFn: () => getTicketsByCompany(companyId!),
		enabled: !!companyId && !!user?.role && ['super_admin', 'system_admin', 'company_admin'].includes(user.role),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

// Single ticket query
export function useTicketQuery(ticketId: string) {
	const { user } = useAuthStore();

	return useSessionAwareQuery({
		queryKey: ticketKeys.detail(ticketId),
		queryFn: () => {
			if (!user?.company_id) {
				throw new Error('User company information not available');
			}
			return getTicketByIdWithCompanyAccess(ticketId, user.company_id);
		},
		enabled: !!ticketId && !!user?.company_id,
		staleTime: 1000 * 60 * 2,
	});
}

// Create ticket mutation
export function useCreateTicketMutation() {
	const queryClient = useQueryClient();
	const { user } = useAuthStore();

	return useMutation({
		mutationFn: createTicket,
		onSuccess: (newTicket) => {
			// Invalidate all ticket-related queries
			queryClient.invalidateQueries({
				queryKey: ticketKeys.list(newTicket.project_id),
			});

			// Invalidate company tickets query
			queryClient.invalidateQueries({
				queryKey: [...ticketKeys.all, 'company'],
			});

			// Invalidate project ticket count query
			queryClient.invalidateQueries({
				queryKey: [...ticketKeys.all, 'count', newTicket.project_id],
			});

			// Invalidate recent tickets query
			queryClient.invalidateQueries({
				queryKey: [...ticketKeys.all, 'recent', newTicket.project_id],
			});

			// Invalidate projects with ticket counts (used in projects page)
			queryClient.invalidateQueries({
				queryKey: ['projects', 'withTicketCounts'],
			});

			// Optimistically add to cache
			queryClient.setQueryData(ticketKeys.list(newTicket.project_id), (old: Ticket[] = []) => [newTicket, ...old]);
		},
	});
}

// Update ticket mutation
export function useUpdateTicket() {
	const queryClient = useQueryClient();
	const { user } = useAuth();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<NewTicket> }) => updateTicket(id, data),
		onSuccess: (updatedTicket: Ticket) => {
			// Invalidate all ticket-related queries
			queryClient.invalidateQueries({
				queryKey: ticketKeys.list(updatedTicket.project_id),
			});
			queryClient.invalidateQueries({
				queryKey: ticketKeys.detail(updatedTicket.id),
			});

			// Invalidate company tickets query
			queryClient.invalidateQueries({
				queryKey: [...ticketKeys.all, 'company'],
			});

			// Invalidate project ticket count query
			queryClient.invalidateQueries({
				queryKey: [...ticketKeys.all, 'count', updatedTicket.project_id],
			});

			// Invalidate recent tickets query
			queryClient.invalidateQueries({
				queryKey: [...ticketKeys.all, 'recent', updatedTicket.project_id],
			});

			// Invalidate projects with ticket counts
			queryClient.invalidateQueries({
				queryKey: ['projects', 'withTicketCounts'],
			});

			// Update the single ticket cache
			queryClient.setQueryData(ticketKeys.detail(updatedTicket.id), updatedTicket);
		},
	});
}

/**
 * Hook to update ticket sort orders for drag-and-drop
 */
export function useUpdateTicketSortOrders() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateTicketSortOrders,
		onSuccess: () => {
			// Don't invalidate immediately - let optimistic updates persist
			// Only invalidate on component unmount or explicit refresh
			console.log('✅ Sort order update successful - keeping optimistic state');
		},
		onError: (error) => {
			console.log('❌ Sort order update failed - invalidating cache:', error);
			// Only invalidate on error to revert to server state
			queryClient.invalidateQueries({ queryKey: ticketKeys.all });
		},
	});
}

// Get recent tickets for project dashboard
export function useRecentProjectTicketsQuery(projectId: string, limit: number = 5) {
	const { user } = useAuthStore();

	return useSessionAwareQuery({
		queryKey: [...ticketKeys.all, 'recent', projectId, limit],
		queryFn: () => {
			if (!user?.company_id) {
				throw new Error('User company information not available');
			}
			return getRecentTicketsByProjectWithCompanyAccess(projectId, user.company_id, limit);
		},
		enabled: !!projectId && !!user?.company_id,
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

// Get ticket count for project
export function useProjectTicketCountQuery(projectId: string) {
	return useSessionAwareQuery({
		queryKey: [...ticketKeys.all, 'count', projectId],
		queryFn: () => getTicketCountByProject(projectId),
		enabled: !!projectId,
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

// Delete ticket mutation
export function useDeleteTicketMutation() {
	const queryClient = useQueryClient();
	const { user } = useAuthStore();

	return useMutation({
		mutationFn: deleteTicket,
		onSuccess: (_, deletedTicketId) => {
			// Invalidate all ticket-related queries
			queryClient.invalidateQueries({
				queryKey: ticketKeys.all,
			});

			// Invalidate company tickets query
			queryClient.invalidateQueries({
				queryKey: [...ticketKeys.all, 'company'],
			});

			// Invalidate projects with ticket counts
			queryClient.invalidateQueries({
				queryKey: ['projects', 'withTicketCounts'],
			});

			// Remove from cache optimistically
			queryClient.removeQueries({
				queryKey: ticketKeys.detail(deletedTicketId),
			});
		},
	});
}
