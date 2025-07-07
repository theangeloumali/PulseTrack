import { useSessionAwareQuery } from "./useSessionAwareQuery";
import {
  getMyWeeklySummary,
  getDashboardStatistics,
  type DashboardStatistics,
} from "@/lib/db/dashboard-service";
import type { UserRole } from "@/lib/db/schema";

export function useMyWeeklySummary(userId: string) {
  return useSessionAwareQuery<any[], Error>({
    queryKey: ["my-weekly-summary", userId],
    queryFn: () => getMyWeeklySummary(userId),
    enabled: !!userId,
  });
}

export function useDashboardStatistics(
  userId: string,
  companyId: string,
  userRole: UserRole,
) {
  return useSessionAwareQuery<DashboardStatistics, Error>({
    queryKey: ["dashboard-statistics", userId, companyId, userRole],
    queryFn: () => getDashboardStatistics(userId, companyId, userRole),
    enabled: !!userId && !!companyId && !!userRole,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
