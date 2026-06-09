'use client';

import {useState} from 'react';
import {addMonths, format} from 'date-fns';
import {Loader2, Save} from 'lucide-react';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {Modal} from '@/components/ui/modal';
import {useCreateInvoiceSchedule} from '@/lib/hooks/useClientInvoices';
import {useAuthStore} from '@/lib/stores/auth';
import type {ClientInvoiceScheduleFrequency} from '@/lib/db/schema';

const DATE_FMT = 'yyyy-MM-dd';

const FREQUENCY_OPTIONS: {value: ClientInvoiceScheduleFrequency; label: string}[] = [
  {value: 'weekly', label: 'Weekly'},
  {value: 'bi_monthly', label: 'Bi-monthly (every 15 days)'},
  {value: 'monthly', label: 'Monthly'},
];

interface InvoiceScheduleFormProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

export function InvoiceScheduleForm({
  isOpen,
  onClose,
  clientId,
  clientName,
}: InvoiceScheduleFormProps) {
  const {user} = useAuthStore();
  const createSchedule = useCreateInvoiceSchedule();

  const [frequency, setFrequency] = useState<ClientInvoiceScheduleFrequency>('monthly');
  const [nextRunDate, setNextRunDate] = useState(format(addMonths(new Date(), 1), DATE_FMT));
  const [autoSend, setAutoSend] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nextRunDate) {
      setError('Pick the first run date.');
      return;
    }

    try {
      await createSchedule.mutateAsync({
        client_id: clientId,
        frequency,
        next_run_date: nextRunDate,
        active: true,
        auto_send: autoSend,
        created_by: user?.id ?? null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={createSchedule.isPending ? () => {} : onClose}
      title="Recurring Invoices"
      description={`Automatically generate invoices for ${clientName}.`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="schedule-frequency">Frequency</Label>
          <Select
            value={frequency}
            onValueChange={(value) => setFrequency(value as ClientInvoiceScheduleFrequency)}>
            <SelectTrigger id="schedule-frequency" disabled={createSchedule.isPending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule-next-run">
            First Run Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="schedule-next-run"
            type="date"
            value={nextRunDate}
            onChange={(e) => setNextRunDate(e.target.value)}
            required
            disabled={createSchedule.isPending}
          />
          <p className="text-xs text-muted-foreground">
            On each run, the just-elapsed period is invoiced and the next run is scheduled
            automatically.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={autoSend}
            onChange={(e) => setAutoSend(e.target.checked)}
            disabled={createSchedule.isPending}
            className="h-4 w-4 rounded border-input"
          />
          Automatically mark generated invoices as sent
        </label>

        <div className="flex items-center justify-end gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createSchedule.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSchedule.isPending}>
            {createSchedule.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Schedule
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
