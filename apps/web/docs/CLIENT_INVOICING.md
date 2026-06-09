# Client Invoicing

Per-client billing for PulseTrack. **Additive** to the existing internal
`billing_periods` system (which bills company time generally) — this feature
produces client-facing invoices grouped by project from billable time entries.
Nothing in `billing_periods` is touched.

## Data model

Migration: `lib/db/migrations/0018_client_invoicing.sql`.

```
companies ──┐                        clients ──┐
            │                                  │
            ▼                                  ▼
        client_invoices ──────────────────────┘
            │  company_id, client_id, invoice_number (UNIQUE per company),
            │  status [draft|sent|paid|overdue|void], issue_date, due_date,
            │  period_start/end, subtotal, tax_rate, tax_amount, total,
            │  currency, notes, sent_at, paid_at, payment_reference, created_by
            │
            ├──< client_invoice_line_items
            │      invoice_id (cascade), project_id (set null), description,
            │      quantity, unit_rate, amount, sort_order
            │
client_invoice_schedules (company_id, client_id)
       frequency [weekly|bi_monthly|monthly], day_of_month, next_run_date,
       active, auto_send, created_by
```

- Money: `numeric(12,2)`; `quantity numeric(10,2)`; `tax_rate numeric(5,2)`.
  supabase-js returns these as **strings** — coerce with `Number()` before math.
- Indexes on every FK, plus `client_invoices(status)` and a partial index on
  `client_invoice_schedules(next_run_date) WHERE active`.
- RLS (ENABLE + FORCE on all three tables): `service_role_bypass`
  (`is_service_role()`), company-scoped `SELECT` via `can_access_company`,
  and `INSERT/UPDATE/DELETE` via `can_manage_company`. Line items are scoped
  through the parent invoice's company with an `EXISTS` subquery, mirroring how
  `client_contacts` is scoped via `clients` in `0016_client_management.sql`.

## Generation

`generateClientInvoice(companyId, clientId, periodStart, periodEnd, opts?)`:

1. Find projects `WHERE client_id = clientId`.
2. Load billable `time_entries` on tickets in those projects within
   `[periodStart, periodEnd]` (filter on `start_time`; `duration` is decimal
   hours). Join `tickets!inner(project_id, projects!inner(company_id, client_id, name))`.
3. Resolve each entry's rate by **reusing** `billing-service.ts`
   (`calculateApplicableRate` / `getTimeEntriesForBilling`) — precedence
   project rate > user rate > company default > `users.hourly_rate`. Do not
   reimplement.
4. Aggregate by project → one line item: `'<project name> — <hours>h'`,
   `quantity = hours`, `unit_rate = blended/avg rate`, `amount = Σ(duration * rate)`.
5. `invoice_number = prefix + year + '-' + zeroPad(sequence)`, where `prefix =
   company_billing_settings.invoice_prefix || 'INV-'` and `sequence =
   count(existing company invoices) + 1`.
6. Insert the invoice (`status 'draft'`, `issue_date` = today, `due_date` = +30d,
   `subtotal = Σ`, tax from `opts.taxRate` default 0, `total = subtotal + tax`)
   plus its line items; return the invoice with line items.

## Scheduling

`generateScheduledInvoices(asOf, supabaseClient?)`:

- Select active schedules where `next_run_date <= asOf`.
- For each, `generateClientInvoice` over the elapsed period.
- Advance `next_run_date` by `frequency` (weekly +7d, bi_monthly +~15d,
  monthly +1 month anchored on `day_of_month`).
- If `auto_send`, mark the new invoice `sent` (set `sent_at`).
- Runs under service-role (bypasses RLS) for cron/background execution.

## Service layer (`lib/db`)

`generateClientInvoice`, `listClientInvoices(companyId, {clientId?, status?})`,
`getClientInvoiceDetail(id)` (invoice + line_items + client +
`company_billing_settings` for branding), `updateClientInvoiceStatus(id, status)`
(sets `sent_at`/`paid_at`), `voidClientInvoice(id)`, `deleteClientInvoice(id)`,
`addLineItem` / `updateLineItem` / `deleteLineItem` (recompute totals),
`createInvoiceSchedule` / `updateInvoiceSchedule` / `listSchedules(companyId)`,
`generateScheduledInvoices`.

## UI plan

Data flow: Component → TanStack Query hook (`lib/hooks`) → service (`lib/db`) →
Supabase. Reuse `@workspace/ui` / `components/ui` primitives and the existing
invoice PDF renderer for client-facing output.

- Client invoices list: filter by client/status, status badges, totals.
- Invoice detail/editor: editable line items with live total recompute,
  status transitions (send / mark paid / void), branded PDF export.
- Generate dialog: pick client + period → preview project line items → create draft.
- Schedules panel: per-client recurring config (frequency, day, auto_send).
