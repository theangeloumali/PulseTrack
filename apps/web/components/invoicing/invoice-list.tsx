'use client';

import {useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {format} from 'date-fns';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Send,
  type LucideIcon,
} from 'lucide-react';
import {Button} from '@workspace/ui/components/button';
import {cn} from '@workspace/ui/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import {
  clientInvoiceKeys,
  useUpdateInvoiceStatus,
  useVoidInvoice,
} from '@/lib/hooks/useClientInvoices';
import {getClientInvoiceDetail} from '@/lib/db/client-invoicing-service';
import type {ClientInvoiceWithClient} from '@/lib/db/client-invoicing-service';
import type {ClientInvoiceStatus} from '@/lib/db/schema';
import {downloadClientInvoicePdf} from './invoice-pdf';
import {toCsv, downloadCsv} from '@/lib/utils/csv-export';

interface InvoiceListProps {
  invoices: ClientInvoiceWithClient[];
  isLoading?: boolean;
  error?: unknown;
  showClientColumn?: boolean;
  /** Optional CTA wired into the empty state (e.g. open the generate-invoice modal). */
  onGenerate?: () => void;
}

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  /** Pairs a semantic color with a text label + icon so color is never the only signal. */
  className: string;
}

const STATUS_CONFIG: Record<ClientInvoiceStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    icon: FileText,
    className: 'bg-muted text-muted-foreground border-border',
  },
  sent: {
    label: 'Sent',
    icon: Send,
    className:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  },
  overdue: {
    label: 'Overdue',
    icon: AlertCircle,
    className:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  },
  void: {
    label: 'Void',
    icon: Ban,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

function InvoiceStatusPill({status}: {status: ClientInvoiceStatus}) {
  const {label, icon: Icon, className} = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        className,
      )}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

function formatMoney(
  value: string | number | null | undefined,
  currency: string | null | undefined,
): string {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: currency || 'USD'}).format(
    Number(value ?? 0),
  );
}

function formatPeriod(start?: string | null, end?: string | null): string {
  if (!start || !end) return '—';
  return `${format(new Date(start), 'MMM dd')} – ${format(new Date(end), 'MMM dd, yyyy')}`;
}

export function InvoiceList({
  invoices,
  isLoading,
  error,
  showClientColumn,
  onGenerate,
}: InvoiceListProps) {
  const queryClient = useQueryClient();
  const updateStatus = useUpdateInvoiceStatus();
  const voidInvoice = useVoidInvoice();

  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<ClientInvoiceWithClient | null>(null);

  const handlePdf = async (id: string) => {
    setPdfLoadingId(id);
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: clientInvoiceKeys.detail(id),
        queryFn: () => getClientInvoiceDetail(id),
      });
      if (detail) downloadClientInvoicePdf(detail);
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleExportCsv = () => {
    const csv = toCsv<ClientInvoiceWithClient>(invoices, [
      {key: 'invoice_number', header: 'Invoice #'},
      {key: 'client', header: 'Client', map: (invoice) => invoice.clientName ?? '—'},
      {
        key: 'period',
        header: 'Period',
        map: (invoice) => formatPeriod(invoice.period_start, invoice.period_end),
      },
      {key: 'status', header: 'Status'},
      {
        key: 'total',
        header: 'Total',
        map: (invoice) => formatMoney(invoice.total, invoice.currency),
      },
    ]);
    downloadCsv(`invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`, csv);
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    try {
      await voidInvoice.mutateAsync(voidTarget.id);
    } finally {
      setVoidTarget(null);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">Couldn&apos;t load invoices</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Something went wrong. Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading invoices…</span>
        <div className="flex justify-end">
          <div className="h-8 w-28 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          {Array.from({length: 4}).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0">
              <div className="h-4 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
              <div className="h-8 w-8 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">No invoices yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate one to start billing this client.
        </p>
        {onGenerate && (
          <Button size="sm" className="mt-4 cursor-pointer" onClick={onGenerate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Generate Invoice
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          aria-label="Export invoices as CSV"
          className="cursor-pointer">
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Invoice #
              </th>
              {showClientColumn && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Client
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Period
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {invoices.map((invoice) => {
              const isPdfLoading = pdfLoadingId === invoice.id;
              const canSend = invoice.status === 'draft';
              const canMarkPaid = invoice.status === 'sent' || invoice.status === 'overdue';
              const canVoid = invoice.status !== 'void' && invoice.status !== 'paid';
              return (
                <tr
                  key={invoice.id}
                  className="transition-colors hover:bg-muted/50 motion-reduce:transition-none">
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium tabular-nums text-foreground">
                    {invoice.invoice_number}
                  </td>
                  {showClientColumn && (
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground">
                      {invoice.clientName || '—'}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-4 text-sm tabular-nums text-muted-foreground">
                    {formatPeriod(invoice.period_start, invoice.period_end)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold tabular-nums text-foreground">
                    {formatMoney(invoice.total, invoice.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <InvoiceStatusPill status={invoice.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 cursor-pointer p-0"
                          aria-label={`Actions for invoice ${invoice.invoice_number}`}>
                          {isPdfLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canSend && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => updateStatus.mutate({id: invoice.id, status: 'sent'})}>
                            <Send className="h-4 w-4" aria-hidden="true" />
                            Mark as sent
                          </DropdownMenuItem>
                        )}
                        {canMarkPaid && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => updateStatus.mutate({id: invoice.id, status: 'paid'})}>
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Mark as paid
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => handlePdf(invoice.id)}>
                          <FileText className="h-4 w-4" aria-hidden="true" />
                          View PDF
                        </DropdownMenuItem>
                        {canVoid && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                              onClick={() => setVoidTarget(invoice)}>
                              <Ban className="h-4 w-4" aria-hidden="true" />
                              Void invoice
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!voidTarget} onOpenChange={(open) => !open && setVoidTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Void <strong>{voidTarget?.invoice_number}</strong>? A voided invoice can no longer be
              sent or paid. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              className="cursor-pointer bg-red-600 hover:bg-red-700">
              Void
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
