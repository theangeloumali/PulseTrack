import type {SupabaseClient} from '@supabase/supabase-js';
import {addDays, format} from 'date-fns';
import {supabase} from '@/lib/db';
import {calculateApplicableRate} from './billing-service';
import type {
  Client,
  ClientInvoice,
  ClientInvoiceLineItem,
  ClientInvoiceStatus,
  ClientInvoiceWithLineItems,
  CompanyBillingSettings,
  NewClientInvoice,
  NewClientInvoiceLineItem,
} from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Local row/return shapes (supabase-js returns untyped rows + numeric strings)
// ---------------------------------------------------------------------------

interface BillingSettingsRow {
  currency?: string | null;
  invoice_prefix?: string | null;
  default_hourly_rate?: string | number | null;
}

interface RateRow {
  hourly_rate: string | number;
  project_id?: string | null;
  user_id?: string | null;
  effective_from: string;
  effective_to?: string | null;
}

interface EntryProject {
  id: string;
  name: string;
}
interface EntryTicket {
  id: string;
  project_id: string;
  projects?: EntryProject[] | EntryProject | null;
}
interface EntryUser {
  id: string;
  hourly_rate?: string | number | null;
}
interface BillableTimeEntry {
  id: string;
  start_time: string;
  duration: number | string | null;
  user_id: string;
  tickets?: EntryTicket[] | EntryTicket | null;
  users?: EntryUser[] | EntryUser | null;
}

// List row: invoice + embedded client name
interface ClientInvoiceListRow extends ClientInvoice {
  client: {id: string; name: string} | null;
}

export interface ClientInvoiceWithClient extends ClientInvoice {
  clientName: string | null;
}

type InvoiceClientSummary = Pick<
  Client,
  'id' | 'name' | 'contact_email' | 'contact_phone' | 'website'
>;

interface ClientInvoiceDetailRow extends ClientInvoice {
  line_items: ClientInvoiceLineItem[] | null;
  client: InvoiceClientSummary | null;
}

// Invoice detail bundle for the PDF/branding view
export interface ClientInvoiceDetail extends ClientInvoiceWithLineItems {
  client: InvoiceClientSummary | null;
  billingSettings: CompanyBillingSettings | null;
}

export interface GenerateClientInvoiceOptions {
  taxRate?: number;
  createdBy?: string | null;
}

// ---------------------------------------------------------------------------
// Shared helpers (also imported by client-invoice-mutations-service)
// ---------------------------------------------------------------------------

export const DATE_FMT = 'yyyy-MM-dd';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function firstOf<T>(value: T[] | T | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

// ---------------------------------------------------------------------------
// Client-aware reads (accept a supabase client so cron can pass service-role).
// The time-entry query mirrors getTimeEntriesForBilling but is client-aware and
// filters to the client's projects in-DB.
// ---------------------------------------------------------------------------

async function getBillingSettings(
  client: SupabaseClient,
  companyId: string,
): Promise<BillingSettingsRow | null> {
  const {data, error} = await client
    .from('company_billing_settings')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) throw error;
  return (data as BillingSettingsRow) ?? null;
}

async function getCompanyRates(client: SupabaseClient, companyId: string): Promise<RateRow[]> {
  const {data, error} = await client
    .from('billing_rates')
    .select('hourly_rate, project_id, user_id, effective_from, effective_to')
    .eq('company_id', companyId);
  if (error) throw error;
  return (data ?? []) as RateRow[];
}

async function getBillableTimeEntries(
  client: SupabaseClient,
  companyId: string,
  clientId: string,
  periodStart: string,
  periodEnd: string,
): Promise<BillableTimeEntry[]> {
  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  const {data, error} = await client
    .from('time_entries')
    .select(
      `
      id,
      start_time,
      duration,
      user_id,
      tickets!inner ( id, project_id, projects!inner ( id, name, company_id, client_id ) ),
      users!inner ( id, hourly_rate )
    `,
    )
    .eq('tickets.projects.company_id', companyId)
    .eq('tickets.projects.client_id', clientId)
    .gte('start_time', periodStart)
    .lte('start_time', end.toISOString())
    .not('duration', 'is', null)
    .gt('duration', 0)
    .order('start_time', {ascending: true});

  if (error) throw error;
  return (data ?? []) as unknown as BillableTimeEntry[];
}

/**
 * Build the next invoice_number for a company.
 * Scheme: (invoice_prefix || 'INV-') + <year> + '-' + zero-padded(sequence)
 * Sequence = count of existing client_invoices for the company + 1 (e.g. INV-2026-0007).
 */
