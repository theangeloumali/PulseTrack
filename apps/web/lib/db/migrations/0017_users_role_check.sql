-- Constrain users.role to the known role hierarchy at the database layer.
-- The signup-complete API already forces a safe role, but a CHECK constraint
-- is defense-in-depth: any path that writes users.role (service-role inserts,
-- admin tooling, manual SQL) can no longer persist an unknown/privileged
-- value. Idempotent: guarded via pg_constraint so it is safe to re-run.

SET client_min_messages = 'warning';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE "public"."users"
      ADD CONSTRAINT "users_role_check"
      CHECK ("role" IN ('super_admin', 'system_admin', 'company_admin', 'manager', 'user'));
  END IF;
END
$$;

COMMENT ON CONSTRAINT "users_role_check" ON "public"."users" IS
  'Restricts users.role to the defined role hierarchy (super_admin > system_admin > company_admin > manager > user).';
