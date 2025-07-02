import { useSessionAwareQuery } from './useSessionAwareQuery';
import { getMyWeeklySummary } from '@/lib/db/dashboard-service';

export function useMyWeeklySummary(userId: string) {
    return useSessionAwareQuery<any[], Error>({
        queryKey: ['my-weekly-summary', userId],
        queryFn: () => getMyWeeklySummary(userId),
        enabled: !!userId,
    });
}
