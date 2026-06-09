-- BUGFIX (cont.): even after relaxing tickets_update WITH CHECK, the soft-delete
-- (UPDATE ... SET deleted_at = now()) still returns 42501 "new row violates RLS"
-- — a contradictory edge case (the CHECK is a logical subset of the passing USING,
-- with no triggers and full column privileges). Rather than fight the PostgREST/RLS
-- quirk, route ticket soft-delete through a SECURITY DEFINER RPC — the SAME pattern
-- already used for soft_delete_company / soft_delete_user / archive_user.
--
-- Authorization is preserved: the function checks can_access_project() (which uses
-- auth.uid(), so it is still scoped to the calling user) before mutating.

SET client_min_messages = 'warning';

CREATE OR REPLACE FUNCTION public.soft_delete_ticket(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT project_id INTO v_project_id
  FROM public.tickets
  WHERE id = p_ticket_id AND deleted_at IS NULL;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Ticket not found or already deleted';
  END IF;

  -- Same company/project scoping the RLS policy would enforce (uses auth.uid()).
  IF NOT public.can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'Not authorized to delete this ticket';
  END IF;

  UPDATE public.tickets
  SET deleted_at = now(), updated_at = now()
  WHERE id = p_ticket_id;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_ticket(uuid) TO authenticated;
