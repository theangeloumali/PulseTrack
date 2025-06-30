import { supabase } from '@/lib/db'
import type { NewCompany, NewUser, NewProject, NewProjectMember, NewTicket, NewTimeEntry, NewComment } from '@/lib/db/schema'
import { createOrUpdateTimeEntryBilling } from './billing-service'
import { getApiPath } from '@/lib/utils'
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
    .is('deleted_at', null)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getTicketsByProject(projectId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(ticketWithUsersFields)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getTicketsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(ticketWithProjectFields)
    .eq('projects.company_id', companyId)
    .is('deleted_at', null)
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

export async function deleteTicket(id: string) {
  const { error } = await supabase
    .from('tickets')
    .update({ 
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .is('deleted_at', null)
  
  if (error) throw error
}

// Get ticket count by project
export async function getTicketCountByProject(projectId: string) {
  const { count, error } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('deleted_at', null)
  
  if (error) throw error
  return count || 0
}

// Get recent tickets by project (for project dashboard)
export async function getRecentTicketsByProject(projectId: string, limit: number = 5) {
  const { data, error } = await supabase
    .from('tickets')
    .select(ticketWithUsersFields)
    .eq('project_id', projectId)
    .is('deleted_at', null)
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

  // Automatically calculate billing if the entry has duration
  if (result && result.duration && result.duration > 0) {
    try {
      // Get company_id from the ticket's project
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('projects(company_id)')
        .eq('id', result.ticket_id)
        .single()
      
      const projects = Array.isArray(ticketData?.projects) ? ticketData.projects[0] : ticketData?.projects
      const companyId = projects?.company_id
      if (companyId) {
        await createOrUpdateTimeEntryBilling(result.id, companyId)
      }
    } catch (billingError) {
      // Log error but don't fail the time entry creation
      console.error('Failed to create billing record for time entry:', billingError)
    }
  }
  
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

  // Recalculate billing if the entry has duration (including when duration is updated)
  if (result && result.duration && result.duration > 0) {
    try {
      // Get company_id from the ticket's project
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('projects(company_id)')
        .eq('id', result.ticket_id)
        .single()
      
      const projects = Array.isArray(ticketData?.projects) ? ticketData.projects[0] : ticketData?.projects
      const companyId = projects?.company_id
      if (companyId) {
        await createOrUpdateTimeEntryBilling(result.id, companyId)
      }
    } catch (billingError) {
      // Log error but don't fail the time entry update
      console.error('Failed to update billing record for time entry:', billingError)
    }
  }
  
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
 * IMPORTANT: This function intentionally includes time entries from soft-deleted tickets
 * to preserve billing integrity and historical data for invoicing purposes.
 */
export async function getTimeEntriesForBilling(companyId: string, startDate: string, endDate: string) {
  console.log('🔍 Fetching time entries for billing:', { companyId, startDate, endDate });
  
  // Create proper end date timestamp
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);
  const endDateString = endDateTime.toISOString();
  
  const { data, error } = await supabase
    .from('time_entries')
    .select(
      `
      id,
      start_time,
      end_time,
      duration,
      description,
      user_id,
      ticket_id,
      tickets!inner (
        id,
        title,
        deleted_at,
        project_id,
        projects!inner (
          id,
          name,
          company_id
        )
      ),
      users!inner (
        id,
        first_name,
        last_name,
        email,
        hourly_rate
      )
    `
    )
    .eq('tickets.projects.company_id', companyId)
    .gte('start_time', startDate)
    .lte('start_time', endDateString)
    .not('duration', 'is', null)
    .gt('duration', 0)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('❌ Error fetching time entries for billing:', error);
    throw new Error(`Failed to fetch time entries: ${error.message}`);
  }

  console.log(`✅ Supabase query completed. Found ${data?.length || 0} time entries`);

  if (!data || data.length === 0) {
    console.log('⚠️ No time entries found for the given criteria');
    return [];
  }

  // Flatten the structure for easier processing with better error handling
  const flattenedData = data
    .map((entry, index) => {
      try {
        const ticket = Array.isArray(entry.tickets) ? entry.tickets[0] : entry.tickets;
        const project = ticket && Array.isArray(ticket.projects) ? ticket.projects[0] : ticket?.projects;
        const user = Array.isArray(entry.users) ? entry.users[0] : entry.users;

        if (!ticket) {
          console.warn(`⚠️ Entry ${index} missing ticket data:`, entry.id);
          return null;
        }
        if (!project) {
          console.warn(`⚠️ Entry ${index} missing project data:`, entry.id, ticket);
          return null;
        }
        if (!user) {
          console.warn(`⚠️ Entry ${index} missing user data:`, entry.id);
          return null;
        }

        return {
          ...entry,
          ticket,
          project,
          user,
        };
      } catch (flattenError) {
        console.error(`❌ Error flattening entry ${index}:`, flattenError, entry);
        return null;
      }
    })
    .filter(entry => entry !== null);

  console.log(`✅ Successfully flattened ${flattenedData.length} time entries`);
  console.log('📋 Sample flattened entry:', flattenedData[0]);

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
export async function updateUserRole(userId: string, role: 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user') {
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
  role: 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user'
  companyId: string
  invitedBy: string
  firstName?: string
  lastName?: string
  hourlyRate?: number
}) {
  try {
    const response = await fetch(getApiPath('invite-user'), {
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