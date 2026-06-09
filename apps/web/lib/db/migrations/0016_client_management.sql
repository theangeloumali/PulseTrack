-- Client management: permanent schema for clients + client_contacts and
-- a projects.client_id link. Mirrors the tenant-safe RLS patterns in
-- rls_policies.sql (helper functions is_service_role / can_access_company /
-- can_manage_company). Idempotent so it is safe to re-run.

SET client_min_messages = 'warning';

-- ============================================================================
-- Tables
-- ============================================================================

-- Clients (top-level, company-scoped)
CREATE TABLE IF NOT EXISTS "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "status" text DEFAULT 'active',
  "owner_id" uuid,
  "contact_email" text,
  "contact_phone" text,
  "website" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Client contacts (child of clients)
CREATE TABLE IF NOT EXISTS "client_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "title" text,
  "is_primary" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================================================
-- Foreign keys
-- ============================================================================

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_owner_id_users_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "client_contacts"
  ADD CONSTRAINT "client_contacts_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
  ON DELETE cascade ON UPDATE no action;

-- ============================================================================
-- projects.client_id link
-- ============================================================================

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "client_id" uuid;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
  ON DELETE set null ON UPDATE no action;

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS "clients_company_id_idx" ON "clients" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "clients_owner_id_idx" ON "clients" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "client_contacts_client_id_idx" ON "client_contacts" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "projects_client_id_idx" ON "projects" USING btree ("client_id");

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" FORCE ROW LEVEL SECURITY;
ALTER TABLE "client_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_contacts" FORCE ROW LEVEL SECURITY;

-- Drop previous policies so this script is repeatable
DROP POLICY IF EXISTS "service_role_bypass" ON "clients";
DROP POLICY IF EXISTS "clients_select" ON "clients";
DROP POLICY IF EXISTS "clients_insert" ON "clients";
DROP POLICY IF EXISTS "clients_update" ON "clients";
DROP POLICY IF EXISTS "clients_delete" ON "clients";

DROP POLICY IF EXISTS "service_role_bypass" ON "client_contacts";
DROP POLICY IF EXISTS "client_contacts_select" ON "client_contacts";
DROP POLICY IF EXISTS "client_contacts_insert" ON "client_contacts";
DROP POLICY IF EXISTS "client_contacts_update" ON "client_contacts";
DROP POLICY IF EXISTS "client_contacts_delete" ON "client_contacts";

-- Service-role bypass for internal/admin operations
CREATE POLICY "service_role_bypass" ON "clients"
  FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON "client_contacts"
  FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());

-- clients: company-scoped tenant policies
CREATE POLICY "clients_select" ON "clients"
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY "clients_insert" ON "clients"
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "clients_update" ON "clients"
  FOR UPDATE TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "clients_delete" ON "clients"
  FOR DELETE TO authenticated
  USING (public.can_manage_company(company_id));

-- client_contacts: scoped via parent client's company
CREATE POLICY "client_contacts_select" ON "client_contacts"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = client_id
        AND public.can_access_company(c.company_id)
    )
  );

CREATE POLICY "client_contacts_insert" ON "client_contacts"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = client_id
        AND public.can_manage_company(c.company_id)
    )
  );

CREATE POLICY "client_contacts_update" ON "client_contacts"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = client_id
        AND public.can_manage_company(c.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = client_id
        AND public.can_manage_company(c.company_id)
    )
  );

CREATE POLICY "client_contacts_delete" ON "client_contacts"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = client_id
        AND public.can_manage_company(c.company_id)
    )
  );

-- ============================================================================
-- Column documentation
-- ============================================================================

COMMENT ON COLUMN clients.status IS 'Client status: active or inactive';
COMMENT ON COLUMN clients.owner_id IS 'User who owns/manages this client relationship';
COMMENT ON COLUMN projects.client_id IS 'Optional client this project belongs to';
COMMENT ON COLUMN client_contacts.is_primary IS 'Whether this is the primary point of contact for the client';
