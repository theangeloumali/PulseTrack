'use client';

import {useState} from 'react';
import {endOfMonth, format, startOfMonth, subMonths} from 'date-fns';
import {FileText, Loader2} from 'lucide-react';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {Modal} from '@/components/ui/modal';
import {useGenerateClientInvoice} from '@/lib/hooks/useClientInvoices';
import type {ClientInvoiceWithLineItems} from '@/lib/db/schema';

const DATE_FMT = 'yyyy-MM-dd';

interface InvoiceGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

export function InvoiceGenerateModal({
  isOpen,
  onClose,
  clientId,
  clientName,
}: InvoiceGenerateModalProps) {
  const lastMonth = subMonths(new Date(), 1);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(lastMonth), DATE_FMT));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(lastMonth), DATE_FMT));
  const [taxRate, setTaxRate] = useState('0');
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<ClientInvoiceWithLineItems | null>(null);

  const generate = useGenerateClientInvoice();
  const currency = generated?.currency || 'USD';

  const money = (value: string | number | null | undefined): string =>
    new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(Number(value ?? 0));

  const reset = () => {
    setGenerated(null);
    setError('');
  };

  const handleClose = () => {
    if (generate.isPending) return;
    reset();
    onClose();
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!periodStart || !periodEnd) {
      setError('Select a billing period.');
      return;
    }
    if (periodEnd < periodStart) {
      setError('Period end must be on or after period start.');
      return;
    }

    try {
      const invoice = await generate.mutateAsync({
        clientId,
        periodStart,
        periodEnd,
        taxRate: Number(taxRate) || 0,
      });
      setGenerated(invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Invoice"
      description={`Create a draft invoice for ${clientName}.`}
      size="lg">
      {generated ? (
        <div className="space-y-4">
          <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-300">
            Draft <strong>{generated.invoice_number}</strong> created. Review it below — you can
            send it or download the PDF from the invoice list.
          </div>

          {generated.line_items.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No billable time was found for this period. The draft was created with a zero total.
            </div>
          ) : (
            <div className="border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                <span>Description</span>
                <span className="text-right">Hours</span>
                <span className="text-right">Amount</span>
              </div>
              {generated.line_items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-sm">
                  <span className="truncate" title={item.description}>
                    {item.description}
                  </span>
                  <span className="text-right">{Number(item.quantity).toFixed(2)}</span>
                  <span className="text-right">{money(item.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{money(generated.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({Number(generated.tax_rate ?? 0).toFixed(2)}%)</span>
              <span>{money(generated.tax_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground pt-1 border-t">
              <span>Total</span>
              <span>{money(generated.total)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={reset}>
              Generate another
            </Button>
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-start">
                Period Start <span className="text-red-500">*</span>
              </Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
                disabled={generate.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end">
                Period End <span className="text-red-500">*</span>
              </Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
                disabled={generate.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              min="0"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              disabled={generate.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Billable time is aggregated per project at the applicable rate. Totals are computed on
              generation.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={generate.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={generate.isPending}>
              {generate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Draft
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
