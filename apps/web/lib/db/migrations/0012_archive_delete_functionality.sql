-- Add archive and delete functionality to companies and users

-- Add status and archive/delete columns to companies table
ALTER TABLE "companies" ADD COLUMN "status" text DEFAULT 'active';
ALTER TABLE "companies" ADD COLUMN "archived_at" timestamp with time zone;
ALTER TABLE "companies" ADD COLUMN "archived_by" uuid;
ALTER TABLE "companies" ADD COLUMN "deleted_at" timestamp with time zone;

-- Add archive/delete columns to users table
ALTER TABLE "users" ADD COLUMN "archived_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "archived_by" uuid;
ALTER TABLE "users" ADD COLUMN "previous_status" text;
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;

-- Create indexes for performance
CREATE INDEX "companies_status_idx" ON "companies" USING btree ("status");
CREATE INDEX "companies_archived_at_idx" ON "companies" USING btree ("archived_at");
CREATE INDEX "companies_deleted_at_idx" ON "companies" USING btree ("deleted_at");
CREATE INDEX "users_archived_at_idx" ON "users" USING btree ("archived_at");
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");

-- Add foreign key constraints
ALTER TABLE "companies" ADD CONSTRAINT "companies_archived_by_users_id_fk" 
  FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "users" ADD CONSTRAINT "users_archived_by_users_id_fk" 
  FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

-- Update RLS policies to handle archived/deleted entities

-- Policy for companies: Don't show deleted companies
CREATE POLICY "hide_deleted_companies" ON "companies"
  FOR SELECT
  USING (deleted_at IS NULL);

-- Policy for users: Don't show deleted users
CREATE POLICY "hide_deleted_users" ON "users"
  FOR SELECT
  USING (deleted_at IS NULL);

-- Function to archive a company and its users
CREATE OR REPLACE FUNCTION archive_company(
  p_company_id uuid,
  p_archived_by uuid
)
RETURNS void AS $$
BEGIN
  -- Archive the company
  UPDATE companies 
  SET 
    status = 'archived',
    archived_at = NOW(),
    archived_by = p_archived_by,
    updated_at = NOW()
  WHERE id = p_company_id;

  -- Archive all users in the company
  UPDATE users
  SET
    previous_status = status,
    status = 'inactive',
    archived_at = NOW(),
    archived_by = p_archived_by,
    updated_at = NOW()
  WHERE company_id = p_company_id
    AND deleted_at IS NULL;

  -- Log the activity
  INSERT INTO activities (
    type,
    user_id,
    title,
    description,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    'company_archived',
    p_archived_by,
    'Company Archived',
    'Company and all its users have been archived',
    jsonb_build_object('company_id', p_company_id),
    NOW(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a company and its users
CREATE OR REPLACE FUNCTION restore_company(
  p_company_id uuid,
  p_restored_by uuid
)
RETURNS void AS $$
BEGIN
  -- Restore the company
  UPDATE companies 
  SET 
    status = 'active',
    archived_at = NULL,
    archived_by = NULL,
    updated_at = NOW()
  WHERE id = p_company_id;

  -- Restore all users in the company
  UPDATE users
  SET
    status = COALESCE(previous_status, 'active'),
    previous_status = NULL,
    archived_at = NULL,
    archived_by = NULL,
    updated_at = NOW()
  WHERE company_id = p_company_id
    AND archived_at IS NOT NULL
    AND deleted_at IS NULL;

  -- Log the activity
  INSERT INTO activities (
    type,
    user_id,
    title,
    description,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    'company_restored',
    p_restored_by,
    'Company Restored',
    'Company and all its users have been restored',
    jsonb_build_object('company_id', p_company_id),
    NOW(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a company
CREATE OR REPLACE FUNCTION soft_delete_company(
  p_company_id uuid,
  p_deleted_by uuid
)
RETURNS void AS $$
BEGIN
  -- Soft delete the company
  UPDATE companies 
  SET 
    status = 'deleted',
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_company_id;

  -- Soft delete all users in the company
  UPDATE users
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE company_id = p_company_id;

  -- Log the activity
  INSERT INTO activities (
    type,
    user_id,
    title,
    description,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    'company_deleted',
    p_deleted_by,
    'Company Deleted',
    'Company and all its data have been marked for deletion',
    jsonb_build_object('company_id', p_company_id),
    NOW(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive a user
CREATE OR REPLACE FUNCTION archive_user(
  p_user_id uuid,
  p_archived_by uuid
)
RETURNS void AS $$
BEGIN
  -- Archive the user
  UPDATE users
  SET
    previous_status = status,
    status = 'inactive',
    archived_at = NOW(),
    archived_by = p_archived_by,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the activity
  INSERT INTO activities (
    type,
    user_id,
    target_user_id,
    title,
    description,
    created_at,
    updated_at
  ) VALUES (
    'user_archived',
    p_archived_by,
    p_user_id,
    'User Archived',
    'User has been archived',
    NOW(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a user
CREATE OR REPLACE FUNCTION restore_user(
  p_user_id uuid,
  p_restored_by uuid
)
RETURNS void AS $$
BEGIN
  -- Restore the user
  UPDATE users
  SET
    status = COALESCE(previous_status, 'active'),
    previous_status = NULL,
    archived_at = NULL,
    archived_by = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the activity
  INSERT INTO activities (
    type,
    user_id,
    target_user_id,
    title,
    description,
    created_at,
    updated_at
  ) VALUES (
    'user_restored',
    p_restored_by,
    p_user_id,
    'User Restored',
    'User has been restored',
    NOW(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a user
CREATE OR REPLACE FUNCTION soft_delete_user(
  p_user_id uuid,
  p_deleted_by uuid
)
RETURNS void AS $$
BEGIN
  -- Soft delete the user
  UPDATE users
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the activity
  INSERT INTO activities (
    type,
    user_id,
    target_user_id,
    title,
    description,
    created_at,
    updated_at
  ) VALUES (
    'user_deleted',
    p_deleted_by,
    p_user_id,
    'User Deleted',
    'User has been marked for deletion',
    NOW(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION archive_company TO authenticated;
GRANT EXECUTE ON FUNCTION restore_company TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_company TO authenticated;
GRANT EXECUTE ON FUNCTION archive_user TO authenticated;
GRANT EXECUTE ON FUNCTION restore_user TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_user TO authenticated;

-- Comments for documentation
COMMENT ON COLUMN companies.status IS 'Company status: active, archived, or deleted';
COMMENT ON COLUMN companies.archived_at IS 'Timestamp when the company was archived';
COMMENT ON COLUMN companies.archived_by IS 'User ID who archived the company';
COMMENT ON COLUMN companies.deleted_at IS 'Timestamp when the company was soft deleted';

COMMENT ON COLUMN users.archived_at IS 'Timestamp when the user was archived';
COMMENT ON COLUMN users.archived_by IS 'User ID who archived this user';
COMMENT ON COLUMN users.previous_status IS 'Previous status before archiving (for restoration)';
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when the user was soft deleted';