// Pure TypeScript type definitions for database schema
// This file provides type safety without runtime dependencies

// Define enum types
export type UserRole = 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user';
export type UserStatus = 'active' | 'inactive';
export type CompanyStatus = 'active' | 'archived' | 'deleted';
export type ProjectStatus = 'active' | 'archived' | 'completed';
export type TicketStatus = 'new' | 'in_progress' | 'review' | 'done';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type BillingFrequency = 'weekly' | 'bi_monthly' | 'monthly';
export type BillingStatus = 'draft' | 'active' | 'closed';
export type PaymentStatus = 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'project_archived'
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_deleted'
  | 'ticket_assigned'
  | 'comment_created'
  | 'user_added_to_project'
  | 'user_removed_from_project'
  | 'time_entry_created'
  | 'time_entry_updated'
  | 'company_archived'
  | 'company_restored'
  | 'company_deleted'
  | 'user_archived'
  | 'user_restored'
  | 'user_deleted'
  | 'ai_action';
export type ProjectVisibility = 'public' | 'company' | 'private';

// Base database types
export interface BaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
}

// Company types
export interface Company extends BaseRecord {
  name: string;
  slug: string;
}

export interface NewCompany {
  name: string;
  slug: string;
}

// User types
export interface User extends BaseRecord {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  company_id: string;
  hourly_rate?: number | null; // Hourly rate in dollars
  status?: 'active' | 'inactive'; // User status within company
  invited_by?: string | null; // ID of user who invited this user
  invited_at?: string | null; // When the invitation was sent
  archived_at?: string | null; // When the user was archived
}

/** User with eagerly-loaded company relation (returned by getUserWithCompany). */
export interface UserWithCompany extends User {
  company: Company;
}

export interface NewUser {
  id?: string; // Can be provided from auth.users
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  role?: UserRole;
  company_id: string;
}

// Project types

// Lightweight client reference embedded on project rows via the projects.client_id FK
export interface ProjectClientRef {
  id: string;
  name: string;
}

export interface Project extends BaseRecord {
  name: string;
  description?: string | null;
  status: ProjectStatus;
  company_id: string;
  owner_id: string;
  visibility: ProjectVisibility;
  allow_external_activities: boolean;
  client_id?: string | null;
  // Present when the query embeds the client relation (id, name)
  client?: ProjectClientRef | null;
}

export interface NewProject {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  company_id: string;
  owner_id: string;
  visibility?: ProjectVisibility;
  allow_external_activities?: boolean;
  client_id?: string | null;
}

// Client types
export type ClientStatus = 'active' | 'inactive';

export interface Client extends BaseRecord {
  company_id: string;
  name: string;
  status: ClientStatus;
  owner_id?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  notes?: string | null;
}

export interface NewClient {
  company_id: string;
  name: string;
  status?: ClientStatus;
  owner_id?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  notes?: string | null;
}

// Client contact types
export interface ClientContact extends BaseRecord {
  client_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  is_primary: boolean;
}

export interface NewClientContact {
  client_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  is_primary?: boolean;
}

// Client invoicing types
export type ClientInvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
export type ClientInvoiceScheduleFrequency = 'weekly' | 'bi_monthly' | 'monthly';

export interface ClientInvoice extends BaseRecord {
  company_id: string;
  client_id: string;
  invoice_number: string;
  status: ClientInvoiceStatus;
  issue_date?: string | null;
  due_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  // numeric columns are returned as strings by supabase-js — coerce with Number() when computing
  subtotal?: string | null;
  tax_rate?: string | null;
  tax_amount?: string | null;
  total?: string | null;
  currency?: string | null;
  notes?: string | null;
  sent_at?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  created_by?: string | null;
}

export interface NewClientInvoice {
  company_id: string;
  client_id: string;
  invoice_number: string;
  status?: ClientInvoiceStatus;
  issue_date?: string | null;
  due_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  subtotal?: string | number | null;
  tax_rate?: string | number | null;
  tax_amount?: string | number | null;
  total?: string | number | null;
  currency?: string | null;
  notes?: string | null;
  sent_at?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  created_by?: string | null;
}

