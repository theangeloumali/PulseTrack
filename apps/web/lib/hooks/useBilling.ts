import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompanyBillingSettings, updateCompanyBillingSettings } from '@/lib/db/billing-service';
import type { CompanyBillingSettings, NewCompanyBillingSettings } from '@/lib/db/schema';

export function useBillingSettings(companyId: string) {
    return useQuery<CompanyBillingSettings | null, Error>({
        queryKey: ['billing-settings', companyId],
        queryFn: () => getCompanyBillingSettings(companyId),
    });
}

export function useUpdateBillingSettings(companyId: string) {
    const queryClient = useQueryClient();
    return useMutation<CompanyBillingSettings, Error, Partial<NewCompanyBillingSettings>>({
        mutationFn: (updates) => updateCompanyBillingSettings(companyId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing-settings', companyId] });
        },
    });
}

export function useBillingReport(companyId: string, startDate: string, endDate: string) {
    return useQuery<any, Error>({
        queryKey: ['billing-report', companyId, startDate, endDate],
        queryFn: async () => {
            const response = await fetch(`/api/billing/report?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`);
            if (!response.ok) {
                throw new Error('Failed to fetch billing report');
            }
            return response.json();
        },
        enabled: !!companyId && !!startDate && !!endDate, // Only run if all parameters are available
    });
}
