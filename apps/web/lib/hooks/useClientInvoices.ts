import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useSessionAwareQuery} from './useSessionAwareQuery';
import {
  listClientInvoices,
  getClientInvoiceDetail,
  generateClientInvoice,
} from '@/lib/db/client-invoicing-service';
import {
  updateClientInvoiceStatus,
  voidClientInvoice,
  listSchedules,
  createInvoiceSchedule,
} from '@/lib/db/client-invoice-mutations-service';
import type {ClientInvoiceStatus, NewClientInvoiceSchedule} from '@/lib/db/schema';
import {useAuthStore} from '@/lib/stores/auth';

export interface ClientInvoiceFilters {
  clientId?: string;
  status?: ClientInvoiceStatus;
}

// Query keys for consistency and cache invalidation
export const clientInvoiceKeys = {
  all: ['client-invoices'] as const,
  lists: () => [...clientInvoiceKeys.all, 'list'] as const,
  list: (companyId: string, filters: ClientInvoiceFilters) =>
    [...clientInvoiceKeys.lists(), companyId, filters] as const,
  details: () => [...clientInvoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientInvoiceKeys.details(), id] as const,
  schedules: (companyId: string) => [...clientInvoiceKeys.all, 'schedules', companyId] as const,
};

// Invoices for the current user's company (optionally filtered by client/status)
export function useClientInvoices(filters: ClientInvoiceFilters = {}) {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: clientInvoiceKeys.list(user?.company_id || '', filters),
    queryFn: async () => {
      if (!user?.company_id) throw new Error('No company ID available');
      return listClientInvoices(user.company_id, filters);
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Single invoice with line items, client, and billing settings (branding/PDF)
export function useClientInvoiceDetail(id: string) {
  return useSessionAwareQuery({
    queryKey: clientInvoiceKeys.detail(id),
    queryFn: () => getClientInvoiceDetail(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// Generate a draft invoice for a client over a period
export function useGenerateClientInvoice() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: (vars: {
      clientId: string;
      periodStart: string;
      periodEnd: string;
      taxRate?: number;
    }) => {
      if (!user?.company_id) {
        throw new Error('Company information not available');
      }
      return generateClientInvoice(
        user.company_id,
        vars.clientId,
        vars.periodStart,
        vars.periodEnd,
        {
          taxRate: vars.taxRate,
          createdBy: user.id ?? null,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: clientInvoiceKeys.lists()});
    },
  });
}

// Update invoice status (draft | sent | paid | overdue | void)
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, status}: {id: string; status: ClientInvoiceStatus}) =>
      updateClientInvoiceStatus(id, status),
    onSuccess: (_, {id}) => {
      queryClient.invalidateQueries({queryKey: clientInvoiceKeys.lists()});
      queryClient.invalidateQueries({queryKey: clientInvoiceKeys.detail(id)});
    },
  });
}

// Void an invoice
export function useVoidInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => voidClientInvoice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({queryKey: clientInvoiceKeys.lists()});
      queryClient.invalidateQueries({queryKey: clientInvoiceKeys.detail(id)});
    },
  });
}

// Recurring invoice schedules for the current user's company
export function useInvoiceSchedules() {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: clientInvoiceKeys.schedules(user?.company_id || ''),
    queryFn: async () => {
      if (!user?.company_id) throw new Error('No company ID available');
      return listSchedules(user.company_id);
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5,
  });
}

// Create a recurring invoice schedule
export function useCreateInvoiceSchedule() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: (data: Omit<NewClientInvoiceSchedule, 'company_id'>) => {
      if (!user?.company_id) {
        throw new Error('Company information not available');
      }
      return createInvoiceSchedule({...data, company_id: user.company_id});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: clientInvoiceKeys.schedules(user?.company_id || ''),
      });
    },
  });
}
