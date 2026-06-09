import type {SupabaseClient} from '@supabase/supabase-js';
import {addDays, differenceInCalendarDays, startOfToday, subDays} from 'date-fns';
import {supabase} from '@/lib/db';
import type {TicketPriority, TicketStatus} from '@/lib/db/schema';
import {computeClientHeat, STALE_WINDOW_DAYS, type ClientHeatSignals} from './client-heatmap-score';

// Re-export the pure scoring API so callers can import everything heat-related
// from this single service module.
export {
  computeClientHeat,
  DEFAULT_WEIGHTS,
  HEAT_CAPS,
  STALE_WINDOW_DAYS,
} from './client-heatmap-score';
export type {
  ClientHeatSignals,
  HeatWeights,
  HeatSignalKey,
  HeatTier,
  HeatReason,
} from './client-heatmap-score';

// ---------------------------------------------------------------------------
// Service-only types
// ---------------------------------------------------------------------------

export interface ClientHeatCounts {
  openTickets: number;
  overdueTickets: number;
  overdueInvoices: number;
  overdueAmount: number;
  dueSoon: number;
  lastActivityDays: number;
}

export interface ClientHeat {
  clientId: string;
  name: string;
  score: number;
  tier: ReturnType<typeof computeClientHeat>['tier'];
  reasons: ReturnType<typeof computeClientHeat>['reasons'];
  counts: ClientHeatCounts;
  /** Total invoiced value (paid + sent) — drives the matrix x-axis. */
  value: number;
}

export interface ClientWorkItem {
  id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  dueDate: string | null;
  overdue: boolean;
}

export interface ClientWorkBreakdown {
  /** New / in-progress tickets. */
  toDo: ClientWorkItem[];
  /** Review-stage or overdue tickets ready to ship. */
  toDeliver: ClientWorkItem[];
  /** Plain-text notes about coverage gaps (no upcoming work, overdue invoice). */
  gaps: string[];
}

// ---------------------------------------------------------------------------
// Data access (supabase-js returns untyped rows + numeric strings)
// ---------------------------------------------------------------------------

interface ClientRow {
  id: string;
  name: string;
}
interface ProjectRow {
  id: string;
  client_id: string | null;
}
interface TicketRow {
  id: string;
  status: TicketStatus;
  due_date: string | null;
  created_at: string;
  project_id: string;
}
interface InvoiceRow {
  client_id: string;
  status: string;
  total: string | number | null;
  due_date: string | null;
}
interface ActivityRow {
  project_id: string;
  created_at: string;
}
interface TimeEntryRow {
  start_time: string;
  tickets: {project_id: string} | {project_id: string}[] | null;
}
interface WorkTicketRow {
  id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  due_date: string | null;
  project_id: string;
}

