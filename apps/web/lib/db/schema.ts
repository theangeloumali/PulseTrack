// Pure TypeScript type definitions for database schema
// This file provides type safety without runtime dependencies

// Define enum types
export type UserRole = 'admin' | 'manager' | 'user'
export type ProjectStatus = 'active' | 'archived' | 'completed'
export type TicketStatus = 'new' | 'in_progress' | 'review' | 'done'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'

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
}

export interface NewProject {
  name: string
  description?: string | null
  status?: ProjectStatus
  company_id: string
  owner_id: string
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
  duration?: number | null // in seconds
  description?: string | null
  created_at: string
}

export interface NewTimeEntry {
  ticket_id: string
  user_id: string
  start_time: string
  end_time?: string | null
  duration?: number | null
  description?: string | null
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

// Database table names for Supabase queries
export const TABLE_NAMES = {
  companies: 'companies',
  users: 'users',
  projects: 'projects',
  tickets: 'tickets',
  time_entries: 'time_entries',
  comments: 'comments',
} as const
