import {useSessionAwareQuery} from './useSessionAwareQuery';
import {getClientHeatmap, getClientWorkBreakdown} from '@/lib/db/client-heatmap-service';
import {useAuthStore} from '@/lib/stores/auth';

// Query keys for consistency and cache invalidation (mirrors clientKeys)
export const clientHeatmapKeys = {
  all: ['client-heatmap'] as const,
  lists: () => [...clientHeatmapKeys.all, 'list'] as const,
  list: (companyId: string) => [...clientHeatmapKeys.lists(), companyId] as const,
  breakdowns: () => [...clientHeatmapKeys.all, 'breakdown'] as const,
  breakdown: (clientId: string) => [...clientHeatmapKeys.breakdowns(), clientId] as const,
};

// Ranked client heat scores for the current user's company
export function useClientHeatmap() {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: clientHeatmapKeys.list(user?.company_id || ''),
    queryFn: async () => {
      if (!user?.company_id) throw new Error('No company ID available');
      return getClientHeatmap(user.company_id);
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Open work split (to-do / to-deliver) + coverage gaps for a single client
export function useClientWorkBreakdown(clientId: string) {
  return useSessionAwareQuery({
    queryKey: clientHeatmapKeys.breakdown(clientId),
    queryFn: () => getClientWorkBreakdown(clientId),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 2,
  });
}