function firstOf<T>(value: T[] | T | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

interface ClientAccumulator {
  openTickets: number;
  overdueTickets: number;
  dueSoon: number;
  recentTickets: number;
  recentActivities: number;
  lastActivityMs: number;
  overdueAmount: number;
  overdueInvoices: number;
  value: number;
}

function emptyAccumulator(): ClientAccumulator {
  return {
    openTickets: 0,
    overdueTickets: 0,
    dueSoon: 0,
    recentTickets: 0,
    recentActivities: 0,
    lastActivityMs: 0,
    overdueAmount: 0,
    overdueInvoices: 0,
    value: 0,
  };
}

function isInvoiceOverdue(status: string, dueDate: string | null, todayMs: number): boolean {
  if (status === 'overdue') return true;
  if (status === 'sent' && dueDate) return new Date(dueDate).getTime() < todayMs;
  return false;
}

/**
 * Compute heat scores for every client in a company.
 * BATCHED: one query per entity (clients, projects, tickets, invoices,
 * activities, time entries) — grouping happens in JS. No per-client query loop.
 */
export async function getClientHeatmap(
  companyId: string,
  db: SupabaseClient = supabase,
): Promise<ClientHeat[]> {
  const now = new Date();
  const today = startOfToday();
  const todayMs = today.getTime();
  const dueSoonCutoffMs = addDays(today, 7).getTime();
  const demandCutoffMs = subDays(now, 14).getTime();
  const windowStart = subDays(now, STALE_WINDOW_DAYS).toISOString();

  const [{data: clientData, error: clientError}, {data: projectData, error: projectError}] =
    await Promise.all([
      db.from('clients').select('id, name').eq('company_id', companyId),
      db.from('projects').select('id, client_id').eq('company_id', companyId),
    ]);
  if (clientError) throw clientError;
  if (projectError) throw projectError;

  const clients = (clientData ?? []) as ClientRow[];
  const projects = (projectData ?? []) as ProjectRow[];

  const projectToClient = new Map<string, string>();
  for (const project of projects) {
    if (project.client_id) projectToClient.set(project.id, project.client_id);
  }
  const projectIds = [...projectToClient.keys()];

  const accumulators = new Map<string, ClientAccumulator>();
  for (const client of clients) accumulators.set(client.id, emptyAccumulator());

  // Invoices are company-scoped (no project join needed).
  const invoicePromise = db
    .from('client_invoices')
    .select('client_id, status, total, due_date')
    .eq('company_id', companyId);

  // Ticket / activity / time-entry signals only exist when projects exist.
  const emptyResult = Promise.resolve({data: [], error: null});
  const ticketPromise = projectIds.length
    ? db
        .from('tickets')
        .select('id, status, due_date, created_at, project_id')
        .in('project_id', projectIds)
        .is('deleted_at', null)
    : emptyResult;
  const activityPromise = projectIds.length
    ? db
        .from('activities')
        .select('project_id, created_at')
        .in('project_id', projectIds)
        .gte('created_at', windowStart)
    : emptyResult;
  const timePromise = projectIds.length
    ? db
        .from('time_entries')
        .select('start_time, tickets!inner(project_id)')
        .in('tickets.project_id', projectIds)
        .gte('start_time', windowStart)
    : emptyResult;

  const [
    {data: invoiceData, error: invoiceError},
    {data: ticketData, error: ticketError},
    {data: activityData, error: activityError},
    {data: timeData, error: timeError},
  ] = await Promise.all([invoicePromise, ticketPromise, activityPromise, timePromise]);
  if (invoiceError) throw invoiceError;
  if (ticketError) throw ticketError;
  if (activityError) throw activityError;
  if (timeError) throw timeError;

  for (const invoice of (invoiceData ?? []) as InvoiceRow[]) {
    const acc = accumulators.get(invoice.client_id);
    if (!acc) continue;
    const total = Number(invoice.total) || 0;
    if (invoice.status === 'paid' || invoice.status === 'sent') acc.value += total;
    if (isInvoiceOverdue(invoice.status, invoice.due_date, todayMs)) {
      acc.overdueInvoices += 1;
      acc.overdueAmount += total;
    }
  }

  for (const ticket of (ticketData ?? []) as TicketRow[]) {
    const clientId = projectToClient.get(ticket.project_id);
    const acc = clientId ? accumulators.get(clientId) : undefined;
    if (!acc) continue;

    if (new Date(ticket.created_at).getTime() >= demandCutoffMs) acc.recentTickets += 1;
    if (ticket.status === 'done') continue;

    acc.openTickets += 1;
    if (ticket.due_date) {
      const dueMs = new Date(ticket.due_date).getTime();
      if (dueMs < todayMs) acc.overdueTickets += 1;
      else if (dueMs <= dueSoonCutoffMs) acc.dueSoon += 1;
    }
  }

  for (const activity of (activityData ?? []) as ActivityRow[]) {
    const clientId = projectToClient.get(activity.project_id);
    const acc = clientId ? accumulators.get(clientId) : undefined;
    if (!acc) continue;
    const ms = new Date(activity.created_at).getTime();
    if (ms > acc.lastActivityMs) acc.lastActivityMs = ms;
    if (ms >= demandCutoffMs) acc.recentActivities += 1;
  }

  for (const entry of (timeData ?? []) as TimeEntryRow[]) {
    const ticket = firstOf(entry.tickets);
    const clientId = ticket ? projectToClient.get(ticket.project_id) : undefined;
    const acc = clientId ? accumulators.get(clientId) : undefined;
    if (!acc) continue;
    const ms = new Date(entry.start_time).getTime();
    if (ms > acc.lastActivityMs) acc.lastActivityMs = ms;
  }

  const results: ClientHeat[] = clients.map((client) => {
    const acc = accumulators.get(client.id) ?? emptyAccumulator();
    const lastActivityDays =
      acc.lastActivityMs > 0
        ? Math.max(0, differenceInCalendarDays(now, new Date(acc.lastActivityMs)))
        : STALE_WINDOW_DAYS;

    const signals: ClientHeatSignals = {
      overdueAmount: acc.overdueAmount,
      openTickets: acc.openTickets,
      overdueTickets: acc.overdueTickets,
      lastActivityDays,
      dueSoon: acc.dueSoon,
      recentActivity: acc.recentActivities + acc.recentTickets,
    };

    const {score, tier, reasons} = computeClientHeat(signals);

    return {
      clientId: client.id,
      name: client.name,
      score,
      tier,
      reasons,
      counts: {
        openTickets: acc.openTickets,
        overdueTickets: acc.overdueTickets,
        overdueInvoices: acc.overdueInvoices,
        overdueAmount: acc.overdueAmount,
        dueSoon: acc.dueSoon,
        lastActivityDays,
      },
      value: acc.value,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Open work for a single client, split into "to do" (new/in-progress) and
 * "to deliver" (review-stage or overdue), plus plain-text coverage gaps.
 */
export async function getClientWorkBreakdown(
  clientId: string,
  db: SupabaseClient = supabase,
): Promise<ClientWorkBreakdown> {
  const today = startOfToday();
  const todayMs = today.getTime();
  const dueSoonCutoffMs = addDays(today, 7).getTime();

  const {data: projectData, error: projectError} = await db
    .from('projects')
    .select('id')
    .eq('client_id', clientId);
  if (projectError) throw projectError;

  const projectIds = ((projectData ?? []) as {id: string}[]).map((p) => p.id);

  const [
    {data: ticketData, error: ticketError},
    {count: overdueInvoiceCount, error: invoiceError},
  ] = await Promise.all([
    projectIds.length
      ? db
          .from('tickets')
          .select('id, title, status, priority, due_date, project_id')
          .in('project_id', projectIds)
          .neq('status', 'done')
          .is('deleted_at', null)
      : Promise.resolve({data: [], error: null}),
    db
      .from('client_invoices')
      .select('id', {count: 'exact', head: true})
      .eq('client_id', clientId)
      .eq('status', 'overdue'),
  ]);
  if (ticketError) throw ticketError;
  if (invoiceError) throw invoiceError;

  const toDo: ClientWorkItem[] = [];
  const toDeliver: ClientWorkItem[] = [];
  let dueSoon = 0;

  for (const ticket of (ticketData ?? []) as WorkTicketRow[]) {
    const dueMs = ticket.due_date ? new Date(ticket.due_date).getTime() : null;
    const overdue = dueMs !== null && dueMs < todayMs;
    if (dueMs !== null && dueMs >= todayMs && dueMs <= dueSoonCutoffMs) dueSoon += 1;

    const item: ClientWorkItem = {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      dueDate: ticket.due_date,
      overdue,
    };

    if (ticket.status === 'review' || overdue) toDeliver.push(item);
    else toDo.push(item);
  }

  const overdueInvoices = overdueInvoiceCount ?? 0;
  const gaps: string[] = [];
  if (toDo.length === 0 && toDeliver.length === 0) gaps.push('No open work for this client');
  if (dueSoon === 0 && toDo.length > 0) gaps.push('No upcoming deadlines in the next 7 days');
  if (overdueInvoices > 0) {
    gaps.push(`${overdueInvoices} overdue invoice${overdueInvoices === 1 ? '' : 's'}`);
  }

  return {toDo, toDeliver, gaps};
}