async function buildInvoiceNumber(
  client: SupabaseClient,
  companyId: string,
  prefix: string | null | undefined,
): Promise<string> {
  const {count, error} = await client
    .from('client_invoices')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId);
  if (error) throw error;

  const sequence = (count ?? 0) + 1;
  const year = new Date().getFullYear();
  return `${prefix || 'INV-'}${year}-${String(sequence).padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Generate a draft invoice for a client over [periodStart, periodEnd].
 * One line item per project: blended rate = sum(duration*rate) / sum(hours).
 * Rate precedence is delegated to calculateApplicableRate (project > user >
 * company default > user.hourly_rate) — never reimplemented here.
 * Accepts a supabase client so a cron can pass a service-role client.
 */
export async function generateClientInvoice(
  companyId: string,
  clientId: string,
  periodStart: string,
  periodEnd: string,
  opts: GenerateClientInvoiceOptions = {},
  client: SupabaseClient = supabase,
): Promise<ClientInvoiceWithLineItems> {
  // 1. The client's projects (for names + scoping).
  const {data: projectRows, error: projectError} = await client
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('client_id', clientId);
  if (projectError) throw projectError;
  const projectNames = new Map<string, string>(
    ((projectRows ?? []) as {id: string; name: string}[]).map((p) => [p.id, p.name]),
  );

  // 2-3. Billable entries + rates + settings (client-aware reads).
  const [entries, rates, settings] = await Promise.all([
    getBillableTimeEntries(client, companyId, clientId, periodStart, periodEnd),
    getCompanyRates(client, companyId),
    getBillingSettings(client, companyId),
  ]);

  // 4. Aggregate by project.
  const byProject = new Map<string, {name: string; hours: number; amount: number}>();
  for (const entry of entries) {
    const ticket = firstOf(entry.tickets);
    if (!ticket) continue;
    const hours = Number(entry.duration) || 0;
    if (hours <= 0) continue;

    const projectId = ticket.project_id;
    const user = firstOf(entry.users);
    const {rate} = calculateApplicableRate({
      entryDate: entry.start_time,
      projectId,
      userId: entry.user_id,
      rates,
      companyDefaultRate: settings?.default_hourly_rate ?? null,
      userHourlyRate: user?.hourly_rate ?? null,
    });

    const name = projectNames.get(projectId) ?? firstOf(ticket.projects)?.name ?? 'Project';
    const existing = byProject.get(projectId);
    if (existing) {
      existing.hours += hours;
      existing.amount += hours * rate;
    } else {
      byProject.set(projectId, {name, hours, amount: hours * rate});
    }
  }

  // 5. Invoice number + money.
  const invoiceNumber = await buildInvoiceNumber(client, companyId, settings?.invoice_prefix);
  const subtotal = round2([...byProject.values()].reduce((sum, p) => sum + p.amount, 0));
  const taxRate = opts.taxRate ?? 0;
  const taxAmount = round2((subtotal * taxRate) / 100);
  const total = round2(subtotal + taxAmount);

  const issueDate = new Date();
  const dueDate = addDays(issueDate, 30);

  // 6. Insert invoice + line items.
  const invoicePayload: NewClientInvoice = {
    company_id: companyId,
    client_id: clientId,
    invoice_number: invoiceNumber,
    status: 'draft',
    issue_date: format(issueDate, DATE_FMT),
    due_date: format(dueDate, DATE_FMT),
    period_start: periodStart,
    period_end: periodEnd,
    subtotal: subtotal.toFixed(2),
    tax_rate: taxRate.toFixed(2),
    tax_amount: taxAmount.toFixed(2),
    total: total.toFixed(2),
    currency: settings?.currency ?? 'USD',
    created_by: opts.createdBy ?? null,
  };

  const {data: invoice, error: invoiceError} = await client
    .from('client_invoices')
    .insert(invoicePayload)
    .select()
    .single();
  if (invoiceError) throw invoiceError;
  const created = invoice as ClientInvoice;

  const lineItemPayload: NewClientInvoiceLineItem[] = [...byProject.entries()].map(
    ([projectId, p], index) => {
      const hours = round2(p.hours);
      const amount = round2(p.amount);
      const unitRate = hours > 0 ? round2(amount / hours) : 0;
      return {
        invoice_id: created.id,
        project_id: projectId,
        description: `${p.name} — ${hours}h`,
        quantity: hours.toFixed(2),
        unit_rate: unitRate.toFixed(2),
        amount: amount.toFixed(2),
        sort_order: index,
      };
    },
  );

  let lineItems: ClientInvoiceLineItem[] = [];
  if (lineItemPayload.length > 0) {
    const {data: items, error: itemsError} = await client
      .from('client_invoice_line_items')
      .insert(lineItemPayload)
      .select();
    if (itemsError) throw itemsError;
    lineItems = (items ?? []) as ClientInvoiceLineItem[];
  }

  return {...created, line_items: lineItems};
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** List invoices for a company, optionally filtered by client and/or status. */
export async function listClientInvoices(
  companyId: string,
  filters: {clientId?: string; status?: ClientInvoiceStatus} = {},
): Promise<ClientInvoiceWithClient[]> {
  let query = supabase
    .from('client_invoices')
    .select(`*, client:client_id ( id, name )`)
    .eq('company_id', companyId)
    .order('created_at', {ascending: false});

  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.status) query = query.eq('status', filters.status);

  const {data, error} = await query;
  if (error) throw error;

  return ((data ?? []) as ClientInvoiceListRow[]).map(({client, ...invoice}) => ({
    ...invoice,
    clientName: client?.name ?? null,
  }));
}

/** Invoice + line items + client + company billing settings (for branding/PDF). */
export async function getClientInvoiceDetail(id: string): Promise<ClientInvoiceDetail | null> {
  const {data, error} = await supabase
    .from('client_invoices')
    .select(
      `
      *,
      line_items:client_invoice_line_items ( * ),
      client:client_id ( id, name, contact_email, contact_phone, website )
    `,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const {line_items, client, ...invoice} = data as ClientInvoiceDetailRow;
  const billingSettings = await getBillingSettings(supabase, invoice.company_id);
  const items = (line_items ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return {
    ...(invoice as ClientInvoice),
    line_items: items,
    client: client ?? null,
    billingSettings: (billingSettings as CompanyBillingSettings | null) ?? null,
  };
}
