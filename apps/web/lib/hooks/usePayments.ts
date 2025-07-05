import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiPath } from '@/lib/utils';
import type { PaymentStatus, BillingFrequency } from '@/lib/db/schema';

// Query keys
export const paymentKeys = {
  all: ['payments'] as const,
  outstanding: (companyId: string) => [...paymentKeys.all, 'outstanding', companyId] as const,
  overdue: (companyId: string) => [...paymentKeys.all, 'overdue', companyId] as const,
  stats: (companyId: string, year?: number) => [...paymentKeys.all, 'stats', companyId, year] as const,
  history: (billingPeriodId: string) => [...paymentKeys.all, 'history', billingPeriodId] as const,
  periods: (companyId: string) => [...paymentKeys.all, 'periods', companyId] as const,
};

// Payment status queries
export function useOutstandingPayments(companyId: string) {
  return useQuery({
    queryKey: paymentKeys.outstanding(companyId),
    queryFn: async () => {
      const response = await fetch(getApiPath('billing/payment-status?action=outstanding'));
      if (!response.ok) {
        throw new Error('Failed to fetch outstanding payments');
      }
      return response.json();
    },
    enabled: !!companyId,
  });
}

export function useOverduePayments(companyId: string) {
  return useQuery({
    queryKey: paymentKeys.overdue(companyId),
    queryFn: async () => {
      const response = await fetch(getApiPath('billing/payment-status?action=overdue'));
      if (!response.ok) {
        throw new Error('Failed to fetch overdue payments');
      }
      return response.json();
    },
    enabled: !!companyId,
  });
}

export function usePaymentStats(companyId: string, year?: number) {
  return useQuery({
    queryKey: paymentKeys.stats(companyId, year),
    queryFn: async () => {
      const url = year 
        ? getApiPath(`billing/payment-status?action=stats&year=${year}`)
        : getApiPath('billing/payment-status?action=stats');
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch payment stats');
      }
      return response.json();
    },
    enabled: !!companyId,
  });
}

export function usePaymentHistory(billingPeriodId: string) {
  return useQuery({
    queryKey: paymentKeys.history(billingPeriodId),
    queryFn: async () => {
      const response = await fetch(
        getApiPath(`billing/payment-history?billing_period_id=${billingPeriodId}`)
      );
      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }
      return response.json();
    },
    enabled: !!billingPeriodId,
  });
}

export function useBillingPeriods(companyId: string) {
  return useQuery({
    queryKey: paymentKeys.periods(companyId),
    queryFn: async () => {
      const response = await fetch(getApiPath('billing/periods'));
      if (!response.ok) {
        throw new Error('Failed to fetch billing periods');
      }
      return response.json();
    },
    enabled: !!companyId,
  });
}

// Payment status mutations
export function useUpdatePaymentStatus(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      billing_period_id,
      payment_status,
      ...additionalData
    }: {
      billing_period_id: string;
      payment_status: PaymentStatus;
      payment_amount?: number;
      payment_reference?: string;
      payment_due_date?: string;
      invoice_sent_date?: string;
      notes?: string;
    }) => {
      const response = await fetch(getApiPath('billing/payment-status'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billing_period_id,
          payment_status,
          action: 'update_status',
          ...additionalData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: paymentKeys.outstanding(companyId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.overdue(companyId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.stats(companyId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.periods(companyId) });
    },
  });
}

export function useMarkInvoiceSent(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      billing_period_id,
      due_date,
    }: {
      billing_period_id: string;
      due_date?: string;
    }) => {
      const response = await fetch(getApiPath('billing/payment-status'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billing_period_id,
          action: 'mark_sent',
          due_date,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark invoice as sent');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.outstanding(companyId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.overdue(companyId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.stats(companyId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.periods(companyId) });
    },
  });
}

export function useMarkPaymentReceived(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      billing_period_id,
      amount,
      reference,
    }: {
      billing_period_id: string;
      amount?: number;
      reference?: string;
    }) => {
      const response = await fetch(getApiPath('billing/payment-status'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billing_period_id,
          action: 'mark_paid',
          amount,
          reference,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark payment as received');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.outstanding(companyId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.overdue(companyId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.stats(companyId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.periods(companyId) });
    },
  });
}

export function useGenerateBillingPeriod(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      frequency,
      start_date,
    }: {
      frequency: BillingFrequency;
      start_date?: string;
    }) => {
      const response = await fetch(getApiPath('billing/periods'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          frequency,
          start_date,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate billing period');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.periods(companyId) });
    },
  });
}

export function useGenerateNextBillingPeriod(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ current_period_id }: { current_period_id: string }) => {
      const response = await fetch(getApiPath('billing/periods'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_next',
          current_period_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate next billing period');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.periods(companyId) });
    },
  });
}

export function useCreatePaymentHistoryEntry(billingPeriodId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      old_value,
      new_value,
      notes,
    }: {
      action: string;
      old_value?: string;
      new_value?: string;
      notes?: string;
    }) => {
      const response = await fetch(getApiPath('billing/payment-history'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billing_period_id: billingPeriodId,
          action,
          old_value,
          new_value,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment history entry');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.history(billingPeriodId) });
    },
  });
}