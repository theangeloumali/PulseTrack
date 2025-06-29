-- Row Level Security (RLS) Policies for All Tables
-- This file contains CRUD policies for all tables in the database schema

-- ==============================================
-- COMPANIES TABLE POLICIES
-- ==============================================

-- Companies: SELECT policy
CREATE POLICY "Allow all users to select from companies" 
ON companies FOR SELECT TO authenticated, anon USING (true);

-- Companies: INSERT policy  
CREATE POLICY "Allow authenticated users to insert into companies" 
ON companies FOR INSERT TO authenticated WITH CHECK (true);

-- Companies: UPDATE policy
CREATE POLICY "Allow authenticated users to update companies" 
ON companies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Companies: DELETE policy
CREATE POLICY "Allow authenticated users to delete from companies" 
ON companies FOR DELETE TO authenticated USING (true);

-- ==============================================
-- USERS TABLE POLICIES
-- ==============================================

-- Users: SELECT policy
CREATE POLICY "Allow all users to select from users" 
ON users FOR SELECT TO authenticated, anon USING (true);

-- Users: INSERT policy
CREATE POLICY "Allow authenticated users to insert into users" 
ON users FOR INSERT TO authenticated WITH CHECK (true);

-- Users: UPDATE policy
CREATE POLICY "Allow authenticated users to update users" 
ON users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Users: DELETE policy
CREATE POLICY "Allow authenticated users to delete from users" 
ON users FOR DELETE TO authenticated USING (true);

-- ==============================================
-- PROJECTS TABLE POLICIES
-- ==============================================

-- Projects: SELECT policy
CREATE POLICY "Allow all users to select from projects" 
ON projects FOR SELECT TO authenticated, anon USING (true);

-- Projects: INSERT policy
CREATE POLICY "Allow authenticated users to insert into projects" 
ON projects FOR INSERT TO authenticated WITH CHECK (true);

-- Projects: UPDATE policy
CREATE POLICY "Allow authenticated users to update projects" 
ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Projects: DELETE policy
CREATE POLICY "Allow authenticated users to delete from projects" 
ON projects FOR DELETE TO authenticated USING (true);

-- ==============================================
-- PROJECT_MEMBERS TABLE POLICIES
-- ==============================================

-- Project Members: SELECT policy
CREATE POLICY "Allow all users to select from project_members" 
ON project_members FOR SELECT TO authenticated, anon USING (true);

-- Project Members: INSERT policy
CREATE POLICY "Allow authenticated users to insert into project_members" 
ON project_members FOR INSERT TO authenticated WITH CHECK (true);

-- Project Members: UPDATE policy
CREATE POLICY "Allow authenticated users to update project_members" 
ON project_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Project Members: DELETE policy
CREATE POLICY "Allow authenticated users to delete from project_members" 
ON project_members FOR DELETE TO authenticated USING (true);

-- ==============================================
-- TICKETS TABLE POLICIES
-- ==============================================

-- Tickets: SELECT policy
CREATE POLICY "Allow all users to select from tickets" 
ON tickets FOR SELECT TO authenticated, anon USING (true);

-- Tickets: INSERT policy
CREATE POLICY "Allow authenticated users to insert into tickets" 
ON tickets FOR INSERT TO authenticated WITH CHECK (true);

-- Tickets: UPDATE policy
CREATE POLICY "Allow authenticated users to update tickets" 
ON tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Tickets: DELETE policy
CREATE POLICY "Allow authenticated users to delete from tickets" 
ON tickets FOR DELETE TO authenticated USING (true);

-- ==============================================
-- TIME_ENTRIES TABLE POLICIES
-- ==============================================

-- Time Entries: SELECT policy
CREATE POLICY "Allow all users to select from time_entries" 
ON time_entries FOR SELECT TO authenticated, anon USING (true);

-- Time Entries: INSERT policy
CREATE POLICY "Allow authenticated users to insert into time_entries" 
ON time_entries FOR INSERT TO authenticated WITH CHECK (true);

-- Time Entries: UPDATE policy
CREATE POLICY "Allow authenticated users to update time_entries" 
ON time_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Time Entries: DELETE policy
CREATE POLICY "Allow authenticated users to delete from time_entries" 
ON time_entries FOR DELETE TO authenticated USING (true);

-- ==============================================
-- COMMENTS TABLE POLICIES
-- ==============================================

-- Comments: SELECT policy
CREATE POLICY "Allow all users to select from comments" 
ON comments FOR SELECT TO authenticated, anon USING (true);

-- Comments: INSERT policy
CREATE POLICY "Allow authenticated users to insert into comments" 
ON comments FOR INSERT TO authenticated WITH CHECK (true);

-- Comments: UPDATE policy
CREATE POLICY "Allow authenticated users to update comments" 
ON comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Comments: DELETE policy
CREATE POLICY "Allow authenticated users to delete from comments" 
ON comments FOR DELETE TO authenticated USING (true);

