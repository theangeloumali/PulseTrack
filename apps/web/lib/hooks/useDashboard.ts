import { useQuery } from '@tanstack/react-query';
import { getMyWeeklySummary } from '@/lib/db/dashboard-service';

export function useMyWeeklySummary(userId: string) {
    return useQuery<any[], Error>({
        queryKey: ['my-weekly-summary', userId],
        queryFn: () => getMyWeeklySummary(userId),
        enabled: !!userId,
    });
}
