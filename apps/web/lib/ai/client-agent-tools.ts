import {tool} from 'ai';
import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import {
  getClientHeatmap,
  getClientWorkBreakdown,
  type ClientHeat,
} from '@/lib/db/client-heatmap-service';
import {generateClientInvoice} from '@/lib/db/client-invoicing-service';
import {createTicket} from '@/lib/db/service';
import type {NewActivity} from '@/lib/db/schema';

export interface ClientAgentToolsConfig {
  /** Resolved server-side from the session — never supplied by the model. */
  companyId: string;
  /** The authenticated user; recorded as reporter / audit actor. */
  userId: string;
  /** Service-role client. Every query below is scoped by companyId. */
  supabase: SupabaseClient;
}

// supabase-js returns untyped rows; narrow locally (mirrors the service layer).
interface ClientLookupRow {
  id: string;
  name: string;
}
interface ProjectLookupRow {
  id: string;
  name: string;
}
interface OpenInvoiceRow {
  invoice_number: string;
  status: string;
  total: string | number | null;
  due_date: string | null;
}

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const OPEN_INVOICE_STATUSES = ['draft', 'sent', 'overdue'] as const;

/** Compact, model-friendly projection of a heat row. */
function toHeatSummary(heat: ClientHeat) {
  return {
    clientId: heat.clientId,
    name: heat.name,
    score: heat.score,
    tier: heat.tier,
    reasons: heat.reasons,
    openTickets: heat.counts.openTickets,
    overdueTickets: heat.counts.overdueTickets,
    overdueInvoices: heat.counts.overdueInvoices,
    overdueAmount: heat.counts.overdueAmount,
    value: heat.value,
  };
}

/**
 * Company-scoped tool set for the client-operations agent. Each tool closes over
 * {companyId, userId, supabase} so the model can never widen the scope, supply a
 * different company, or reach another tenant's data.
 */
