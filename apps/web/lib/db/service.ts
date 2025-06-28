import { supabase } from '@/lib/db'
import type { NewCompany, NewUser, NewProject, NewProjectMember, NewTicket, NewTimeEntry, NewComment } from '@/lib/db/schema'
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

// Project member operations
export async function addProjectMember(projectId: string, userId: string, role: 'lead' | 'member' = 'member') {
  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: userId,
      role
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function removeProjectMember(projectId: string, userId: string) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
  
  if (error) throw error
}

export async function getProjectMembers(projectId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      id,
      role,
      created_at,
      user_id,
      users!inner(${userBasicFields})
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  
  // Transform the data to have the user as a single object
  const transformedData = data?.map(member => ({
    ...member,
    user: Array.isArray(member.users) ? member.users[0] : member.users
  })) || []
  
  return transformedData
}

export async function getUserProjects(userId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      role,
      projects!project_members_project_id_projects_id_fk(${projectBasicFields})
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: 'lead' | 'member') {
  const { data, error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
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

export async function updateTicket(id: string, data: Partial<NewTicket>) {
  const { data: result, error } = await supabase
    .from('tickets')
    .update(data)
    .eq('id', id)
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

export async function updateTimeEntry(id: string, data: Partial<NewTimeEntry>) {
  const { data: result, error } = await supabase
    .from('time_entries')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return result
}

export async function deleteTimeEntry(id: string) {
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function getActiveTimeEntry(userId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(timeEntryWithTicketFields)
    .eq('user_id', userId)
    .is('end_time', null)
    .maybeSingle()
  
  if (error) throw error
  return data
}

export async function getTotalTimeByTicket(ticketId: string): Promise<number> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('duration')
    .eq('ticket_id', ticketId)
    .not('duration', 'is', null)
  
  if (error) throw error
  
  const totalSeconds = (data || []).reduce((sum, entry) => sum + (entry.duration || 0), 0)
  return totalSeconds
}

export async function getTotalTimeByUser(userId: string, dateFrom?: string, dateTo?: string): Promise<number> {
  let query = supabase
    .from('time_entries')
    .select('duration')
    .eq('user_id', userId)
    .not('duration', 'is', null)
  
  if (dateFrom) {
    query = query.gte('start_time', dateFrom)
  }
  
  if (dateTo) {
    query = query.lte('start_time', dateTo)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  const totalSeconds = (data || []).reduce((sum, entry) => sum + (entry.duration || 0), 0)
  return totalSeconds
}

export async function getUsersInCompany(companyId: string) {
  const { data, error } = await supabase
    .from('users')
    .select(userBasicFields)
    .eq('company_id', companyId)
    .order('first_name', { ascending: true })
  
  if (error) throw error
  return data || []
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

/**
 * Get time entries for billing within a company and date range.
 * Includes joins to tickets, projects, and users for comprehensive data.
 */
export async function getTimeEntriesForBilling(companyId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      id,
      start_time,
      end_time,
      duration,
      description,
      tickets (
        id,
        title,
        projects (
          id,
          name,
          company_id
        )
      ),
      users (
        id,
        first_name,
        last_name,
        email,
        hourly_rate
      )
    `)
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .eq('tickets.projects.company_id', companyId) // Ensure time entries belong to projects within the company
    .order('start_time', { ascending: true });

  if (error) throw error;

  // Flatten the structure for easier processing
  const flattenedData = data.map(entry => ({
    ...entry,
    ticket: entry.tickets,
    project: entry.tickets?.[0]?.projects,
    user: entry.users,
  })).filter(entry => entry.ticket && entry.project && entry.user);

  return flattenedData;
}

// Company User Management Operations

/**
 * Get all users in a company with their details
 */
export async function getCompanyUsers(companyId: string) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      avatar_url,
      role,
      status,
      hourly_rate,
      invited_by,
      invited_at,
      created_at,
      updated_at,
      invited_by_user:invited_by (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

/**
 * Update user role and status
 */
export async function updateUserRole(userId: string, role: 'admin' | 'manager' | 'user') {
  const { data, error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

/**
 * Update user status (active/inactive)
 */
export async function updateUserStatus(userId: string, status: 'active' | 'inactive') {
  const { data, error } = await supabase
    .from('users')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

/**
 * Update user hourly rate
 */
export async function updateUserHourlyRate(userId: string, hourlyRate: number | null) {
  const { data, error } = await supabase
    .from('users')
    .update({ hourly_rate: hourlyRate, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

/**
 * Remove user from company (set as inactive)
 */
export async function removeUserFromCompany(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ 
      status: 'inactive', 
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

/**
 * Get users available for assignment (active users in company)
 */
export async function getAssignableUsers(companyId: string) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      email,
      role,
      avatar_url
    `)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('first_name', { ascending: true })
  
  if (error) throw error
  return data || []
}

/**
 * Invite user to company (creates user record with invited status)
 */
export async function inviteUserToCompany(data: {
  email: string
  role: 'admin' | 'manager' | 'user'
  companyId: string
  invitedBy: string
  firstName?: string
  lastName?: string
  hourlyRate?: number
}) {
  try {
    const response = await fetch('/api/invite-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to invite user')
    }

    return result.data
  } catch (error) {
    throw error
  }
}


/**
 * Update user details (first name, last name, etc.)
 */
export async function updateUser(userId: string, updates: Partial<NewUser>) {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}