export interface ClientInvoiceLineItem {
  id: string;
  invoice_id: string;
  project_id?: string | null;
  description: string;
  // numeric columns are returned as strings by supabase-js — coerce with Number() when computing
  quantity: string;
  unit_rate: string;
  amount: string;
  sort_order?: number | null;
  created_at: string;
}

export interface NewClientInvoiceLineItem {
  invoice_id: string;
  project_id?: string | null;
  description: string;
  quantity?: string | number;
  unit_rate?: string | number;
  amount?: string | number;
  sort_order?: number | null;
}

export interface ClientInvoiceSchedule extends BaseRecord {
  company_id: string;
  client_id: string;
  frequency: ClientInvoiceScheduleFrequency;
  day_of_month?: number | null;
  next_run_date: string;
  active: boolean;
  auto_send: boolean;
  created_by?: string | null;
}

export interface NewClientInvoiceSchedule {
  company_id: string;
  client_id: string;
  frequency?: ClientInvoiceScheduleFrequency;
  day_of_month?: number | null;
  next_run_date: string;
  active?: boolean;
  auto_send?: boolean;
  created_by?: string | null;
}

// Invoice with eagerly-loaded line items (returned by getClientInvoiceDetail)
export interface ClientInvoiceWithLineItems extends ClientInvoice {
  line_items: ClientInvoiceLineItem[];
}

// Project member types (many-to-many relationship)
export interface ProjectMember extends BaseRecord {
  project_id: string;
  user_id: string;
  role: 'lead' | 'member';
}

export interface NewProjectMember {
  project_id: string;
  user_id: string;
  role?: 'lead' | 'member';
}

// Project member with user relation
export interface ProjectMemberWithUser extends ProjectMember {
  user: User;
}

// Ticket types
export interface Ticket extends BaseRecord {
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  project_id: string;
  assignee_id?: string | null;
  reporter_id: string;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  due_date?: string | null;
  sort_order?: number | null;
  deleted_at?: string | null;
}

export interface NewTicket {
  title: string;
  description?: string | null;
  status?: TicketStatus;
  priority?: TicketPriority;
  project_id: string;
  assignee_id?: string | null;
  reporter_id: string;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  due_date?: string | null;
  sort_order?: number | null;
}

// Time entry types
export interface TimeEntry {
  id: string;
  ticket_id: string;
  user_id: string;
  start_time: string;
  end_time?: string | null;
  duration?: number | null; // in hours (decimal)
  description?: string | null;
  created_at: string;
}

export interface NewTimeEntry {
  ticket_id: string;
  user_id: string;
  start_time: string;
  end_time?: string | null;
  duration?: number | null; // in hours (decimal)
  description?: string | null;
}

// Time entry with user relation
export interface TimeEntryWithUser extends TimeEntry {
  users?:
    | {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email: string;
        avatar_url?: string | null;
      }[]
    | null;
}

// Comment types
export interface Comment extends BaseRecord {
  ticket_id: string;
  user_id: string;
  content: string;
}

export interface NewComment {
  ticket_id: string;
  user_id: string;
  content: string;
}

