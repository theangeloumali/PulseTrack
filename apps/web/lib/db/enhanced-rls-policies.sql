-- Enhanced Row Level Security (RLS) Policies with Project-Based Access Control
-- This file contains enhanced CRUD policies that implement proper access control
-- based on project membership, visibility settings, and user roles

-- ==============================================
-- HELPER FUNCTIONS FOR ACCESS CONTROL
-- ==============================================

-- Function to check if a user is a member of a project
CREATE OR REPLACE FUNCTION is_project_member(project_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can access a project based on visibility and membership
CREATE OR REPLACE FUNCTION can_access_project(project_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  project_visibility text;
  user_company_id uuid;
  project_company_id uuid;
  is_member boolean;
BEGIN
  -- Get project and user information
  SELECT visibility, company_id INTO project_visibility, project_company_id
  FROM projects WHERE id = project_uuid;
  
  SELECT company_id INTO user_company_id
  FROM users WHERE id = user_uuid;
  
  -- Check if user is a member
  SELECT is_project_member(project_uuid, user_uuid) INTO is_member;
  
  -- Public projects: anyone can access
  IF project_visibility = 'public' THEN
    RETURN true;
  END IF;
  
  -- Company projects: same company members can access
  IF project_visibility = 'company' AND user_company_id = project_company_id THEN
    RETURN true;
  END IF;
  
  -- Private projects: only project members can access
  IF project_visibility = 'private' AND is_member THEN
    RETURN true;
  END IF;
  
  -- Super admins and system admins can access everything
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_uuid 
    AND role IN ('super_admin', 'system_admin')
  ) THEN
    RETURN true;
  END IF;
  
  -- Company admins can access projects in their company
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_uuid 
    AND role = 'company_admin'
    AND company_id = project_company_id
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- DROP EXISTING PERMISSIVE POLICIES
-- ==============================================

-- Drop existing projects policies
DROP POLICY IF EXISTS "Allow all users to select from projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to insert into projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to update projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from projects" ON projects;

-- Drop existing project_members policies
DROP POLICY IF EXISTS "Allow all users to select from project_members" ON project_members;
DROP POLICY IF EXISTS "Allow authenticated users to insert into project_members" ON project_members;
DROP POLICY IF EXISTS "Allow authenticated users to update project_members" ON project_members;
DROP POLICY IF EXISTS "Allow authenticated users to delete from project_members" ON project_members;

-- Drop existing tickets policies
DROP POLICY IF EXISTS "Allow all users to select from tickets" ON tickets;
DROP POLICY IF EXISTS "Allow authenticated users to insert into tickets" ON tickets;
DROP POLICY IF EXISTS "Allow authenticated users to update tickets" ON tickets;
DROP POLICY IF EXISTS "Allow authenticated users to delete from tickets" ON tickets;

-- Drop existing ticket_history policies
DROP POLICY IF EXISTS "Allow all users to select from ticket_history" ON ticket_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert into ticket_history" ON ticket_history;
DROP POLICY IF EXISTS "Allow authenticated users to update ticket_history" ON ticket_history;
DROP POLICY IF EXISTS "Allow authenticated users to delete from ticket_history" ON ticket_history;

-- Drop existing time_entries policies
DROP POLICY IF EXISTS "Allow all users to select from time_entries" ON time_entries;
DROP POLICY IF EXISTS "Allow authenticated users to insert into time_entries" ON time_entries;
DROP POLICY IF EXISTS "Allow authenticated users to update time_entries" ON time_entries;
DROP POLICY IF EXISTS "Allow authenticated users to delete from time_entries" ON time_entries;

-- Drop existing comments policies
DROP POLICY IF EXISTS "Allow all users to select from comments" ON comments;
DROP POLICY IF EXISTS "Allow authenticated users to insert into comments" ON comments;
DROP POLICY IF EXISTS "Allow authenticated users to update comments" ON comments;
DROP POLICY IF EXISTS "Allow authenticated users to delete from comments" ON comments;

-- ==============================================
-- ENHANCED PROJECTS TABLE POLICIES
-- ==============================================

-- Projects: SELECT policy - based on visibility and membership
CREATE POLICY "Users can access projects based on visibility and membership" 
ON projects FOR SELECT TO authenticated 
USING (can_access_project(id, auth.uid()));

-- Projects: INSERT policy - users can create projects in their company
CREATE POLICY "Users can create projects in their company" 
ON projects FOR INSERT TO authenticated 
WITH CHECK (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'system_admin'))
);

