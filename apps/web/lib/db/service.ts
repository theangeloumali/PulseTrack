import { supabase } from '@/lib/db'
import type { NewCompany, NewUser, NewProject, NewTicket, NewTimeEntry, NewComment } from '@/lib/db/schema'

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
    .select(`
      *,
      companies (*)
    `)
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
  console.log('getProjectsByCompany called with companyId:', companyId);
  
  // First, let's try without the join to see if basic fetching works
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  
  console.log('Database response - data:', data);
  console.log('Database response - error:', error);
  
  if (error) {
    console.error('Error fetching projects:', error);
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
  
  if (error) throw error
  return result
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
    .select(`
      *,
      projects (*),
      assignee:users!tickets_assignee_id_fkey (*),
      reporter:users!tickets_reporter_id_fkey (*)
    `)
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getTicketsByProject(projectId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      assignee:users!tickets_assignee_id_fkey (*),
      reporter:users!tickets_reporter_id_fkey (*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getTicketsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      projects!inner (*),
      assignee:users!tickets_assignee_id_fkey (*),
      reporter:users!tickets_reporter_id_fkey (*)
    `)
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

// Time entry operations
export async function getTimeEntriesByTicket(ticketId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      users (*)
    `)
    .eq('ticket_id', ticketId)
    .order('start_time', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getTimeEntriesByUser(userId: string, limit?: number): Promise<any[]> {
  let query = supabase
    .from('time_entries')
    .select(`
      *,
      tickets (*),
      tickets.projects (*)
    `)
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
    .select(`
      *,
      users (*)
    `)
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
