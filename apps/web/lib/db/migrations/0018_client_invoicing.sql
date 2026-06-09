-- Client invoicing: permanent schema for client_invoices, line items, and
-- recurring invoice schedules. Additive only — does NOT touch billing_periods.
-- Mirrors the tenant-safe RLS patterns in 0016_client_management.sql / rls_policies.sql
-- (helper functions is_service_role / can_access_company / can_manage_company).
-- Idempotent so it is safe to re-run (inline FKs, IF NOT EXISTS, DROP/CREATE policies).

SET client_min_messages = 'warning';

-- ============================================================================
-- Tables
-- ============================================================================

-- Client invoices (company + client scoped, additive to billing_periods)
CREATE TABLE IF NOT EXISTS "client_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL
    REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action,
  "client_id" uuid NOT NULL
    REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action,
  "invoice_number" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft', -- draft | sent | paid | overdue | void
  "issue_date" date,
  "due_date" date,
  "period_start" date,
  "period_end" date,
  "subtotal" numeric(12, 2) DEFAULT 0,
  "tax_rate" numeric(5, 2) DEFAULT 0,
  "tax_amount" numeric(12, 2) DEFAULT 0,
  "total" numeric(12, 2) DEFAULT 0,
  "currency" text DEFAULT 'USD',
  "notes" text,
  "sent_at" timestamp with time zone,
  "paid_at" timestamp with time zone,
  "payment_reference" text,
  "created_by" uuid
    REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "client_invoices_company_id_invoice_number_unique" UNIQUE ("company_id", "invoice_number")
);

-- Client invoice line items (child of client_invoices)
CREATE TABLE IF NOT EXISTS "client_invoice_line_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL
    REFERENCES "public"."client_invoices"("id") ON DELETE cascade ON UPDATE no action,
  "project_id" uuid
    REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action,
  "description" text NOT NULL,
  "quantity" numeric(10, 2) NOT NULL DEFAULT 0,
  "unit_rate" numeric(12, 2) NOT NULL DEFAULT 0,
  "amount" numeric(12, 2) NOT NULL DEFAULT 0,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Client invoice schedules (recurring auto-generation, company + client scoped)
CREATE TABLE IF NOT EXISTS "client_invoice_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL
    REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action,
  "client_id" uuid NOT NULL
    REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action,
  "frequency" text NOT NULL DEFAULT 'monthly', -- weekly | bi_monthly | monthly
  "day_of_month" integer DEFAULT 1,
  "next_run_date" date NOT NULL,
  "active" boolean DEFAULT true,
  "auto_send" boolean DEFAULT false,
  "created_by" uuid
    REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================================================
-- Indexes (every FK + status + due schedules)
-- ============================================================================

CREATE INDEX IF NOT EXISTS "client_invoices_company_id_idx" ON "client_invoices" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "client_invoices_client_id_idx" ON "client_invoices" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "client_invoices_created_by_idx" ON "client_invoices" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "client_invoices_status_idx" ON "client_invoices" USING btree ("status");

CREATE INDEX IF NOT EXISTS "client_invoice_line_items_invoice_id_idx" ON "client_invoice_line_items" USING btree ("invoice_id");
CREATE INDEX IF NOT EXISTS "client_invoice_line_items_project_id_idx" ON "client_invoice_line_items" USING btree ("project_id");

CREATE INDEX IF NOT EXISTS "client_invoice_schedules_company_id_idx" ON "client_invoice_schedules" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "client_invoice_schedules_client_id_idx" ON "client_invoice_schedules" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "client_invoice_schedules_created_by_idx" ON "client_invoice_schedules" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "client_invoice_schedules_next_run_date_idx"
  ON "client_invoice_schedules" USING btree ("next_run_date") WHERE "active";

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE "client_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_invoices" FORCE ROW LEVEL SECURITY;
ALTER TABLE "client_invoice_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_invoice_line_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "client_invoice_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_invoice_schedules" FORCE ROW LEVEL SECURITY;

-- Drop previous policies so this script is repeatable
DROP POLICY IF EXISTS "service_role_bypass" ON "client_invoices";
DROP POLICY IF EXISTS "client_invoices_select" ON "client_invoices";
DROP POLICY IF EXISTS "client_invoices_insert" ON "client_invoices";
DROP POLICY IF EXISTS "client_invoices_update" ON "client_invoices";
DROP POLICY IF EXISTS "client_invoices_delete" ON "client_invoices";

