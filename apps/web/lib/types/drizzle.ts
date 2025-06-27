// Re-export Drizzle types as database types for consistency
import type {
  Company,
  NewCompany,
  User,
  NewUser,
  Project,
  NewProject,
  Ticket,
  NewTicket,
  TimeEntry,
  NewTimeEntry,
  Comment,
  NewComment,
} from '@/lib/db/schema'

export type {
  Company,
  NewCompany,
  User,
  NewUser,
  Project,
  NewProject,
  Ticket,
  NewTicket,
  TimeEntry,
  NewTimeEntry,
  Comment,
  NewComment,
}

// Legacy type aliases for backward compatibility
export type CreateCompany = NewCompany
export type CreateUser = NewUser
export type CreateProject = NewProject
export type CreateTicket = NewTicket
export type CreateTimeEntry = NewTimeEntry
export type CreateComment = NewComment

// Enum types for type safety
export type UserRole = 'admin' | 'manager' | 'user'
export type ProjectStatus = 'active' | 'archived' | 'completed'
export type TicketStatus = 'new' | 'in_progress' | 'review' | 'done'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
