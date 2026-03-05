-- Canonical tenant-safe RLS bootstrap for PulseTrack.
-- This file is intentionally idempotent and is applied by `pnpm db:push`.

-- Suppress NOTICE messages from DROP IF EXISTS on fresh databases
SET client_min_messages = 'warning';

-- ============================================================================
-- RLS helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('super_admin', 'system_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('super_admin', 'system_admin', 'company_admin', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.can_access_company(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_system_admin() OR target_company_id = public.current_company_id();
$$;

CREATE OR REPLACE FUNCTION public.can_manage_company(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_system_admin()
    OR (
      target_company_id = public.current_company_id()
      AND public.current_user_role() IN ('company_admin', 'manager')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(target_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = target_project_id
      AND public.can_access_company(p.company_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_service_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_system_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_company_admin_or_manager() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_project(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_service_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_company_admin_or_manager() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_company(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_company(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_ticket(target_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tickets t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = target_ticket_id
      AND public.can_access_company(p.company_id)
      AND t.deleted_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_ticket(uuid) TO authenticated, service_role;

-- ============================================================================
-- Ensure RLS is enabled on tenant tables
-- ============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entry_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.comments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.billing_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE public.billing_rates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.company_billing_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.time_entry_billing FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.activities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- Drop previous policies so this script is repeatable
-- ============================================================================

DROP POLICY IF EXISTS "service_role_bypass" ON public.companies;
DROP POLICY IF EXISTS "companies_select_own" ON public.companies;
DROP POLICY IF EXISTS "companies_select" ON public.companies;
DROP POLICY IF EXISTS "companies_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_update" ON public.companies;
DROP POLICY IF EXISTS "companies_delete" ON public.companies;
DROP POLICY IF EXISTS "hide_deleted_companies" ON public.companies;

DROP POLICY IF EXISTS "service_role_bypass" ON public.users;
DROP POLICY IF EXISTS "users_select_self" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;
DROP POLICY IF EXISTS "authenticated_read" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "users_delete_self" ON public.users;
DROP POLICY IF EXISTS "hide_deleted_users" ON public.users;

DROP POLICY IF EXISTS "service_role_bypass" ON public.projects;
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

DROP POLICY IF EXISTS "service_role_bypass" ON public.project_members;
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_update" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;

DROP POLICY IF EXISTS "service_role_bypass" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete" ON public.tickets;

DROP POLICY IF EXISTS "service_role_bypass" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_select" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_insert" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_update" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_delete" ON public.time_entries;

DROP POLICY IF EXISTS "service_role_bypass" ON public.comments;
DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_update" ON public.comments;
DROP POLICY IF EXISTS "comments_delete" ON public.comments;

DROP POLICY IF EXISTS "service_role_bypass" ON public.billing_periods;
DROP POLICY IF EXISTS "billing_periods_select" ON public.billing_periods;
DROP POLICY IF EXISTS "billing_periods_insert" ON public.billing_periods;
DROP POLICY IF EXISTS "billing_periods_update" ON public.billing_periods;
DROP POLICY IF EXISTS "billing_periods_delete" ON public.billing_periods;

DROP POLICY IF EXISTS "service_role_bypass" ON public.billing_rates;
DROP POLICY IF EXISTS "billing_rates_select" ON public.billing_rates;
DROP POLICY IF EXISTS "billing_rates_insert" ON public.billing_rates;
DROP POLICY IF EXISTS "billing_rates_update" ON public.billing_rates;
DROP POLICY IF EXISTS "billing_rates_delete" ON public.billing_rates;

DROP POLICY IF EXISTS "service_role_bypass" ON public.company_billing_settings;
DROP POLICY IF EXISTS "company_billing_settings_select" ON public.company_billing_settings;
DROP POLICY IF EXISTS "company_billing_settings_insert" ON public.company_billing_settings;
DROP POLICY IF EXISTS "company_billing_settings_update" ON public.company_billing_settings;
DROP POLICY IF EXISTS "company_billing_settings_delete" ON public.company_billing_settings;

DROP POLICY IF EXISTS "service_role_bypass" ON public.time_entry_billing;
DROP POLICY IF EXISTS "time_entry_billing_select" ON public.time_entry_billing;
DROP POLICY IF EXISTS "time_entry_billing_insert" ON public.time_entry_billing;
DROP POLICY IF EXISTS "time_entry_billing_update" ON public.time_entry_billing;
DROP POLICY IF EXISTS "time_entry_billing_delete" ON public.time_entry_billing;

DROP POLICY IF EXISTS "service_role_bypass" ON public.ticket_history;
DROP POLICY IF EXISTS "ticket_history_select" ON public.ticket_history;
DROP POLICY IF EXISTS "ticket_history_insert" ON public.ticket_history;
DROP POLICY IF EXISTS "ticket_history_update" ON public.ticket_history;
DROP POLICY IF EXISTS "ticket_history_delete" ON public.ticket_history;

DROP POLICY IF EXISTS "service_role_bypass" ON public.activities;
DROP POLICY IF EXISTS "activities_select" ON public.activities;
DROP POLICY IF EXISTS "activities_insert" ON public.activities;
DROP POLICY IF EXISTS "activities_update" ON public.activities;
DROP POLICY IF EXISTS "activities_delete" ON public.activities;

DROP POLICY IF EXISTS "service_role_bypass" ON public.payment_history;
DROP POLICY IF EXISTS "payment_history_select" ON public.payment_history;
DROP POLICY IF EXISTS "payment_history_insert" ON public.payment_history;
DROP POLICY IF EXISTS "payment_history_update" ON public.payment_history;
DROP POLICY IF EXISTS "payment_history_delete" ON public.payment_history;
DROP POLICY IF EXISTS "Users can see payment history for their company billing periods" ON public.payment_history;
DROP POLICY IF EXISTS "Admins can create payment history entries for their company" ON public.payment_history;
DROP POLICY IF EXISTS "Only super/system admins can update payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Only super/system admins can delete payment history" ON public.payment_history;

DROP POLICY IF EXISTS "Users can upload company assets for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can view company assets for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete company assets for their company" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;

-- ============================================================================
-- Global service-role bypass for internal/admin operations
-- ============================================================================

CREATE POLICY "service_role_bypass" ON public.companies FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.users FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.projects FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.project_members FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.tickets FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.time_entries FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.comments FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.billing_periods FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.billing_rates FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.company_billing_settings FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.time_entry_billing FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.ticket_history FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.activities FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());
CREATE POLICY "service_role_bypass" ON public.payment_history FOR ALL USING (public.is_service_role()) WITH CHECK (public.is_service_role());

-- ============================================================================
-- Tenant policies by table
-- ============================================================================

-- companies

-- Allow users to read their own company via subquery (independent of current_company_id()).
-- Required so the company FK join in getUserWithCompany succeeds for newly-created users
-- before current_company_id() is resolvable.
CREATE POLICY "companies_select_own" ON public.companies
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.company_id = companies.id)
  );

CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated
  USING (public.can_access_company(id));

CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO authenticated
  USING (public.can_manage_company(id))
  WITH CHECK (public.can_manage_company(id));

CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE TO authenticated
  USING (public.is_system_admin());

-- users

-- Allow users to always read their own row.
-- Breaks the RLS bootstrap deadlock for new users where current_company_id() returns NULL.
CREATE POLICY "users_select_self" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_company(company_id)
    AND (
      public.is_system_admin()
      OR (
        public.current_user_role() = 'company_admin'
        AND role IN ('company_admin', 'manager', 'user')
      )
      OR (
        public.current_user_role() = 'manager'
        AND role IN ('manager', 'user')
      )
    )
  );

CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO authenticated
  USING (
    public.is_system_admin()
    OR (
      public.current_user_role() = 'company_admin'
      AND company_id = public.current_company_id()
      AND role IN ('company_admin', 'manager', 'user')
    )
    OR (
      public.current_user_role() = 'manager'
      AND company_id = public.current_company_id()
      AND role IN ('manager', 'user')
    )
  )
  WITH CHECK (
    public.can_manage_company(company_id)
    AND (
      public.is_system_admin()
      OR (
        public.current_user_role() = 'company_admin'
        AND role IN ('company_admin', 'manager', 'user')
      )
      OR (
        public.current_user_role() = 'manager'
        AND role IN ('manager', 'user')
      )
    )
  );

CREATE POLICY "users_delete" ON public.users
  FOR DELETE TO authenticated
  USING (
    public.is_system_admin()
    OR (
      public.current_user_role() = 'company_admin'
      AND company_id = public.current_company_id()
      AND role IN ('company_admin', 'manager', 'user')
    )
    OR (
      public.current_user_role() = 'manager'
      AND company_id = public.current_company_id()
      AND role IN ('manager', 'user')
    )
  );

-- projects
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_company(company_id)
    AND (
      public.is_company_admin_or_manager()
      OR owner_id = auth.uid()
    )
  );

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.can_access_company(company_id)
    AND (
      public.is_company_admin_or_manager()
      OR owner_id = auth.uid()
    )
  )
  WITH CHECK (public.can_access_company(company_id));

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (public.can_manage_company(company_id) OR owner_id = auth.uid());

-- project_members
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_project(project_id)
    AND public.is_company_admin_or_manager()
  );

CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE TO authenticated
  USING (
    public.can_access_project(project_id)
    AND public.is_company_admin_or_manager()
  )
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE TO authenticated
  USING (
    public.can_access_project(project_id)
    AND public.is_company_admin_or_manager()
  );

-- tickets
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_project(project_id));

CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    deleted_at IS NULL
    AND public.can_access_project(project_id)
    AND reporter_id = auth.uid()
  );

CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND public.can_access_project(project_id)
    AND (
      public.is_company_admin_or_manager()
      OR reporter_id = auth.uid()
      OR assignee_id = auth.uid()
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND public.can_access_project(project_id)
    AND (
      public.is_company_admin_or_manager()
      OR reporter_id = auth.uid()
      OR assignee_id = auth.uid()
    )
  );

CREATE POLICY "tickets_delete" ON public.tickets
  FOR DELETE TO authenticated
  USING (public.can_access_project(project_id) AND public.is_company_admin_or_manager());

-- time_entries
CREATE POLICY "time_entries_select" ON public.time_entries
  FOR SELECT TO authenticated
  USING (public.can_access_ticket(ticket_id));

CREATE POLICY "time_entries_insert" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_ticket(ticket_id)
    AND (
      user_id = auth.uid()
      OR public.is_company_admin_or_manager()
    )
  );

CREATE POLICY "time_entries_update" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (
    public.can_access_ticket(ticket_id)
    AND (
      user_id = auth.uid()
      OR public.is_company_admin_or_manager()
    )
  )
  WITH CHECK (
    public.can_access_ticket(ticket_id)
    AND (
      user_id = auth.uid()
      OR public.is_company_admin_or_manager()
    )
  );

CREATE POLICY "time_entries_delete" ON public.time_entries
  FOR DELETE TO authenticated
  USING (
    public.can_access_ticket(ticket_id)
    AND (
      user_id = auth.uid()
      OR public.is_company_admin_or_manager()
    )
  );

