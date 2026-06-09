-- BUGFIX: company_admin/manager/reporter/assignee could not delete a ticket.
-- The soft-delete (UPDATE ... SET deleted_at = now()) was rejected with 403 because
-- the tickets_update RLS policy's WITH CHECK required `deleted_at IS NULL` on the NEW
-- row — which is exactly what a soft-delete violates.
--
-- Fix: keep `deleted_at IS NULL` in USING (you may only modify a LIVE ticket you can
-- access/own/manage) but drop it from WITH CHECK so the row may transition to deleted.

SET client_min_messages = 'warning';

DROP POLICY IF EXISTS "tickets_update" ON public.tickets;

CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND can_access_project(project_id)
    AND (
      is_company_admin_or_manager()
      OR reporter_id = auth.uid()
      OR assignee_id = auth.uid()
    )
  )
  WITH CHECK (
    can_access_project(project_id)
    AND (
      is_company_admin_or_manager()
      OR reporter_id = auth.uid()
      OR assignee_id = auth.uid()
    )
  );