DROP POLICY IF EXISTS "service_role_bypass" ON "client_invoice_line_items";
DROP POLICY IF EXISTS "client_invoice_line_items_select" ON "client_invoice_line_items";
DROP POLICY IF EXISTS "client_invoice_line_items_insert" ON "client_invoice_line_items";
DROP POLICY IF EXISTS "client_invoice_line_items_update" ON "client_invoice_line_items";
DROP POLICY IF EXISTS "client_invoice_line_items_delete" ON "client_invoice_line_items";

DROP POLICY IF EXISTS "service_role_bypass" ON "client_invoice_schedules";
DROP POLICY IF EXISTS "client_invoice_schedules_select" ON "client_invoice_schedules";
DROP POLICY IF EXISTS "client_invoice_schedules_insert" ON "client_invoice_schedules";
DROP POLICY IF EXISTS "client_invoice_schedules_update" ON "client_invoice_schedules";
DROP POLICY IF EXISTS "client_invoice_schedules_delete" ON "client_invoice_schedules";

-- Service-role bypass for internal/admin operations (seeds, scheduled jobs)
CREATE POLICY "service_role_bypass" ON "client_invoices"
  FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON "client_invoice_line_items"
  FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON "client_invoice_schedules"
  FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());

-- client_invoices: company-scoped tenant policies
CREATE POLICY "client_invoices_select" ON "client_invoices"
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY "client_invoices_insert" ON "client_invoices"
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "client_invoices_update" ON "client_invoices"
  FOR UPDATE TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "client_invoices_delete" ON "client_invoices"
  FOR DELETE TO authenticated
  USING (public.can_manage_company(company_id));

-- client_invoice_line_items: scoped via parent invoice's company
CREATE POLICY "client_invoice_line_items_select" ON "client_invoice_line_items"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.client_invoices i
      WHERE i.id = invoice_id
        AND public.can_access_company(i.company_id)
    )
  );

CREATE POLICY "client_invoice_line_items_insert" ON "client_invoice_line_items"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.client_invoices i
      WHERE i.id = invoice_id
        AND public.can_manage_company(i.company_id)
    )
  );

CREATE POLICY "client_invoice_line_items_update" ON "client_invoice_line_items"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.client_invoices i
      WHERE i.id = invoice_id
        AND public.can_manage_company(i.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.client_invoices i
      WHERE i.id = invoice_id
        AND public.can_manage_company(i.company_id)
    )
  );

CREATE POLICY "client_invoice_line_items_delete" ON "client_invoice_line_items"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.client_invoices i
      WHERE i.id = invoice_id
        AND public.can_manage_company(i.company_id)
    )
  );

-- client_invoice_schedules: company-scoped tenant policies
CREATE POLICY "client_invoice_schedules_select" ON "client_invoice_schedules"
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY "client_invoice_schedules_insert" ON "client_invoice_schedules"
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "client_invoice_schedules_update" ON "client_invoice_schedules"
  FOR UPDATE TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "client_invoice_schedules_delete" ON "client_invoice_schedules"
  FOR DELETE TO authenticated
  USING (public.can_manage_company(company_id));

-- ============================================================================
-- Column documentation
-- ============================================================================

COMMENT ON COLUMN client_invoices.status IS 'Invoice status: draft | sent | paid | overdue | void';
COMMENT ON COLUMN client_invoices.invoice_number IS 'Human-facing number, unique per company';
COMMENT ON COLUMN client_invoices.subtotal IS 'Sum of line item amounts before tax';
COMMENT ON COLUMN client_invoices.total IS 'subtotal + tax_amount';
COMMENT ON COLUMN client_invoice_line_items.amount IS 'quantity * unit_rate (sum of duration*rate for the project)';
COMMENT ON COLUMN client_invoice_schedules.frequency IS 'Recurrence: weekly | bi_monthly | monthly';
COMMENT ON COLUMN client_invoice_schedules.next_run_date IS 'Next date the schedule generates a draft invoice';
COMMENT ON COLUMN client_invoice_schedules.auto_send IS 'When true, generated invoices are marked sent automatically';