-- comments
CREATE POLICY "comments_select" ON public.comments
  FOR SELECT TO authenticated
  USING (public.can_access_ticket(ticket_id));

CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_ticket(ticket_id) AND user_id = auth.uid());

CREATE POLICY "comments_update" ON public.comments
  FOR UPDATE TO authenticated
  USING (
    public.can_access_ticket(ticket_id)
    AND (
      user_id = auth.uid()
      OR public.is_company_admin_or_manager()
    )
  )
  WITH CHECK (
    public.can_access_ticket(ticket_id)
    AND (
      user_id = auth.uid()
      OR public.is_company_admin_or_manager()
    )
  );

CREATE POLICY "comments_delete" ON public.comments
  FOR DELETE TO authenticated
  USING (
    public.can_access_ticket(ticket_id)
    AND (
      user_id = auth.uid()
      OR public.is_company_admin_or_manager()
    )
  );

-- billing_periods
CREATE POLICY "billing_periods_select" ON public.billing_periods
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY "billing_periods_insert" ON public.billing_periods
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "billing_periods_update" ON public.billing_periods
  FOR UPDATE TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "billing_periods_delete" ON public.billing_periods
  FOR DELETE TO authenticated
  USING (public.can_manage_company(company_id));

-- billing_rates
CREATE POLICY "billing_rates_select" ON public.billing_rates
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY "billing_rates_insert" ON public.billing_rates
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "billing_rates_update" ON public.billing_rates
  FOR UPDATE TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "billing_rates_delete" ON public.billing_rates
  FOR DELETE TO authenticated
  USING (public.can_manage_company(company_id));

-- company_billing_settings
CREATE POLICY "company_billing_settings_select" ON public.company_billing_settings
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY "company_billing_settings_insert" ON public.company_billing_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "company_billing_settings_update" ON public.company_billing_settings
  FOR UPDATE TO authenticated
  USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY "company_billing_settings_delete" ON public.company_billing_settings
  FOR DELETE TO authenticated
  USING (public.can_manage_company(company_id));

-- time_entry_billing
CREATE POLICY "time_entry_billing_select" ON public.time_entry_billing
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.billing_periods bp
      WHERE bp.id = billing_period_id
        AND public.can_access_company(bp.company_id)
    )
  );

CREATE POLICY "time_entry_billing_insert" ON public.time_entry_billing
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.billing_periods bp
      WHERE bp.id = billing_period_id
        AND public.can_manage_company(bp.company_id)
    )
  );

