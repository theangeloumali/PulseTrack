import { supabase } from '@/lib/db'
import type { NewCompany, NewUser, NewProject, NewTicket, NewTimeEntry, NewComment } from '@/lib/db/schema'
import {
  userBasicFields,
  userWithCompanyFields,
  companyBasicFields,
  projectBasicFields,
  projectWithRelationsFields,
  ticketBasicFields,
  ticketWithUsersFields,
  ticketWithProjectFields,
  ticketFullFields,
  timeEntryWithUserFields,
  timeEntryWithTicketFields,
  commentWithUserFields
} from './queries'

// Company operations
export async function getCompanyById(id: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
  return data
}

export async function getCompanyBySlug(slug: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
  return data
}

export async function createCompany(data: NewCompany) {
  const { data: result, error } = await supabase
    .from('companies')
    .insert(data)
    .select()
    .single()
  
  if (error) throw error
  return result
}

// User operations
export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getUserWithCompany(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select(userWithCompanyFields)
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getUsersByCompany(companyId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', companyId)
    .order('first_name', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function createUser(data: NewUser) {
  const { data: result, error } = await supabase
    .from('users')
    .insert(data)
    .select()
    .single()
  
  if (error) throw error
  return result
}

// Project operations
export async function getProjectById(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getProjectsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(projectWithRelationsFields)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw error;
  }
  return data || []
}

export async function createProject(data: NewProject) {
  const { data: result, error } = await supabase
    .from('projects')
    .insert(data)
    .select()
    .single()
  
  if (error) {
    throw error;
  }
  
  return result;
}

export async function updateProject(id: string, updates: Partial<NewProject>) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteProject(id: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Ticket operations
export async function getTicketById(id: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(ticketFullFields)
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getTicketsByProject(projectId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(ticketWithUsersFields)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getTicketsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(ticketWithProjectFields)
    .eq('projects.company_id', companyId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createTicket(data: NewTicket) {
  const { data: result, error } = await supabase
    .from('tickets')
    .insert(data)
    .select()
    .single()
  
  if (error) throw error
  return result
}

// Get ticket count by project
export async function getTicketCountByProject(projectId: string) {
  const { count, error } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
  
  if (error) throw error
  return count || 0
}

// Get recent tickets by project (for project dashboard)
export async function getRecentTicketsByProject(projectId: string, limit: number = 5) {
  const { data, error } = await supabase
    .from('tickets')
    .select(ticketWithUsersFields)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

// Time entry operations
export async function getTimeEntriesByTicket(ticketId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(timeEntryWithUserFields)
    .eq('ticket_id', ticketId)
    .order('start_time', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getTimeEntriesByUser(userId: string, limit?: number): Promise<any[]> {
  let query = supabase
    .from('time_entries')
    .select(timeEntryWithTicketFields)
    .eq('user_id', userId)
    .order('start_time', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

export async function createTimeEntry(data: NewTimeEntry) {
  const { data: result, error } = await supabase
    .from('time_entries')
    .insert(data)
    .select()
    .single()
  
  if (error) throw error
  return result
}

// Comment operations
export async function getCommentsByTicket(ticketId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select(commentWithUserFields)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function createComment(data: NewComment) {
  const { data: result, error } = await supabase
    .from('comments')
    .insert(data)
    .select()
    .single()
  
  if (error) throw error
  return result
}

// Get projects with ticket counts for a company
export async function getProjectsWithTicketCounts(companyId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      ${projectBasicFields},
      companies (
        ${companyBasicFields}
      ),
      users:owner_id (
        ${userBasicFields}
      ),
      ticket_count:tickets(count)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw error;
  }
  
  // Transform the data to include ticket_count as a number
  const transformedData = (data || []).map(project => ({
    ...project,
    ticket_count: project.ticket_count?.[0]?.count || 0
  }));
  
  return transformedData;
}