-- Projects: UPDATE policy - project owners, company admins, or higher roles
CREATE POLICY "Users can update projects they own or have admin access to" 
ON projects FOR UPDATE TO authenticated 
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role IN ('super_admin', 'system_admin')
      OR (role = 'company_admin' AND company_id = projects.company_id)
    )
  )
)
WITH CHECK (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'system_admin'))
);

-- Projects: DELETE policy - project owners, company admins, or higher roles
CREATE POLICY "Users can delete projects they own or have admin access to" 
ON projects FOR DELETE TO authenticated 
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role IN ('super_admin', 'system_admin')
      OR (role = 'company_admin' AND company_id = projects.company_id)
    )
  )
);

-- ==============================================
-- PROJECT MEMBERS TABLE POLICIES
-- ==============================================

-- Project Members: SELECT policy - can see members of accessible projects
CREATE POLICY "Users can see members of accessible projects" 
ON project_members FOR SELECT TO authenticated 
USING (can_access_project(project_id, auth.uid()));

-- Project Members: INSERT policy - project owners and admins can add members
CREATE POLICY "Project owners and admins can add members" 
ON project_members FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND (
          u.role IN ('super_admin', 'system_admin')
          OR (u.role = 'company_admin' AND u.company_id = p.company_id)
        )
      )
    )
  )
);

-- Project Members: UPDATE policy - project owners and admins can update member roles
CREATE POLICY "Project owners and admins can update member roles" 
ON project_members FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND (
          u.role IN ('super_admin', 'system_admin')
          OR (u.role = 'company_admin' AND u.company_id = p.company_id)
        )
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND (
          u.role IN ('super_admin', 'system_admin')
          OR (u.role = 'company_admin' AND u.company_id = p.company_id)
        )
      )
    )
  )
);

-- Project Members: DELETE policy - project owners and admins can remove members
CREATE POLICY "Project owners and admins can remove members" 
ON project_members FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND (
          u.role IN ('super_admin', 'system_admin')
          OR (u.role = 'company_admin' AND u.company_id = p.company_id)
        )
      )
    )
  )
);

-- ==============================================
-- TICKETS TABLE POLICIES
-- ==============================================

-- Tickets: SELECT policy - can see tickets in accessible projects
CREATE POLICY "Users can see tickets in accessible projects" 
ON tickets FOR SELECT TO authenticated 
USING (can_access_project(project_id, auth.uid()));

-- Tickets: INSERT policy - can create tickets in accessible projects
CREATE POLICY "Users can create tickets in accessible projects" 
ON tickets FOR INSERT TO authenticated 
WITH CHECK (can_access_project(project_id, auth.uid()));

-- Tickets: UPDATE policy - can update tickets in accessible projects
CREATE POLICY "Users can update tickets in accessible projects" 
ON tickets FOR UPDATE TO authenticated 
USING (can_access_project(project_id, auth.uid()))
WITH CHECK (can_access_project(project_id, auth.uid()));

-- Tickets: DELETE policy - can delete tickets they created or if they have admin access
CREATE POLICY "Users can delete tickets they created or have admin access to" 
ON tickets FOR DELETE TO authenticated 
USING (
  reporter_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND (
          u.role IN ('super_admin', 'system_admin')
          OR (u.role = 'company_admin' AND u.company_id = p.company_id)
        )
      )
    )
  )
);

-- ==============================================
-- TICKET HISTORY TABLE POLICIES
-- ==============================================

-- Ticket History: SELECT policy - can see history of accessible tickets
CREATE POLICY "Users can see history of accessible tickets" 
ON ticket_history FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id
    AND can_access_project(t.project_id, auth.uid())
  )
);

-- Ticket History: INSERT policy - system can insert history for accessible tickets
CREATE POLICY "System can insert history for accessible tickets" 
ON ticket_history FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id
    AND can_access_project(t.project_id, auth.uid())
  )
);

-- Ticket History: UPDATE/DELETE policies - only admins
CREATE POLICY "Only admins can update ticket history" 
ON ticket_history FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
);

CREATE POLICY "Only admins can delete ticket history" 
ON ticket_history FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
);

-- ==============================================
-- TIME ENTRIES TABLE POLICIES
-- ==============================================

-- Time Entries: SELECT policy - can see time entries for accessible tickets
CREATE POLICY "Users can see time entries for accessible tickets" 
ON time_entries FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id
    AND can_access_project(t.project_id, auth.uid())
  )
);

