-- Database Schema Improvements
-- This file contains all the enum constraints, indexes, and new table additions

-- ==============================================
-- ENUM CONSTRAINTS FOR EXISTING TABLES
-- ==============================================

-- Users table constraints
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'system_admin', 'company_admin', 'manager', 'user'));

ALTER TABLE users ADD CONSTRAINT users_status_check 
  CHECK (status IN ('active', 'inactive'));

-- Projects table constraints
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('active', 'archived', 'completed'));

-- Project Members table constraints
ALTER TABLE project_members ADD CONSTRAINT project_members_role_check 
  CHECK (role IN ('lead', 'member'));

-- Tickets table constraints
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
  CHECK (status IN ('new', 'in_progress', 'review', 'done'));

ALTER TABLE tickets ADD CONSTRAINT tickets_priority_check 
  CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- Billing Periods table constraints
ALTER TABLE billing_periods ADD CONSTRAINT billing_periods_frequency_check 
  CHECK (frequency IN ('weekly', 'bi_monthly', 'monthly'));

ALTER TABLE billing_periods ADD CONSTRAINT billing_periods_status_check 
  CHECK (status IN ('draft', 'active', 'closed'));

-- Company Billing Settings table constraints
ALTER TABLE company_billing_settings ADD CONSTRAINT company_billing_settings_billing_frequency_check 
  CHECK (billing_frequency IN ('weekly', 'bi_monthly', 'monthly'));

-- ==============================================
-- PERFORMANCE INDEXES
-- ==============================================

-- Companies table indexes
CREATE INDEX IF NOT EXISTS companies_name_idx ON companies(name);
CREATE INDEX IF NOT EXISTS companies_slug_idx ON companies(slug);

-- Users table indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_company_id_idx ON users(company_id);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS projects_company_id_idx ON projects(company_id);
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects(owner_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
CREATE INDEX IF NOT EXISTS projects_name_idx ON projects(name);

-- Project Members table indexes
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON project_members(user_id);

-- Tickets table indexes
CREATE INDEX IF NOT EXISTS tickets_project_id_idx ON tickets(project_id);
CREATE INDEX IF NOT EXISTS tickets_assignee_id_idx ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS tickets_reporter_id_idx ON tickets(reporter_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);
CREATE INDEX IF NOT EXISTS tickets_priority_idx ON tickets(priority);
CREATE INDEX IF NOT EXISTS tickets_due_date_idx ON tickets(due_date);
CREATE INDEX IF NOT EXISTS tickets_title_idx ON tickets(title);

-- Time Entries table indexes
CREATE INDEX IF NOT EXISTS time_entries_ticket_id_idx ON time_entries(ticket_id);
CREATE INDEX IF NOT EXISTS time_entries_user_id_idx ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS time_entries_start_time_idx ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS time_entries_created_at_idx ON time_entries(created_at);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS comments_ticket_id_idx ON comments(ticket_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments(created_at);

-- Billing Periods table indexes
CREATE INDEX IF NOT EXISTS billing_periods_company_id_idx ON billing_periods(company_id);
CREATE INDEX IF NOT EXISTS billing_periods_status_idx ON billing_periods(status);
CREATE INDEX IF NOT EXISTS billing_periods_frequency_idx ON billing_periods(frequency);
CREATE INDEX IF NOT EXISTS billing_periods_start_date_idx ON billing_periods(start_date);
CREATE INDEX IF NOT EXISTS billing_periods_end_date_idx ON billing_periods(end_date);

-- Billing Rates table indexes
CREATE INDEX IF NOT EXISTS billing_rates_company_id_idx ON billing_rates(company_id);
CREATE INDEX IF NOT EXISTS billing_rates_user_id_idx ON billing_rates(user_id);
CREATE INDEX IF NOT EXISTS billing_rates_project_id_idx ON billing_rates(project_id);
CREATE INDEX IF NOT EXISTS billing_rates_effective_from_idx ON billing_rates(effective_from);
CREATE INDEX IF NOT EXISTS billing_rates_effective_to_idx ON billing_rates(effective_to);

-- Company Billing Settings table indexes
CREATE INDEX IF NOT EXISTS company_billing_settings_company_id_idx ON company_billing_settings(company_id);

-- Time Entry Billing table indexes
CREATE INDEX IF NOT EXISTS time_entry_billing_time_entry_id_idx ON time_entry_billing(time_entry_id);
CREATE INDEX IF NOT EXISTS time_entry_billing_billing_period_id_idx ON time_entry_billing(billing_period_id);
CREATE INDEX IF NOT EXISTS time_entry_billing_is_billable_idx ON time_entry_billing(is_billable);

-- ==============================================
-- DATA TYPE IMPROVEMENTS
-- ==============================================

-- Fix time_entries duration to use decimal instead of integer
ALTER TABLE time_entries ALTER COLUMN duration TYPE DECIMAL(8,2);
COMMENT ON COLUMN time_entries.duration IS 'Duration in hours with decimals (e.g., 1.5 hours)';

-- Fix time_entry_billing is_billable to use boolean instead of text
ALTER TABLE time_entry_billing ALTER COLUMN is_billable TYPE BOOLEAN USING 
  CASE WHEN is_billable = 'true' THEN TRUE ELSE FALSE END;
ALTER TABLE time_entry_billing ALTER COLUMN is_billable SET DEFAULT TRUE;

-- ==============================================
-- NEW TABLE: TICKET HISTORY
-- ==============================================

CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL, -- 'status', 'assignee', 'priority', 'title', 'description', etc.
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on ticket_history
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- Indexes for ticket_history
CREATE INDEX IF NOT EXISTS ticket_history_ticket_id_idx ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_history_user_id_idx ON ticket_history(user_id);
CREATE INDEX IF NOT EXISTS ticket_history_field_name_idx ON ticket_history(field_name);
CREATE INDEX IF NOT EXISTS ticket_history_created_at_idx ON ticket_history(created_at);

-- ==============================================
-- COMMENTS AND DOCUMENTATION
-- ==============================================

-- Update column comments to reflect new role hierarchy
COMMENT ON COLUMN users.role IS 'User role: super_admin, system_admin, company_admin, manager, or user';
COMMENT ON COLUMN users.status IS 'User status: active or inactive';
COMMENT ON COLUMN projects.status IS 'Project status: active, archived, or completed';
COMMENT ON COLUMN tickets.status IS 'Ticket status: new, in_progress, review, or done';
COMMENT ON COLUMN tickets.priority IS 'Ticket priority: low, medium, high, or critical';
COMMENT ON COLUMN project_members.role IS 'Project member role: lead or member';
COMMENT ON COLUMN billing_periods.frequency IS 'Billing frequency: weekly, bi_monthly, or monthly';
COMMENT ON COLUMN billing_periods.status IS 'Billing period status: draft, active, or closed';

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

/*
-- Run these queries to verify the changes:

-- Check all constraints
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid IN (
  SELECT oid FROM pg_class 
  WHERE relname IN ('users', 'projects', 'tickets', 'project_members', 'billing_periods', 'company_billing_settings')
) 
ORDER BY conrelid, contype;

-- Check all indexes
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('companies', 'users', 'projects', 'project_members', 'tickets', 'time_entries', 'comments', 'billing_periods', 'billing_rates', 'company_billing_settings', 'time_entry_billing', 'ticket_history')
ORDER BY tablename, indexname;

-- Check table structure
\d+ ticket_history
*/