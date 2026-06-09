-- Archive/delete reconciliation (SAFE supersede of the never-applied 0012).
-- Adds the status/archive/delete columns + RPCs that the admin routes expect.
-- IDEMPOTENT. Deliberately OMITS 0012's permissive "hide_deleted_*" RLS policies:
-- those used `USING (deleted_at IS NULL)` with no role scope, which would OR-in
-- row visibility on top of the tight company-scoped policies and leak rows
-- cross-tenant. Admin routes already filter `deleted_at` explicitly in-query.

SET client_min_messages = 'warning';

-- Columns: companies
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "archived_by" uuid;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;

-- Columns: users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "archived_by" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "previous_status" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;

-- Indexes
CREATE INDEX IF NOT EXISTS "companies_status_idx" ON "companies"("status");
CREATE INDEX IF NOT EXISTS "companies_archived_at_idx" ON "companies"("archived_at");
CREATE INDEX IF NOT EXISTS "companies_deleted_at_idx" ON "companies"("deleted_at");
CREATE INDEX IF NOT EXISTS "users_archived_at_idx" ON "users"("archived_at");
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users"("deleted_at");

-- FK constraints (guarded)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_archived_by_users_id_fk') THEN
    ALTER TABLE "companies" ADD CONSTRAINT "companies_archived_by_users_id_fk"
      FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE set null;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_archived_by_users_id_fk') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_archived_by_users_id_fk"
      FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE set null;
  END IF;
END $$;

-- RPCs (idempotent CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION archive_company(p_company_id uuid, p_archived_by uuid)
RETURNS void AS $$
BEGIN
  UPDATE companies SET status='archived', archived_at=NOW(), archived_by=p_archived_by, updated_at=NOW() WHERE id=p_company_id;
  UPDATE users SET previous_status=status, status='inactive', archived_at=NOW(), archived_by=p_archived_by, updated_at=NOW()
    WHERE company_id=p_company_id AND deleted_at IS NULL;
  INSERT INTO activities (type,user_id,title,description,metadata,created_at,updated_at)
    VALUES ('company_archived',p_archived_by,'Company Archived','Company and all its users have been archived',
            jsonb_build_object('company_id',p_company_id),NOW(),NOW());
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION restore_company(p_company_id uuid, p_restored_by uuid)
RETURNS void AS $$
BEGIN
  UPDATE companies SET status='active', archived_at=NULL, archived_by=NULL, updated_at=NOW() WHERE id=p_company_id;
  UPDATE users SET status=COALESCE(previous_status,'active'), previous_status=NULL, archived_at=NULL, archived_by=NULL, updated_at=NOW()
    WHERE company_id=p_company_id AND archived_at IS NOT NULL AND deleted_at IS NULL;
  INSERT INTO activities (type,user_id,title,description,metadata,created_at,updated_at)
    VALUES ('company_restored',p_restored_by,'Company Restored','Company and all its users have been restored',
            jsonb_build_object('company_id',p_company_id),NOW(),NOW());
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION soft_delete_company(p_company_id uuid, p_deleted_by uuid)
RETURNS void AS $$
BEGIN
  UPDATE companies SET status='deleted', deleted_at=NOW(), updated_at=NOW() WHERE id=p_company_id;
  UPDATE users SET deleted_at=NOW(), updated_at=NOW() WHERE company_id=p_company_id;
  INSERT INTO activities (type,user_id,title,description,metadata,created_at,updated_at)
    VALUES ('company_deleted',p_deleted_by,'Company Deleted','Company and all its data have been marked for deletion',
            jsonb_build_object('company_id',p_company_id),NOW(),NOW());
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION archive_user(p_user_id uuid, p_archived_by uuid)
RETURNS void AS $$
BEGIN
  UPDATE users SET previous_status=status, status='inactive', archived_at=NOW(), archived_by=p_archived_by, updated_at=NOW() WHERE id=p_user_id;
  INSERT INTO activities (type,user_id,target_user_id,title,description,created_at,updated_at)
    VALUES ('user_archived',p_archived_by,p_user_id,'User Archived','User has been archived',NOW(),NOW());
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION restore_user(p_user_id uuid, p_restored_by uuid)
RETURNS void AS $$
BEGIN
  UPDATE users SET status=COALESCE(previous_status,'active'), previous_status=NULL, archived_at=NULL, archived_by=NULL, updated_at=NOW() WHERE id=p_user_id;
  INSERT INTO activities (type,user_id,target_user_id,title,description,created_at,updated_at)
    VALUES ('user_restored',p_restored_by,p_user_id,'User Restored','User has been restored',NOW(),NOW());
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION soft_delete_user(p_user_id uuid, p_deleted_by uuid)
RETURNS void AS $$
BEGIN
  UPDATE users SET deleted_at=NOW(), updated_at=NOW() WHERE id=p_user_id;
  INSERT INTO activities (type,user_id,target_user_id,title,description,created_at,updated_at)
    VALUES ('user_deleted',p_deleted_by,p_user_id,'User Deleted','User has been marked for deletion',NOW(),NOW());
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION archive_company TO authenticated;
GRANT EXECUTE ON FUNCTION restore_company TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_company TO authenticated;
GRANT EXECUTE ON FUNCTION archive_user TO authenticated;
GRANT EXECUTE ON FUNCTION restore_user TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_user TO authenticated;
