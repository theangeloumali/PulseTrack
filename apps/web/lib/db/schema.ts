// Pure TypeScript type definitions for database schema
// This file provides type safety without runtime dependencies

// Define enum types
export type UserRole = 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user'
export type UserStatus = 'active' | 'inactive'
export type ProjectStatus = 'active' | 'archived' | 'completed'
export type TicketStatus = 'new' | 'in_progress' | 'review' | 'done'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type BillingFrequency = 'weekly' | 'bi_monthly' | 'monthly'
export type BillingStatus = 'draft' | 'active' | 'closed'
export type ActivityType = 'project_created' | 'project_updated' | 'project_archived' | 'ticket_created' | 'ticket_updated' | 'ticket_deleted' | 'ticket_assigned' | 'comment_created' | 'user_added_to_project' | 'user_removed_from_project' | 'time_entry_created' | 'time_entry_updated'
export type ProjectVisibility = 'public' | 'company' | 'private'

// Base database types
export interface BaseRecord {
  id: string
  created_at: string
  updated_at: string
}

// Company types
export interface Company extends BaseRecord {
  name: string
  slug: string
}

export interface NewCompany {
  name: string
  slug: string
}

// User types
export interface User extends BaseRecord {
  email: string
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  role: UserRole
  company_id: string
  hourly_rate?: number | null // Hourly rate in dollars
  status?: 'active' | 'inactive' // User status within company
  invited_by?: string | null // ID of user who invited this user
  invited_at?: string | null // When the invitation was sent
}

export interface NewUser {
  id?: string // Can be provided from auth.users
  email: string
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  role?: UserRole
  company_id: string
}

// Project types
export interface Project extends BaseRecord {
  name: string
  description?: string | null
  status: ProjectStatus
  company_id: string
  owner_id: string
  visibility: ProjectVisibility
  allow_external_activities: boolean
}

export interface NewProject {
  name: string
  description?: string | null
  status?: ProjectStatus
  company_id: string
  owner_id: string
  visibility?: ProjectVisibility
  allow_external_activities?: boolean
}

// Project member types (many-to-many relationship)
export interface ProjectMember extends BaseRecord {
  project_id: string
  user_id: string
  role: 'lead' | 'member'
}

export interface NewProjectMember {
  project_id: string
  user_id: string
  role?: 'lead' | 'member'
}

// Project member with user relation
export interface ProjectMemberWithUser extends ProjectMember {
  user: User
}

// Ticket types
export interface Ticket extends BaseRecord {
  title: string
  description?: string | null
  status: TicketStatus
  priority: TicketPriority
  project_id: string
  assignee_id?: string | null
  reporter_id: string
  estimated_hours?: number | null
  actual_hours?: number | null
  due_date?: string | null
}

export interface NewTicket {
  title: string
  description?: string | null
  status?: TicketStatus
  priority?: TicketPriority
  project_id: string
  assignee_id?: string | null
  reporter_id: string
  estimated_hours?: number | null
  actual_hours?: number | null
  due_date?: string | null
}

// Time entry types
export interface TimeEntry {
  id: string
  ticket_id: string
  user_id: string
  start_time: string
  end_time?: string | null
  duration?: number | null // in hours (decimal)
  description?: string | null
  created_at: string
}

export interface NewTimeEntry {
  ticket_id: string
  user_id: string
  start_time: string
  end_time?: string | null
  duration?: number | null // in hours (decimal)
  description?: string | null
}

// Time entry with user relation
export interface TimeEntryWithUser extends TimeEntry {
  users?: {
    id: string
    first_name?: string | null
    last_name?: string | null
    email: string
    avatar_url?: string | null
  }[] | null
}

// Comment types
export interface Comment extends BaseRecord {
  ticket_id: string
  user_id: string
  content: string
}

export interface NewComment {
  ticket_id: string
  user_id: string
  content: string
}

// Billing Period types
export interface BillingPeriod extends BaseRecord {
  company_id: string
  name: string
  start_date: string
  end_date: string
  frequency: BillingFrequency
  status: BillingStatus
  created_by: string
}

export interface NewBillingPeriod {
  company_id: string
  name: string
  start_date: string
  end_date: string
  frequency: BillingFrequency
  status?: BillingStatus
  created_by: string
}

// Billing Rate types
export interface BillingRate extends BaseRecord {
  company_id: string
  user_id?: string | null
  project_id?: string | null
  hourly_rate: number
  currency: string
  effective_from: string
  effective_to?: string | null
  created_by: string
}

export interface NewBillingRate {
  company_id: string
  user_id?: string | null
  project_id?: string | null
  hourly_rate: number
  currency?: string
  effective_from: string
  effective_to?: string | null
  created_by: string
}

// Company Billing Settings types
export interface CompanyBillingSettings extends BaseRecord {
  currency?: string | null
  billing_frequency?: BillingFrequency | null
  invoice_prefix?: string | null
}

export interface NewCompanyBillingSettings {
  company_id?: string
  currency?: string | null
  billing_frequency?: BillingFrequency | null
  invoice_prefix?: string | null
}

// Time Entry Billing types
export interface TimeEntryBilling extends BaseRecord {
  time_entry_id: string
  billing_period_id: string
  hourly_rate: number
  billable_amount: number
  is_billable: boolean
}

export interface NewTimeEntryBilling {
  time_entry_id: string
  billing_period_id: string
  hourly_rate: number
  billable_amount: number
  is_billable?: boolean
}

// Ticket History types
export interface TicketHistory extends BaseRecord {
  ticket_id: string
  user_id: string
  field_name: string // 'status', 'assignee', 'priority', 'title', 'description', etc.
  old_value?: string | null
  new_value?: string | null
}

export interface NewTicketHistory {
  ticket_id: string
  user_id: string
  field_name: string
  old_value?: string | null
  new_value?: string | null
}

// Activity types
export interface Activity extends BaseRecord {
  type: ActivityType
  project_id?: string | null
  ticket_id?: string | null
  user_id: string
  target_user_id?: string | null // For activities involving other users
  title: string
  description?: string | null
  metadata?: Record<string, any> | null // JSON field for additional data
}

export interface NewActivity {
  type: ActivityType
  project_id?: string | null
  ticket_id?: string | null
  user_id: string
  target_user_id?: string | null
  title: string
  description?: string | null
  metadata?: Record<string, any> | null
}

// Activity with user relation
export interface ActivityWithUser extends Activity {
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'email'>
  target_user?: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'email'> | null
  project?: Pick<Project, 'id' | 'name'> | null
  ticket?: Pick<Ticket, 'id' | 'title'> | null
}

// Database table names for Supabase queries
export const TABLE_NAMES = {
  companies: 'companies',
  users: 'users',
  projects: 'projects',
  project_members: 'project_members',
  tickets: 'tickets',
  time_entries: 'time_entries',
  comments: 'comments',
  billing_periods: 'billing_periods',
  billing_rates: 'billing_rates',
  company_billing_settings: 'company_billing_settings',
  time_entry_billing: 'time_entry_billing',
  ticket_history: 'ticket_history',
  activities: 'activities',
} as const