-- ==============================================
-- BILLING_PERIODS TABLE POLICIES
-- ==============================================

-- Billing Periods: SELECT policy
CREATE POLICY "Allow all users to select from billing_periods" 
ON billing_periods FOR SELECT TO authenticated, anon USING (true);

-- Billing Periods: INSERT policy
CREATE POLICY "Allow authenticated users to insert into billing_periods" 
ON billing_periods FOR INSERT TO authenticated WITH CHECK (true);

-- Billing Periods: UPDATE policy
CREATE POLICY "Allow authenticated users to update billing_periods" 
ON billing_periods FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Billing Periods: DELETE policy
CREATE POLICY "Allow authenticated users to delete from billing_periods" 
ON billing_periods FOR DELETE TO authenticated USING (true);

-- ==============================================
-- BILLING_RATES TABLE POLICIES
-- ==============================================

-- Billing Rates: SELECT policy
CREATE POLICY "Allow all users to select from billing_rates" 
ON billing_rates FOR SELECT TO authenticated, anon USING (true);

-- Billing Rates: INSERT policy
CREATE POLICY "Allow authenticated users to insert into billing_rates" 
ON billing_rates FOR INSERT TO authenticated WITH CHECK (true);

-- Billing Rates: UPDATE policy
CREATE POLICY "Allow authenticated users to update billing_rates" 
ON billing_rates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Billing Rates: DELETE policy
CREATE POLICY "Allow authenticated users to delete from billing_rates" 
ON billing_rates FOR DELETE TO authenticated USING (true);

-- ==============================================
-- COMPANY_BILLING_SETTINGS TABLE POLICIES
-- ==============================================

-- Company Billing Settings: SELECT policy
CREATE POLICY "Allow all users to select from company_billing_settings" 
ON company_billing_settings FOR SELECT TO authenticated, anon USING (true);

-- Company Billing Settings: INSERT policy
CREATE POLICY "Allow authenticated users to insert into company_billing_settings" 
ON company_billing_settings FOR INSERT TO authenticated WITH CHECK (true);

-- Company Billing Settings: UPDATE policy
CREATE POLICY "Allow authenticated users to update company_billing_settings" 
ON company_billing_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Company Billing Settings: DELETE policy
CREATE POLICY "Allow authenticated users to delete from company_billing_settings" 
ON company_billing_settings FOR DELETE TO authenticated USING (true);

-- ==============================================
-- TIME_ENTRY_BILLING TABLE POLICIES
-- ==============================================

-- Time Entry Billing: SELECT policy
CREATE POLICY "Allow all users to select from time_entry_billing" 
ON time_entry_billing FOR SELECT TO authenticated, anon USING (true);

-- Time Entry Billing: INSERT policy
CREATE POLICY "Allow authenticated users to insert into time_entry_billing" 
ON time_entry_billing FOR INSERT TO authenticated WITH CHECK (true);

-- Time Entry Billing: UPDATE policy
CREATE POLICY "Allow authenticated users to update time_entry_billing" 
ON time_entry_billing FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Time Entry Billing: DELETE policy
CREATE POLICY "Allow authenticated users to delete from time_entry_billing" 
ON time_entry_billing FOR DELETE TO authenticated USING (true);

-- ==============================================
-- TICKET_HISTORY TABLE POLICIES
-- ==============================================

-- Ticket History: SELECT policy
CREATE POLICY "Allow all users to select from ticket_history" 
ON ticket_history FOR SELECT TO authenticated, anon USING (true);

-- Ticket History: INSERT policy
CREATE POLICY "Allow authenticated users to insert into ticket_history" 
ON ticket_history FOR INSERT TO authenticated WITH CHECK (true);

-- Ticket History: UPDATE policy
CREATE POLICY "Allow authenticated users to update ticket_history" 
ON ticket_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Ticket History: DELETE policy
CREATE POLICY "Allow authenticated users to delete from ticket_history" 
ON ticket_history FOR DELETE TO authenticated USING (true);

-- ==============================================
-- USAGE INSTRUCTIONS
-- ==============================================

/*
To apply these policies to your database:

1. Connect to your Supabase database or PostgreSQL instance
2. Run this entire SQL file to create all policies
3. Verify policies are created with:
   SELECT schemaname, tablename, policyname, permissive, roles, cmd 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   ORDER BY tablename, cmd;

Note: These are basic "allow all authenticated users" policies.
For production, consider implementing more restrictive policies based on:
- Company isolation (users can only access data from their company)
- Role-based restrictions (different permissions for different user roles)
- Owner-based restrictions (users can only modify their own data)

Example of a more restrictive policy:
CREATE POLICY "Users can only see projects from their company" 
ON projects FOR SELECT TO authenticated 
USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
*/