-- Time Entries: INSERT policy - can create time entries for accessible tickets
CREATE POLICY "Users can create time entries for accessible tickets" 
ON time_entries FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id
    AND can_access_project(t.project_id, auth.uid())
  )
);

-- Time Entries: UPDATE policy - can update own time entries or if admin
CREATE POLICY "Users can update own time entries or if admin" 
ON time_entries FOR UPDATE TO authenticated 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users u
    JOIN tickets t ON t.id = ticket_id
    JOIN projects p ON p.id = t.project_id
    WHERE u.id = auth.uid()
    AND (
      u.role IN ('super_admin', 'system_admin')
      OR (u.role = 'company_admin' AND u.company_id = p.company_id)
      OR p.owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id
    AND can_access_project(t.project_id, auth.uid())
  )
);

-- Time Entries: DELETE policy - can delete own time entries or if admin
CREATE POLICY "Users can delete own time entries or if admin" 
ON time_entries FOR DELETE TO authenticated 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users u
    JOIN tickets t ON t.id = ticket_id
    JOIN projects p ON p.id = t.project_id
    WHERE u.id = auth.uid()
    AND (
      u.role IN ('super_admin', 'system_admin')
      OR (u.role = 'company_admin' AND u.company_id = p.company_id)
      OR p.owner_id = auth.uid()
    )
  )
);

-- ==============================================
-- COMMENTS TABLE POLICIES
-- ==============================================

-- Comments: SELECT policy - can see comments on accessible tickets
CREATE POLICY "Users can see comments on accessible tickets" 
ON comments FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id
    AND can_access_project(t.project_id, auth.uid())
  )
);

-- Comments: INSERT policy - can create comments on accessible tickets
CREATE POLICY "Users can create comments on accessible tickets" 
ON comments FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id
    AND can_access_project(t.project_id, auth.uid())
  )
);

-- Comments: UPDATE policy - can update own comments
CREATE POLICY "Users can update own comments" 
ON comments FOR UPDATE TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Comments: DELETE policy - can delete own comments or if admin
CREATE POLICY "Users can delete own comments or if admin" 
ON comments FOR DELETE TO authenticated 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users u
    JOIN tickets t ON t.id = ticket_id
    JOIN projects p ON p.id = t.project_id
    WHERE u.id = auth.uid()
    AND (
      u.role IN ('super_admin', 'system_admin')
      OR (u.role = 'company_admin' AND u.company_id = p.company_id)
      OR p.owner_id = auth.uid()
    )
  )
);

-- ==============================================
-- ACTIVITIES TABLE POLICIES
-- ==============================================

-- Activities: SELECT policy - can see activities for accessible projects
CREATE POLICY "Users can see activities for accessible projects" 
ON activities FOR SELECT TO authenticated 
USING (
  -- Activities without project (global activities) - only admins can see
  (project_id IS NULL AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin', 'company_admin')
  ))
  OR
  -- Activities with project - check project access
  (project_id IS NOT NULL AND can_access_project(project_id, auth.uid()))
);

-- Activities: INSERT policy - system can insert activities for accessible projects
CREATE POLICY "System can insert activities for accessible projects" 
ON activities FOR INSERT TO authenticated 
WITH CHECK (
  -- Global activities - only admins
  (project_id IS NULL AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin', 'company_admin')
  ))
  OR
  -- Project activities - check project access
  (project_id IS NOT NULL AND can_access_project(project_id, auth.uid()))
);

-- Activities: UPDATE policy - only the user who created the activity or admins
CREATE POLICY "Users can update own activities or if admin" 
ON activities FOR UPDATE TO authenticated 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
);

-- Activities: DELETE policy - only admins can delete activities
CREATE POLICY "Only admins can delete activities" 
ON activities FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'system_admin')
  )
);

-- ==============================================
-- USAGE INSTRUCTIONS
-- ==============================================

/*
To apply these enhanced policies to your database:

1. Connect to your Supabase database or PostgreSQL instance
2. Run this entire SQL file to create all enhanced policies
3. Verify policies are created with:
   SELECT schemaname, tablename, policyname, permissive, roles, cmd 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   ORDER BY tablename, cmd;

These policies implement:
- Project visibility controls (public, company, private)
- Role-based access control (super_admin, system_admin, company_admin, etc.)
- Project membership enforcement
- Activity logging with proper access controls
- Proper data isolation between companies and projects

Note: These policies are more restrictive and secure than the basic ones.
They enforce proper access control based on:
- Project membership and visibility settings
- User roles and company isolation
- Owner-based permissions for specific operations
*/