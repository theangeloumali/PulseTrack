import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionAwareQuery } from './useSessionAwareQuery';
import {
  getCompanyBillingSettings,
  updateCompanyBillingSettings,
  createCompanyBillingSettings,
  getBillingRatesByCompany,
  createBillingRate,
  updateBillingRate,
  deleteBillingRate
} from '@/lib/db/billing-service';
import type { CompanyBillingSettings, NewCompanyBillingSettings, BillingRate, NewBillingRate } from '@/lib/db/schema';
import { getApiPath } from '@/lib/utils';

export function useBillingSettings(companyId: string) {
    return useSessionAwareQuery<CompanyBillingSettings | null, Error>({
        queryKey: ['billing-settings', companyId],
        queryFn: () => getCompanyBillingSettings(companyId),
        enabled: !!companyId, // Only run if companyId is available
    });
}

export function useUpdateBillingSettings(companyId: string) {
    const queryClient = useQueryClient();
    return useMutation<CompanyBillingSettings, Error, Partial<NewCompanyBillingSettings>>({
        mutationFn: async (updates) => {
            let result = await updateCompanyBillingSettings(companyId, updates);
            if (!result) {
                // If update returns null, it means no record existed, so create it
                result = await createCompanyBillingSettings({ ...updates, company_id: companyId });
            }
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing-settings', companyId] });
        },
    });
}

export function useBillingReport(companyId: string, startDate: string, endDate: string, targetUserId?: string) {
    return useSessionAwareQuery<any, Error>({
        queryKey: ['billing-report', companyId, startDate, endDate, targetUserId],
        queryFn: async () => {
            let apiPath = getApiPath(`billing/report?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`);
            if (targetUserId) {
                apiPath += `&targetUserId=${targetUserId}`;
            }
            
            const response = await fetch(apiPath);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch billing report: ${response.status} ${errorText}`);
            }
            
            return response.json();
        },
        enabled: !!companyId && !!startDate && !!endDate,
    });
}

export function useBillingRates(companyId: string) {
    return useSessionAwareQuery<BillingRate[], Error>({
        queryKey: ['billing-rates', companyId],
        queryFn: () => getBillingRatesByCompany(companyId),
        enabled: !!companyId,
    });
}

export function useCreateBillingRate(companyId: string) {
    const queryClient = useQueryClient();
    return useMutation<BillingRate, Error, NewBillingRate>({
        mutationFn: (newRate) => createBillingRate(newRate),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing-rates', companyId] });
        },
    });
}

export function useDeleteBillingRate(companyId: string) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (id: string) => deleteBillingRate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing-rates', companyId] });
        },
    });
}