CREATE POLICY "time_entry_billing_update" ON public.time_entry_billing
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.billing_periods bp
      WHERE bp.id = billing_period_id
        AND public.can_manage_company(bp.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.billing_periods bp
      WHERE bp.id = billing_period_id
        AND public.can_manage_company(bp.company_id)
    )
  );

CREATE POLICY "time_entry_billing_delete" ON public.time_entry_billing
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.billing_periods bp
      WHERE bp.id = billing_period_id
        AND public.can_manage_company(bp.company_id)
    )
  );

-- ticket_history
CREATE POLICY "ticket_history_select" ON public.ticket_history
  FOR SELECT TO authenticated
  USING (public.can_access_ticket(ticket_id));

CREATE POLICY "ticket_history_insert" ON public.ticket_history
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_ticket(ticket_id) AND user_id = auth.uid());

CREATE POLICY "ticket_history_update" ON public.ticket_history
  FOR UPDATE TO authenticated
  USING (public.can_access_ticket(ticket_id) AND public.is_company_admin_or_manager())
  WITH CHECK (public.can_access_ticket(ticket_id));

CREATE POLICY "ticket_history_delete" ON public.ticket_history
  FOR DELETE TO authenticated
  USING (public.can_access_ticket(ticket_id) AND public.is_company_admin_or_manager());

-- activities
CREATE POLICY "activities_select" ON public.activities
  FOR SELECT TO authenticated
  USING (
    (
      project_id IS NOT NULL
      AND public.can_access_project(project_id)
    )
    OR (
      ticket_id IS NOT NULL
      AND public.can_access_ticket(ticket_id)
    )
    OR user_id = auth.uid()
    OR target_user_id = auth.uid()
  );

CREATE POLICY "activities_insert" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      project_id IS NULL OR public.can_access_project(project_id)
    )
    AND (
      ticket_id IS NULL OR public.can_access_ticket(ticket_id)
    )
  );

CREATE POLICY "activities_update" ON public.activities
  FOR UPDATE TO authenticated
  USING (
    public.is_company_admin_or_manager()
    AND (
      (project_id IS NOT NULL AND public.can_access_project(project_id))
      OR (ticket_id IS NOT NULL AND public.can_access_ticket(ticket_id))
      OR user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_company_admin_or_manager()
    AND (
      project_id IS NULL OR public.can_access_project(project_id)
    )
    AND (
      ticket_id IS NULL OR public.can_access_ticket(ticket_id)
    )
  );

CREATE POLICY "activities_delete" ON public.activities
  FOR DELETE TO authenticated
  USING (
    public.is_company_admin_or_manager()
    AND (
      (project_id IS NOT NULL AND public.can_access_project(project_id))
      OR (ticket_id IS NOT NULL AND public.can_access_ticket(ticket_id))
      OR user_id = auth.uid()
    )
  );

-- payment_history
CREATE POLICY "payment_history_select" ON public.payment_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.billing_periods bp
      WHERE bp.id = billing_period_id
        AND public.can_access_company(bp.company_id)
    )
  );

CREATE POLICY "payment_history_insert" ON public.payment_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.billing_periods bp
      WHERE bp.id = billing_period_id
        AND public.can_manage_company(bp.company_id)
    )
    AND (
      user_id = auth.uid()
      OR public.is_company_admin_or_manager()
    )
  );

CREATE POLICY "payment_history_update" ON public.payment_history
  FOR UPDATE TO authenticated
  USING (
    public.is_system_admin()
    AND EXISTS (
      SELECT 1
      FROM public.billing_periods bp
      WHERE bp.id = billing_period_id
        AND public.can_access_company(bp.company_id)
    )
  )
  WITH CHECK (public.is_system_admin());

CREATE POLICY "payment_history_delete" ON public.payment_history
  FOR DELETE TO authenticated
  USING (
    public.is_system_admin()
    AND EXISTS (
      SELECT 1
      FROM public.billing_periods bp
      WHERE bp.id = billing_period_id
        AND public.can_access_company(bp.company_id)
    )
  );

-- ============================================================================
-- Storage bucket and object policies (company assets)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload company assets for their company" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'company-logos'
    AND (storage.foldername(name))[2] = public.current_company_id()::text
  );

CREATE POLICY "Users can view company assets for their company" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'company-logos'
    AND (storage.foldername(name))[2] = public.current_company_id()::text
  );

CREATE POLICY "Users can delete company assets for their company" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'company-logos'
    AND (storage.foldername(name))[2] = public.current_company_id()::text
  );

CREATE POLICY "Public can view company assets" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'company-logos'
  );