export function createClientAgentTools({companyId, userId, supabase}: ClientAgentToolsConfig) {
  /** Fuzzy-resolve a client by name within this company. First match wins. */
  async function resolveClient(clientName: string): Promise<ClientLookupRow | null> {
    const {data, error} = await supabase
      .from('clients')
      .select('id, name')
      .eq('company_id', companyId)
      .ilike('name', `%${clientName}%`)
      .order('name', {ascending: true})
      .limit(1);
    if (error) throw error;
    const row = (data ?? [])[0] as ClientLookupRow | undefined;
    return row ?? null;
  }

  async function getOpenInvoices(clientId: string) {
    const {data, error} = await supabase
      .from('client_invoices')
      .select('invoice_number, status, total, due_date')
      .eq('company_id', companyId)
      .eq('client_id', clientId)
      .in('status', [...OPEN_INVOICE_STATUSES]);
    if (error) throw error;
    const rows = (data ?? []) as OpenInvoiceRow[];
    const totalOutstanding = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    return {
      count: rows.length,
      totalOutstanding,
      items: rows.map((r) => ({
        invoiceNumber: r.invoice_number,
        status: r.status,
        total: Number(r.total) || 0,
        dueDate: r.due_date,
      })),
    };
  }

  async function logAiAction(activity: Omit<NewActivity, 'user_id' | 'type'>): Promise<void> {
    const payload: NewActivity = {...activity, type: 'ai_action', user_id: userId};
    const {error} = await supabase.from('activities').insert(payload);
    if (error) throw error;
  }

  return {
    getClientHeatmap: tool({
      description:
        'List every client for this company ranked by "heat" (urgency). Use for ' +
        '"who needs attention", overviews, or before recommending priorities.',
      inputSchema: z.object({}),
      execute: async () => {
        const heat = await getClientHeatmap(companyId, supabase);
        return {clients: heat.map(toHeatSummary)};
      },
    }),

    getClientWorkStatus: tool({
      description:
        'Detailed status for ONE client: open work (to-do / to-deliver), coverage ' +
        "gaps, the client's heat row, and outstanding invoices. Resolve by name.",
      inputSchema: z.object({
        clientName: z.string().min(1).describe('Client name or fragment to match.'),
      }),
      execute: async ({clientName}) => {
        const client = await resolveClient(clientName);
        if (!client) {
          return {found: false as const, message: `No client matching "${clientName}".`};
        }
        const [work, heat, openInvoices] = await Promise.all([
          getClientWorkBreakdown(client.id, supabase),
          getClientHeatmap(companyId, supabase),
          getOpenInvoices(client.id),
        ]);
        const heatRow = heat.find((h) => h.clientId === client.id);
        return {
          found: true as const,
          client,
          heat: heatRow ? toHeatSummary(heatRow) : null,
          work,
          openInvoices,
        };
      },
    }),

    listPriorityClients: tool({
      description:
        'Top-N hottest clients with the reasons driving each score. Use when the ' +
        'user asks what to focus on or which clients are at risk.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).optional().describe('How many clients (default 5).'),
      }),
      execute: async ({limit}) => {
        const heat = await getClientHeatmap(companyId, supabase);
        const top = heat.slice(0, limit ?? 5);
        return {
          clients: top.map((h) => ({
            clientId: h.clientId,
            name: h.name,
            score: h.score,
            tier: h.tier,
            reasons: h.reasons,
          })),
        };
      },
    }),

    // ---- WRITE: only call after the user explicitly confirms in chat. ----
    createTicketForClient: tool({
      description:
        "Create a ticket on a client's first active project. WRITE ACTION — only " +
        'call after the user has confirmed the client, title, priority and due date.',
      inputSchema: z.object({
        clientName: z.string().min(1).describe('Client to create the ticket for.'),
        title: z.string().min(1).describe('Ticket title.'),
        priority: z.enum(PRIORITIES).optional().describe('Defaults to medium.'),
        dueDate: z.string().regex(ISO_DATE).optional().describe('Optional due date, yyyy-MM-dd.'),
      }),
      execute: async ({clientName, title, priority, dueDate}) => {
        const client = await resolveClient(clientName);
        if (!client) {
          return {created: false as const, message: `No client matching "${clientName}".`};
        }
        const {data: projectData, error: projectError} = await supabase
          .from('projects')
          .select('id, name')
          .eq('company_id', companyId)
          .eq('client_id', client.id)
          .eq('status', 'active')
          .order('created_at', {ascending: true})
          .limit(1);
        if (projectError) throw projectError;
        const project = (projectData ?? [])[0] as ProjectLookupRow | undefined;
        if (!project) {
          return {
            created: false as const,
            message: `${client.name} has no active project to attach a ticket to.`,
          };
        }

        const ticket = await createTicket(
          {
            title,
            project_id: project.id,
            reporter_id: userId,
            status: 'new',
            priority: priority ?? 'medium',
            due_date: dueDate ?? null,
          },
          supabase,
        );

        await logAiAction({
          project_id: project.id,
          ticket_id: ticket.id,
          title: `AI created ticket "${title}"`,
          description: `Created for client ${client.name} via the client-operations assistant.`,
          metadata: {action: 'create_ticket', clientId: client.id, ticketId: ticket.id},
        });

        return {
          created: true as const,
          ticket: {
            id: ticket.id,
            title: ticket.title,
            priority: ticket.priority,
            status: ticket.status,
            dueDate: ticket.due_date ?? null,
            projectName: project.name,
            clientName: client.name,
          },
        };
      },
    }),

    // ---- WRITE: only call after the user explicitly confirms in chat. ----
    draftInvoiceForClient: tool({
      description:
        'Generate a DRAFT invoice for a client over a billing period. WRITE ACTION ' +
        '— only call after the user confirms the client and the period.',
      inputSchema: z.object({
        clientName: z.string().min(1).describe('Client to invoice.'),
        periodStart: z.string().regex(ISO_DATE).describe('Period start, yyyy-MM-dd.'),
        periodEnd: z.string().regex(ISO_DATE).describe('Period end, yyyy-MM-dd.'),
      }),
      execute: async ({clientName, periodStart, periodEnd}) => {
        const client = await resolveClient(clientName);
        if (!client) {
          return {drafted: false as const, message: `No client matching "${clientName}".`};
        }

        const invoice = await generateClientInvoice(
          companyId,
          client.id,
          periodStart,
          periodEnd,
          undefined,
          supabase,
        );

        await logAiAction({
          title: `AI drafted invoice ${invoice.invoice_number}`,
          description: `Draft for client ${client.name} (${periodStart} → ${periodEnd}).`,
          metadata: {action: 'draft_invoice', clientId: client.id, invoiceId: invoice.id},
        });

        return {
          drafted: true as const,
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            status: invoice.status,
            subtotal: Number(invoice.subtotal) || 0,
            taxAmount: Number(invoice.tax_amount) || 0,
            total: Number(invoice.total) || 0,
            currency: invoice.currency ?? 'USD',
            periodStart,
            periodEnd,
            clientName: client.name,
            lineItems: invoice.line_items.map((li) => ({
              description: li.description,
              quantity: Number(li.quantity) || 0,
              unitRate: Number(li.unit_rate) || 0,
              amount: Number(li.amount) || 0,
            })),
          },
        };
      },
    }),
  };
}
