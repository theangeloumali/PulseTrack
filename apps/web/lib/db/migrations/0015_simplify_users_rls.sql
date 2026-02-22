-- Simplify users RLS policies to avoid any recursion issues
-- Use a simpler approach that doesn't require subqueries on the same table

-- Drop all existing policies
DROP POLICY IF EXISTS "users_select_own" ON "users";
DROP POLICY IF EXISTS "users_select_same_company" ON "users";
DROP POLICY IF EXISTS "service_role_users_all" ON "users";
DROP POLICY IF EXISTS "users_update_own" ON "users";
DROP POLICY IF EXISTS "admins_update_company_users" ON "users";
DROP POLICY IF EXISTS "authenticated_users_select" ON "users";

-- Create simplified policies

-- Policy 1: Service role can do everything (for API operations)
CREATE POLICY "service_role_bypass" ON "users"
  FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Policy 2: Authenticated users can read non-deleted users
-- This is simple and avoids recursion
CREATE POLICY "authenticated_read" ON "users"
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
  );

-- Policy 3: Users can update their own profile
CREATE POLICY "users_update_self" ON "users"
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Users can delete (soft delete) their own profile
CREATE POLICY "users_delete_self" ON "users"
  FOR DELETE
  USING (auth.uid() = id);