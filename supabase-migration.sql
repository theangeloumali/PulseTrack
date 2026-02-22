-- Add archive and delete functionality columns to companies and users
-- This is a safe version that checks if columns exist before adding them

-- Add columns to companies table (only if they don't exist)
DO $$ 
BEGIN
  -- Add status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'status') THEN
    ALTER TABLE companies ADD COLUMN status text DEFAULT 'active';
  END IF;
  
  -- Add archived_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'archived_at') THEN
    ALTER TABLE companies ADD COLUMN archived_at timestamp with time zone;
  END IF;
  
  -- Add archived_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'archived_by') THEN
    ALTER TABLE companies ADD COLUMN archived_by uuid;
  END IF;
  
  -- Add deleted_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'deleted_at') THEN
    ALTER TABLE companies ADD COLUMN deleted_at timestamp with time zone;
  END IF;
END $$;

-- Add columns to users table (only if they don't exist)
DO $$ 
BEGIN
  -- Add archived_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'archived_at') THEN
    ALTER TABLE users ADD COLUMN archived_at timestamp with time zone;
  END IF;
  
  -- Add archived_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'archived_by') THEN
    ALTER TABLE users ADD COLUMN archived_by uuid;
  END IF;
  
  -- Add previous_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'previous_status') THEN
    ALTER TABLE users ADD COLUMN previous_status text;
  END IF;
  
  -- Add deleted_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'deleted_at') THEN
    ALTER TABLE users ADD COLUMN deleted_at timestamp with time zone;
  END IF;
END $$;

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS companies_status_idx ON companies(status);
CREATE INDEX IF NOT EXISTS companies_archived_at_idx ON companies(archived_at);
CREATE INDEX IF NOT EXISTS companies_deleted_at_idx ON companies(deleted_at);
CREATE INDEX IF NOT EXISTS users_archived_at_idx ON users(archived_at);
CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON users(deleted_at);

-- Create archive company function
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create restore company function
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create soft delete company function
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create archive user function
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create restore user function
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create soft delete user function
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION archive_company TO authenticated;
GRANT EXECUTE ON FUNCTION restore_company TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_company TO authenticated;
GRANT EXECUTE ON FUNCTION archive_user TO authenticated;
GRANT EXECUTE ON FUNCTION restore_user TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_user TO authenticated;

-- Verify the columns were added
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'companies')
    AND column_name IN ('status', 'archived_at', 'archived_by', 'deleted_at', 'previous_status')
ORDER BY table_name, column_name;