// Billing Period types
export interface BillingPeriod extends BaseRecord {
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
  frequency: BillingFrequency;
  status: BillingStatus;
  payment_status: PaymentStatus;
  invoice_sent_date?: string | null;
  payment_due_date?: string | null;
  payment_received_date?: string | null;
  payment_amount?: number | null;
  payment_reference?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export interface NewBillingPeriod {
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
  frequency: BillingFrequency;
  status?: BillingStatus;
  payment_status?: PaymentStatus;
  invoice_sent_date?: string | null;
  payment_due_date?: string | null;
  payment_received_date?: string | null;
  payment_amount?: number | null;
  payment_reference?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

// Billing Rate types
export interface BillingRate extends BaseRecord {
  company_id: string;
  user_id?: string | null;
  project_id?: string | null;
  hourly_rate: number;
  currency: string;
  effective_from: string;
  effective_to?: string | null;
  created_by: string;
}

export interface NewBillingRate {
  company_id: string;
  user_id?: string | null;
  project_id?: string | null;
  hourly_rate: number;
  currency?: string;
  effective_from: string;
  effective_to?: string | null;
  created_by: string;
}

// Company Billing Settings types
export interface CompanyBillingSettings extends BaseRecord {
  currency?: string | null;
  billing_frequency?: BillingFrequency | null;
  invoice_prefix?: string | null;
  // Branding fields
  company_logo_url?: string | null;
  company_address?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  company_website?: string | null;
  invoice_footer?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
}

export interface NewCompanyBillingSettings {
  company_id: string;
  currency?: string | null;
  billing_frequency?: BillingFrequency | null;
  invoice_prefix?: string | null;
  // Branding fields
  company_logo_url?: string | null;
  company_address?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  company_website?: string | null;
  invoice_footer?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
}

// Time Entry Billing types
export interface TimeEntryBilling extends BaseRecord {
  time_entry_id: string;
  billing_period_id: string;
  hourly_rate: number;
  billable_amount: number;
  is_billable: boolean;
}

export interface NewTimeEntryBilling {
  time_entry_id: string;
  billing_period_id: string;
  hourly_rate: number;
  billable_amount: number;
  is_billable?: boolean;
}

// Ticket History types
export interface TicketHistory extends BaseRecord {
  ticket_id: string;
  user_id: string;
  field_name: string; // 'status', 'assignee', 'priority', 'title', 'description', etc.
  old_value?: string | null;
  new_value?: string | null;
}

export interface NewTicketHistory {
  ticket_id: string;
  user_id: string;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
}

// Activity types
export interface Activity extends BaseRecord {
  type: ActivityType;
  project_id?: string | null;
  ticket_id?: string | null;
  user_id: string;
  target_user_id?: string | null; // For activities involving other users
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null; // JSON field for additional data
}

export interface NewActivity {
  type: ActivityType;
  project_id?: string | null;
  ticket_id?: string | null;
  user_id: string;
  target_user_id?: string | null;
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
}

// Activity with user relation
export interface ActivityWithUser extends Activity {
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'email'>;
  target_user?: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'email'> | null;
  project?: Pick<Project, 'id' | 'name'> | null;
  ticket?: Pick<Ticket, 'id' | 'title'> | null;
}

// Payment History types
export interface PaymentHistory extends BaseRecord {
  billing_period_id: string;
  user_id: string;
  action:
    | 'status_changed'
    | 'invoice_sent'
    | 'payment_received'
    | 'due_date_set'
    | 'notes_updated'
    | 'outstanding_payment_deletion'
    | 'bulk_payment_history_deletion'
    | 'payment_status_reset';
  old_value?: string | null;
  new_value?: string | null;
  notes?: string | null;
}

export interface NewPaymentHistory {
  billing_period_id: string;
  user_id: string;
  action:
    | 'status_changed'
    | 'invoice_sent'
    | 'payment_received'
    | 'due_date_set'
    | 'notes_updated'
    | 'outstanding_payment_deletion'
    | 'bulk_payment_history_deletion'
    | 'payment_status_reset';
  old_value?: string | null;
  new_value?: string | null;
  notes?: string | null;
}

// Database table names for Supabase queries
export const TABLE_NAMES = {
  companies: 'companies',
  users: 'users',
  projects: 'projects',
  project_members: 'project_members',
  clients: 'clients',
  client_contacts: 'client_contacts',
  client_invoices: 'client_invoices',
  client_invoice_line_items: 'client_invoice_line_items',
  client_invoice_schedules: 'client_invoice_schedules',
  tickets: 'tickets',
  time_entries: 'time_entries',
  comments: 'comments',
  billing_periods: 'billing_periods',
  billing_rates: 'billing_rates',
  company_billing_settings: 'company_billing_settings',
  time_entry_billing: 'time_entry_billing',
  ticket_history: 'ticket_history',
  activities: 'activities',
  payment_history: 'payment_history',
} as const;
