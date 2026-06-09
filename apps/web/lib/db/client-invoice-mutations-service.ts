import type {SupabaseClient} from '@supabase/supabase-js';
import {addDays, addMonths, addWeeks, format, subDays, subMonths, subWeeks} from 'date-fns';
import {supabase} from '@/lib/db';
import {DATE_FMT, generateClientInvoice, round2} from './client-invoicing-service';
import type {
  ClientInvoice,
  ClientInvoiceLineItem,
  ClientInvoiceSchedule,
  ClientInvoiceScheduleFrequency,
  ClientInvoiceStatus,
  ClientInvoiceWithLineItems,
  NewClientInvoice,
  NewClientInvoiceLineItem,
  NewClientInvoiceSchedule,
} from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

/** Update an invoice status, stamping sent_at / paid_at on the matching transitions. */
export async function updateClientInvoiceStatus(
  id: string,
  status: ClientInvoiceStatus,
  client: SupabaseClient = supabase,
): Promise<ClientInvoice> {
  const nowIso = new Date().toISOString();
  const updates: Partial<NewClientInvoice> & {updated_at: string} = {
    status,
    updated_at: nowIso,
  };
  if (status === 'sent') updates.sent_at = nowIso;
  if (status === 'paid') updates.paid_at = nowIso;

  const {data, error} = await client
    .from('client_invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ClientInvoice;
}

/** Mark an invoice as void. */
export async function voidClientInvoice(id: string): Promise<ClientInvoice> {
  return updateClientInvoiceStatus(id, 'void');
}

/** Delete an invoice (line items cascade via FK). */
export async function deleteClientInvoice(id: string): Promise<void> {
  const {error} = await supabase.from('client_invoices').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Line-item CRUD (each call recomputes invoice totals)
// ---------------------------------------------------------------------------

async function recomputeInvoiceTotals(invoiceId: string): Promise<ClientInvoiceWithLineItems> {
  const {data: itemRows, error: itemsError} = await supabase
    .from('client_invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', {ascending: true});
  if (itemsError) throw itemsError;
  const lineItems = (itemRows ?? []) as ClientInvoiceLineItem[];

  const {data: current, error: currentError} = await supabase
    .from('client_invoices')
    .select('tax_rate')
    .eq('id', invoiceId)
    .single();
  if (currentError) throw currentError;

  const subtotal = round2(lineItems.reduce((sum, li) => sum + Number(li.amount), 0));
  const taxRate = Number((current as {tax_rate: string | null}).tax_rate ?? 0);
  const taxAmount = round2((subtotal * taxRate) / 100);
  const total = round2(subtotal + taxAmount);

  const {data: updated, error: updateError} = await supabase
    .from('client_invoices')
    .update({
      subtotal: subtotal.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .select()
    .single();
  if (updateError) throw updateError;

  return {...(updated as ClientInvoice), line_items: lineItems};
}

function normalizeLineAmounts(
  quantity: number,
  unitRate: number,
  amount: number | null,
): {quantity: string; unit_rate: string; amount: string} {
  const resolvedAmount = amount != null ? amount : round2(quantity * unitRate);
  return {
    quantity: quantity.toFixed(2),
    unit_rate: unitRate.toFixed(2),
    amount: round2(resolvedAmount).toFixed(2),
  };
}

/** Add a line item to an invoice and recompute totals. */
export async function addLineItem(
  invoiceId: string,
  item: Omit<NewClientInvoiceLineItem, 'invoice_id'>,
): Promise<ClientInvoiceWithLineItems> {
  const amounts = normalizeLineAmounts(
    Number(item.quantity ?? 0),
    Number(item.unit_rate ?? 0),
    item.amount != null ? Number(item.amount) : null,
  );
  const {error} = await supabase
    .from('client_invoice_line_items')
    .insert({...item, invoice_id: invoiceId, ...amounts});
  if (error) throw error;
  return recomputeInvoiceTotals(invoiceId);
}

/** Update a line item and recompute the parent invoice totals. */
export async function updateLineItem(
  lineItemId: string,
  updates: Partial<Omit<NewClientInvoiceLineItem, 'invoice_id'>>,
): Promise<ClientInvoiceWithLineItems> {
  const {data: existing, error: fetchError} = await supabase
    .from('client_invoice_line_items')
    .select('*')
    .eq('id', lineItemId)
    .single();
  if (fetchError) throw fetchError;
  const current = existing as ClientInvoiceLineItem;

  const quantity = updates.quantity != null ? Number(updates.quantity) : Number(current.quantity);
  const unitRate =
    updates.unit_rate != null ? Number(updates.unit_rate) : Number(current.unit_rate);
  const amounts = normalizeLineAmounts(
    quantity,
    unitRate,
    updates.amount != null ? Number(updates.amount) : null,
  );

  const {error} = await supabase
    .from('client_invoice_line_items')
    .update({...updates, ...amounts})
    .eq('id', lineItemId);
  if (error) throw error;
  return recomputeInvoiceTotals(current.invoice_id);
}

/** Delete a line item and recompute the parent invoice totals. */
export async function deleteLineItem(lineItemId: string): Promise<ClientInvoiceWithLineItems> {
  const {data: existing, error: fetchError} = await supabase
    .from('client_invoice_line_items')
    .select('invoice_id')
    .eq('id', lineItemId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  const invoiceId = (existing as {invoice_id: string} | null)?.invoice_id;
  if (!invoiceId) throw new Error('Line item not found');

  const {error} = await supabase.from('client_invoice_line_items').delete().eq('id', lineItemId);
  if (error) throw error;
  return recomputeInvoiceTotals(invoiceId);
}

// ---------------------------------------------------------------------------
// Schedules + recurring generation
// ---------------------------------------------------------------------------

/** Create a recurring invoice schedule. */
export async function createInvoiceSchedule(
  data: NewClientInvoiceSchedule,
): Promise<ClientInvoiceSchedule> {
  const {data: result, error} = await supabase
    .from('client_invoice_schedules')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as ClientInvoiceSchedule;
}

/** Update a recurring invoice schedule. */
export async function updateInvoiceSchedule(
  id: string,
  updates: Partial<NewClientInvoiceSchedule>,
): Promise<ClientInvoiceSchedule> {
  const {data, error} = await supabase
    .from('client_invoice_schedules')
    .update({...updates, updated_at: new Date().toISOString()})
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ClientInvoiceSchedule;
}

/** List schedules for a company, soonest next-run first. */
export async function listSchedules(companyId: string): Promise<ClientInvoiceSchedule[]> {
  const {data, error} = await supabase
    .from('client_invoice_schedules')
    .select('*')
    .eq('company_id', companyId)
    .order('next_run_date', {ascending: true});
  if (error) throw error;
  return (data ?? []) as ClientInvoiceSchedule[];
}

function periodStartFor(runDate: Date, frequency: ClientInvoiceScheduleFrequency): Date {
  switch (frequency) {
    case 'weekly':
      return subWeeks(runDate, 1);
    case 'bi_monthly':
      return subDays(runDate, 15);
    case 'monthly':
      return subMonths(runDate, 1);
  }
}

function advanceRunDate(runDate: Date, frequency: ClientInvoiceScheduleFrequency): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(runDate, 1);
    case 'bi_monthly':
      return addDays(runDate, 15);
    case 'monthly':
      return addMonths(runDate, 1);
  }
}

/**
 * Generate draft invoices for every active schedule due on/before `asOf`.
 * For each: invoice the just-elapsed period [next_run - interval, next_run - 1d],
 * advance next_run_date by frequency, and (if auto_send) mark the invoice sent.
 * Accepts a supabase client so a cron can pass a service-role client.
 */
export async function generateScheduledInvoices(
  asOf: Date = new Date(),
  client: SupabaseClient = supabase,
): Promise<{scheduleId: string; invoiceId: string}[]> {
  const {data: scheduleRows, error} = await client
    .from('client_invoice_schedules')
    .select('*')
    .eq('active', true)
    .lte('next_run_date', format(asOf, DATE_FMT));
  if (error) throw error;

  const results: {scheduleId: string; invoiceId: string}[] = [];
  for (const schedule of (scheduleRows ?? []) as ClientInvoiceSchedule[]) {
    const runDate = new Date(schedule.next_run_date);
    const periodStart = format(periodStartFor(runDate, schedule.frequency), DATE_FMT);
    const periodEnd = format(subDays(runDate, 1), DATE_FMT);

    const invoice = await generateClientInvoice(
      schedule.company_id,
      schedule.client_id,
      periodStart,
      periodEnd,
      {createdBy: schedule.created_by ?? null},
      client,
    );

    if (schedule.auto_send) {
      await updateClientInvoiceStatus(invoice.id, 'sent', client);
    }

    await client
      .from('client_invoice_schedules')
      .update({
        next_run_date: format(advanceRunDate(runDate, schedule.frequency), DATE_FMT),
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule.id);

    results.push({scheduleId: schedule.id, invoiceId: invoice.id});
  }

  return results;
}
