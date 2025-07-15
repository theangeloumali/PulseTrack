import { supabase } from '@/lib/db';
import type { NewCompany, NewUser, NewProject, NewProjectMember, NewTicket, NewTimeEntry, NewComment, NewActivity, ActivityWithUser } from '@/lib/db/schema';
import { createOrUpdateTimeEntryBilling } from './billing-service';
import { getApiPath } from '@/lib/utils';
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
	commentWithUserFields,
} from './queries';

// Company operations
export async function getCompanyById(id: string) {
	const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();

	if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
	return data;
}

export async function getCompanyBySlug(slug: string) {
	const { data, error } = await supabase.from('companies').select('*').eq('slug', slug).single();

	if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
	return data;
}

export async function createCompany(data: NewCompany) {
	const { data: result, error } = await supabase.from('companies').insert(data).select().single();

	if (error) throw error;
	return result;
}

// User operations
export async function getUserById(id: string) {
	const { data, error } = await supabase.from('users').select('*').eq('id', id).single();

	if (error && error.code !== 'PGRST116') throw error;
	return data;
}

export async function getUserWithCompany(id: string) {
	const { data, error } = await supabase.from('users').select(userWithCompanyFields).eq('id', id).single();

	if (error && error.code !== 'PGRST116') throw error;
	return data;
}

export async function getUsersByCompany(companyId: string) {
	const { data, error } = await supabase.from('users').select('*').eq('company_id', companyId).order('first_name', { ascending: true });

	if (error) throw error;
	return data || [];
}

export async function createUser(data: NewUser) {
	const { data: result, error } = await supabase.from('users').insert(data).select().single();

	if (error) throw error;
	return result;
}

// Project operations
export async function getProjectById(id: string) {
	const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();

	if (error && error.code !== 'PGRST116') throw error;
	return data;
}

export async function getProjectsByCompany(companyId: string) {
	const { data, error } = await supabase.from('projects').select(projectWithRelationsFields).eq('company_id', companyId).order('created_at', { ascending: false });

	if (error) {
		throw error;
	}
	return data || [];
}

export async function createProject(data: NewProject) {
	const { data: result, error } = await supabase.from('projects').insert(data).select().single();

	if (error) {
		throw error;
	}

	// Add project owner as a project member with "lead" role
	try {
		await addProjectMember(result.id, data.owner_id, 'lead');
	} catch (memberError) {
		console.error('Failed to add project owner as member:', memberError);
	}

	// Log project creation activity
	try {
		await logProjectCreated(result.id, data.owner_id, data.name);
	} catch (activityError) {
		console.error('Failed to log project creation activity:', activityError);
	}

	return result;
}

export async function updateProject(id: string, updates: Partial<NewProject>) {
	// Get current project data to compare changes
	const currentProject = await getProjectById(id);

	const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();

	if (error) throw error;

	// Log project update activity
	if (currentProject && data) {
		try {
			await logProjectUpdated(id, data.owner_id, data.name, updates);
		} catch (activityError) {
			console.error('Failed to log project update activity:', activityError);
		}
	}

	return data;
}

export async function deleteProject(id: string) {
	const { error } = await supabase.from('projects').delete().eq('id', id);

	if (error) throw error;
}

// Project member operations
export async function addProjectMember(projectId: string, userId: string, role: 'lead' | 'member' = 'member', addedByUserId?: string) {
	const { data, error } = await supabase
		.from('project_members')
		.insert({
			project_id: projectId,
			user_id: userId,
			role,
		})
		.select()
		.single();

	if (error) throw error;

	// Log user added to project activity
	if (addedByUserId) {
		try {
			const project = await getProjectById(projectId);
			if (project) {
				await logUserAddedToProject(projectId, addedByUserId, userId, project.name, role);
			}
		} catch (activityError) {
			console.error('Failed to log user added to project activity:', activityError);
		}
	}

	return data;
}

export async function removeProjectMember(projectId: string, userId: string, removedByUserId?: string) {
	const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);

	if (error) throw error;

	// Log user removed from project activity
	if (removedByUserId) {
		try {
			const project = await getProjectById(projectId);
			if (project) {
				await logUserRemovedFromProject(projectId, removedByUserId, userId, project.name);
			}
		} catch (activityError) {
			console.error('Failed to log user removed from project activity:', activityError);
		}
	}
}

export async function getProjectMembers(projectId: string) {
	const { data, error } = await supabase
		.from('project_members')
		.select(
			`
      id,
      role,
      created_at,
      user_id,
      users!inner(${userBasicFields})
    `
		)
		.eq('project_id', projectId)
		.order('created_at', { ascending: true });

	if (error) throw error;

	// Transform the data to have the user as a single object
	const transformedData =
		data?.map((member) => ({
			...member,
			user: Array.isArray(member.users) ? member.users[0] : member.users,
		})) || [];

	return transformedData;
}

export async function getUserProjects(userId: string) {
	const { data, error } = await supabase
		.from('project_members')
		.select(
			`
      role,
      projects!project_members_project_id_projects_id_fk(${projectBasicFields})
    `
		)
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data || [];
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: 'lead' | 'member') {
	const { data, error } = await supabase.from('project_members').update({ role }).eq('project_id', projectId).eq('user_id', userId).select().single();

	if (error) throw error;
	return data;
}

// Ticket operations
export async function getTicketById(id: string) {
	const { data, error } = await supabase.from('tickets').select(ticketFullFields).eq('id', id).is('deleted_at', null).single();

	if (error && error.code !== 'PGRST116') throw error;
	return data;
}

// Secure version that validates company access
export async function getTicketByIdWithCompanyAccess(id: string, userCompanyId: string) {
	const { data, error } = await supabase.from('tickets').select(ticketFullFields).eq('id', id).eq('projects.company_id', userCompanyId).is('deleted_at', null).single();

	if (error && error.code !== 'PGRST116') throw error;
	return data;
}

export async function getTicketsByProject(projectId: string) {
	const { data, error } = await supabase.from('tickets').select(ticketWithUsersFields).eq('project_id', projectId).is('deleted_at', null).order('sort_order', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });

	if (error) throw error;
	return data || [];
}

// Secure version that validates company access through project
export async function getTicketsByProjectWithCompanyAccess(projectId: string, userCompanyId: string) {
	const { data, error } = await supabase
		.from('tickets')
		.select(
			`
      ${ticketWithUsersFields},
      projects!inner (
        id,
        company_id
      )
    `
		)
		.eq('project_id', projectId)
		.eq('projects.company_id', userCompanyId)
		.is('deleted_at', null)
		.order('sort_order', { ascending: false, nullsFirst: false })
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data || [];
}

export async function getTicketsByCompany(companyId: string) {
	const { data, error } = await supabase
		.from('tickets')
		.select(ticketWithProjectFields)
		.eq('projects.company_id', companyId)
		.is('deleted_at', null)
		.order('sort_order', { ascending: false, nullsFirst: false })
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data || [];
}

/**
 * Get tickets accessible to a user based on their role and project membership
 * - Admins (company_admin, system_admin, super_admin): See all company tickets
 * - Regular users (user, manager): See only tickets from projects they are members of
 */
export async function getAccessibleTicketsByCompany(companyId: string, userId: string, userRole: string) {
	// Admins can see all tickets in their company
	if (['super_admin', 'system_admin', 'company_admin'].includes(userRole)) {
		return getTicketsByCompany(companyId);
	}

	// For regular users, get tickets from projects they are members of
	const { data: membershipData, error: membershipError } = await supabase.from('project_members').select('project_id').eq('user_id', userId);

	if (membershipError) {
		throw membershipError;
	}

	const memberProjectIds = membershipData?.map((pm) => pm.project_id) || [];

	// If user has no project memberships, return empty array
	if (memberProjectIds.length === 0) {
		return [];
	}

	// Get tickets only from projects where user is a member
	const { data, error } = await supabase
		.from('tickets')
		.select(ticketWithProjectFields)
		.eq('projects.company_id', companyId)
		.in('project_id', memberProjectIds)
		.is('deleted_at', null)
		.order('sort_order', { ascending: false, nullsFirst: false })
		.order('created_at', { ascending: false });

	if (error) {
		throw error;
	}
	return data || [];
}

export async function createTicket(data: NewTicket) {
	const { data: result, error } = await supabase.from('tickets').insert(data).select().single();

	if (error) throw error;

	// Log ticket creation activity
	try {
		await logTicketCreated(result.id, result.project_id, result.reporter_id, result.title);
	} catch (activityError) {
		console.error('Failed to log ticket creation activity:', activityError);
	}

	return result;
}

export async function updateTicket(id: string, data: Partial<NewTicket>, updatedBy?: string) {
	// Get current ticket data to compare changes
	const currentTicket = await getTicketById(id);

	const { data: result, error } = await supabase.from('tickets').update(data).eq('id', id).select().single();

	if (error) throw error;

	// Log ticket update activity and history
	if (currentTicket && result && updatedBy) {
		try {
			await logTicketUpdated(id, result.project_id, updatedBy, result.title, data);

			// Special handling for ticket assignment
			if (data.assignee_id && data.assignee_id !== currentTicket.assignee_id) {
				await logTicketAssigned(id, result.project_id, updatedBy, data.assignee_id, result.title);
			}

			// Log detailed field changes in ticket history
			const fieldMappings = [
				{ field: 'title', oldValue: currentTicket.title, newValue: data.title },
				{
					field: 'description',
					oldValue: currentTicket.description,
					newValue: data.description,
				},
				{
					field: 'status',
					oldValue: currentTicket.status,
					newValue: data.status,
				},
				{
					field: 'priority',
					oldValue: currentTicket.priority,
					newValue: data.priority,
				},
				{
					field: 'assignee_id',
					oldValue: currentTicket.assignee_id,
					newValue: data.assignee_id,
				},
				{
					field: 'due_date',
					oldValue: currentTicket.due_date,
					newValue: data.due_date,
				},
			];

			// Log changes for each field that was updated
			for (const { field, oldValue, newValue } of fieldMappings) {
				if (newValue !== undefined && oldValue !== newValue) {
					await logTicketFieldChange(id, updatedBy, field, oldValue, newValue);
				}
			}
		} catch (activityError) {
			console.error('Failed to log ticket update activity or history:', activityError);
		}
	}

	return result;
}

/**
 * Update ticket sort orders for drag-and-drop reordering
 */
export async function updateTicketSortOrders(updates: Array<{ id: string; sort_order: number }>) {
	console.log('🔧 Service: updateTicketSortOrders called with:', updates);

	// Update each ticket individually (more reliable than RPC)
	const promises = updates.map(async ({ id, sort_order }) => {
		console.log(`🔧 Service: Updating ticket ${id} with sort_order ${sort_order}`);

		const { data, error } = await supabase.from('tickets').update({ sort_order, updated_at: new Date().toISOString() }).eq('id', id).select();

		if (error) {
			console.error('🔧 Service: Database error for ticket', id, ':', error);
			throw error;
		}

		console.log('🔧 Service: Successfully updated ticket', id, ':', data);
		return data;
	});

	try {
		const results = await Promise.all(promises);
		console.log('🔧 Service: All updates completed successfully');
		return results.flat();
	} catch (error) {
		console.error('🔧 Service: Failed to update sort orders:', error);
		throw error;
	}
}

export async function deleteTicket(id: string) {
	const { error } = await supabase
		.from('tickets')
		.update({
			deleted_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('id', id)
		.is('deleted_at', null);

	if (error) throw error;
}

// Get ticket count by project
export async function getTicketCountByProject(projectId: string) {
	const { count, error } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('project_id', projectId).is('deleted_at', null);

	if (error) throw error;
	return count || 0;
}

// Get recent tickets by project (for project dashboard)
export async function getRecentTicketsByProject(projectId: string, limit: number = 5) {
	const { data, error } = await supabase
		.from('tickets')
		.select(ticketWithUsersFields)
		.eq('project_id', projectId)
		.is('deleted_at', null)
		.order('sort_order', { ascending: false, nullsFirst: false })
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data || [];
}

// Secure version with company access validation
export async function getRecentTicketsByProjectWithCompanyAccess(projectId: string, userCompanyId: string, limit: number = 5) {
	const { data, error } = await supabase
		.from('tickets')
		.select(
			`
      ${ticketWithUsersFields},
      projects!inner (
        id,
        company_id
      )
    `
		)
		.eq('project_id', projectId)
		.eq('projects.company_id', userCompanyId)
		.is('deleted_at', null)
		.order('sort_order', { ascending: false, nullsFirst: false })
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data || [];
}

// Time entry operations
export async function getTimeEntriesByTicket(ticketId: string) {
	const { data, error } = await supabase.from('time_entries').select(timeEntryWithUserFields).eq('ticket_id', ticketId).order('start_time', { ascending: false });

	if (error) throw error;
	return data || [];
}

export async function getTimeEntriesByUser(userId: string, limit?: number): Promise<any[]> {
	let query = supabase.from('time_entries').select(timeEntryWithTicketFields).eq('user_id', userId).order('start_time', { ascending: false });

	if (limit) {
		query = query.limit(limit);
	}

	const { data, error } = await query;

	if (error) throw error;
	return data || [];
}

export async function createTimeEntry(data: NewTimeEntry) {
	const { data: result, error } = await supabase.from('time_entries').insert(data).select().single();

	if (error) throw error;

	// Log time entry creation activity
	if (result && result.duration && result.duration > 0) {
		try {
			// Get ticket and project info for activity logging
			const { data: ticketData } = await supabase.from('tickets').select('title, project_id, projects(company_id)').eq('id', result.ticket_id).single();

			const projects = Array.isArray(ticketData?.projects) ? ticketData.projects[0] : ticketData?.projects;
			const companyId = projects?.company_id;

			// Log activity
			if (ticketData?.project_id && ticketData?.title) {
				await logTimeEntryCreated(ticketData.project_id, result.ticket_id, result.user_id, result.duration, ticketData.title);
			}

			// Create billing record
			if (companyId) {
				await createOrUpdateTimeEntryBilling(result.id, companyId);
			}
		} catch (billingError) {
			// Log error but don't fail the time entry creation
			console.error('Failed to create billing record or log activity for time entry:', billingError);
		}
	}

	return result;
}

export async function updateTimeEntry(id: string, data: Partial<NewTimeEntry>) {
	const { data: result, error } = await supabase.from('time_entries').update(data).eq('id', id).select().single();

	if (error) throw error;

	// Recalculate billing if the entry has duration (including when duration is updated)
	if (result && result.duration && result.duration > 0) {
		try {
			// Get company_id from the ticket's project
			const { data: ticketData } = await supabase.from('tickets').select('projects(company_id)').eq('id', result.ticket_id).single();

			const projects = Array.isArray(ticketData?.projects) ? ticketData.projects[0] : ticketData?.projects;
			const companyId = projects?.company_id;
			if (companyId) {
				await createOrUpdateTimeEntryBilling(result.id, companyId);
			}
		} catch (billingError) {
			// Log error but don't fail the time entry update
			console.error('Failed to update billing record for time entry:', billingError);
		}
	}

	return result;
}

export async function deleteTimeEntry(id: string) {
	// Get the current authenticated user
	const {
		data: { user: authUser },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !authUser) {
		throw new Error('Authentication required to delete time entries');
	}

	// Get user profile with role information
	const { data: currentUser, error: userError } = await supabase.from('users').select('id, role, company_id').eq('id', authUser.id).single();

	if (userError || !currentUser) {
		throw new Error('User profile not found');
	}

	// Get the time entry with billing information
	const { data: timeEntry, error: fetchError } = await supabase
		.from('time_entries')
		.select(
			`
      id,
      user_id,
      ticket_id,
      start_time,
      duration,
      description,
      time_entry_billing (
        id,
        billing_period_id,
        billing_periods (
          id,
          payment_status,
          name
        )
      )
    `
		)
		.eq('id', id)
		.single();

	if (fetchError || !timeEntry) {
		throw new Error('Time entry not found');
	}

	// Check if time entry is associated with a paid billing period
	const billingRecord = timeEntry.time_entry_billing as any;
	const isPaidPeriod = billingRecord?.billing_periods?.payment_status === 'paid';

	// Role-based permission checks
	const isSuperAdmin = currentUser.role === 'super_admin';
	const isSystemAdmin = currentUser.role === 'system_admin';
	const isCompanyAdmin = currentUser.role === 'company_admin';
	const isManager = currentUser.role === 'manager';
	const isOwner = timeEntry.user_id === currentUser.id;

	// Super admins can delete anything
	if (isSuperAdmin) {
		// Proceed with deletion - super admin override
	}
	// For paid periods, only super admins can delete
	else if (isPaidPeriod) {
		throw new Error('Only super administrators can delete time entries from paid billing periods. This protects financial audit trails.');
	}
	// System/Company admins and managers can delete within their company
	else if (isSystemAdmin || isCompanyAdmin || isManager) {
		// Need to verify the time entry belongs to their company
		const { data: entryUser, error: entryUserError } = await supabase.from('users').select('company_id').eq('id', timeEntry.user_id).single();

		if (entryUserError || !entryUser) {
			throw new Error('Cannot verify time entry ownership');
		}

		if (entryUser.company_id !== currentUser.company_id) {
			throw new Error('You can only delete time entries from your company');
		}
	}
	// Regular users can only delete their own time entries
	else if (isOwner) {
		// User can delete their own time entry (if not billed)
	} else {
		throw new Error('You do not have permission to delete this time entry');
	}

	// Proceed with deletion
	const { error } = await supabase.from('time_entries').delete().eq('id', id);

	if (error) throw error;

	// Return deletion info for logging/audit purposes
	return {
		deletedTimeEntryId: id,
		deletedByUserId: currentUser.id,
		deletedByRole: currentUser.role,
		wasPaidPeriod: isPaidPeriod,
		billingPeriodName: billingRecord?.billing_periods?.name || null,
	};
}

export async function getActiveTimeEntry(userId: string) {
	const { data, error } = await supabase.from('time_entries').select(timeEntryWithTicketFields).eq('user_id', userId).is('end_time', null).maybeSingle();

	if (error) throw error;
	return data;
}

export async function getTotalTimeByTicket(ticketId: string): Promise<number> {
	const { data, error } = await supabase.from('time_entries').select('duration').eq('ticket_id', ticketId).not('duration', 'is', null);

	if (error) throw error;

	const totalSeconds = (data || []).reduce((sum, entry) => sum + (entry.duration || 0), 0);
	return totalSeconds;
}

export async function getTotalTimeByUser(userId: string, dateFrom?: string, dateTo?: string): Promise<number> {
	let query = supabase.from('time_entries').select('duration').eq('user_id', userId).not('duration', 'is', null);

	if (dateFrom) {
		query = query.gte('start_time', dateFrom);
	}

	if (dateTo) {
		query = query.lte('start_time', dateTo);
	}

	const { data, error } = await query;

	if (error) throw error;

	const totalSeconds = (data || []).reduce((sum, entry) => sum + (entry.duration || 0), 0);
	return totalSeconds;
}

export async function getUsersInCompany(companyId: string) {
	const { data, error } = await supabase.from('users').select(userBasicFields).eq('company_id', companyId).order('first_name', { ascending: true });

	if (error) throw error;
	return data || [];
}

// Get projects with ticket counts for a company
export async function getProjectsWithTicketCounts(companyId: string) {
	const { data, error } = await supabase
		.from('projects')
		.select(
			`
      ${projectBasicFields},
      companies (
        ${companyBasicFields}
      ),
      users:owner_id (
        ${userBasicFields}
      ),
      ticket_count:tickets(count)
    `
		)
		.eq('company_id', companyId)
		.order('created_at', { ascending: false });

	if (error) {
		throw error;
	}

	// Transform the data to include ticket_count as a number
	const transformedData = (data || []).map((project) => ({
		...project,
		ticket_count: project.ticket_count?.[0]?.count || 0,
	}));

	return transformedData;
}

/**
 * Get projects accessible to a user based on their role and membership
 * - Admins (company_admin, system_admin, super_admin): See all company projects
 * - Regular users (user, manager): See only projects they are explicitly assigned to as members
 */
export async function getAccessibleProjectsByCompany(companyId: string, userId: string, userRole: string) {
	// Admins can see all projects in their company
	if (['super_admin', 'system_admin', 'company_admin'].includes(userRole)) {
		return getProjectsByCompany(companyId);
	}

	// For regular users, get ONLY projects they are explicitly assigned to as members
	const { data: membershipData, error: membershipError } = await supabase.from('project_members').select('project_id').eq('user_id', userId);

	if (membershipError) {
		throw membershipError;
	}

	const memberProjectIds = membershipData?.map((pm) => pm.project_id) || [];

	// If user has no project memberships, return empty array
	if (memberProjectIds.length === 0) {
		return [];
	}

	// Get only projects where user is explicitly a member
	const { data, error } = await supabase.from('projects').select(projectWithRelationsFields).eq('company_id', companyId).in('id', memberProjectIds).order('created_at', { ascending: false });

	if (error) {
		throw error;
	}
	return data || [];
}

/**
 * Get projects with ticket counts accessible to a user based on their role and membership
 * - Admins (company_admin, system_admin, super_admin): See all company projects
 * - Regular users (user, manager): See only projects they are explicitly assigned to as members
 */
export async function getAccessibleProjectsWithTicketCounts(companyId: string, userId: string, userRole: string) {
	// Admins can see all projects in their company
	if (['super_admin', 'system_admin', 'company_admin'].includes(userRole)) {
		return getProjectsWithTicketCounts(companyId);
	}

	// For regular users, get ONLY projects they are explicitly assigned to as members
	const { data: membershipData, error: membershipError } = await supabase.from('project_members').select('project_id').eq('user_id', userId);

	if (membershipError) {
		throw membershipError;
	}

	const memberProjectIds = membershipData?.map((pm) => pm.project_id) || [];

	// If user has no project memberships, return empty array
	if (memberProjectIds.length === 0) {
		return [];
	}

	// Get full project data with ticket counts for accessible projects
	const { data, error } = await supabase
		.from('projects')
		.select(
			`
      ${projectBasicFields},
      companies (
        ${companyBasicFields}
      ),
      users:owner_id (
        ${userBasicFields}
      ),
      ticket_count:tickets(count)
    `
		)
		.eq('company_id', companyId)
		.in('id', memberProjectIds)
		.order('created_at', { ascending: false });

	if (error) {
		throw error;
	}

	// Transform the data to include ticket_count as a number
	const transformedData = (data || []).map((project) => ({
		...project,
		ticket_count: project.ticket_count?.[0]?.count || 0,
	}));

	return transformedData;
}

/**
 * Check if a user can manage project members based on role and project access
 */
export async function canUserManageProjectMembers(userId: string, projectId: string): Promise<boolean> {
	// Get user information
	const { data: user, error: userError } = await supabase.from('users').select('id, role, company_id').eq('id', userId).single();

	if (userError || !user) {
		return false;
	}

	// Admins can manage all project members in their company
	if (['super_admin', 'system_admin', 'company_admin'].includes(user.role)) {
		// Verify project is in their company
		const { data: project, error: projectError } = await supabase.from('projects').select('id, company_id, owner_id').eq('id', projectId).single();

		if (projectError || !project) {
			return false;
		}

		// Super/system admins can manage any project, company admins only their company
		if (user.role === 'super_admin' || user.role === 'system_admin') {
			return true;
		}

		return project.company_id === user.company_id;
	}

	// Check if user is project owner
	const { data: project, error: projectError } = await supabase.from('projects').select('id, owner_id, company_id').eq('id', projectId).eq('company_id', user.company_id).single();

	if (projectError || !project) {
		return false;
	}

	if (project.owner_id === userId) {
		return true;
	}

	// Check if user is a project lead
	const { data: membership, error: membershipError } = await supabase.from('project_members').select('role').eq('project_id', projectId).eq('user_id', userId).single();

	if (membershipError || !membership) {
		return false;
	}

	return membership.role === 'lead';
}

/**
 * Get time entries for billing within a company and date range.
 * Includes joins to tickets, projects, and users for comprehensive data.
 * IMPORTANT: This function intentionally includes time entries from soft-deleted tickets
 * to preserve billing integrity and historical data for invoicing purposes.
 */
export async function getTimeEntriesForBilling(companyId: string, startDate: string, endDate: string) {
	console.log('🔍 Fetching time entries for billing:', {
		companyId,
		startDate,
		endDate,
	});

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

	console.log('📊 Found time entries for billing:', data?.length || 0);
	return data || [];
}

export async function getTimeEntriesForBillingByUser(companyId: string, targetUserId: string, startDate: string, endDate: string) {
	// First validate that the target user belongs to the company
	const { data: userValidation, error: userError } = await supabase.from('users').select('id, company_id, first_name, last_name').eq('id', targetUserId).eq('company_id', companyId).single();

	if (userError || !userValidation) {
		throw new Error('Target user not found or does not belong to the company');
	}

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
		.eq('user_id', targetUserId) // KEY DIFFERENCE: Filter by specific user
		.gte('start_time', startDate)
		.lte('start_time', endDateString)
		.not('duration', 'is', null)
		.gt('duration', 0)
		.order('start_time', { ascending: true });

	if (error) {
		console.error('❌ Error fetching time entries for billing by user:', error);
		throw new Error(`Failed to fetch time entries for user: ${error.message}`);
	}
	return data || [];
}

// Company User Management Operations

/**
 * Get all users in a company with their details
 */
export async function getCompanyUsers(companyId: string) {
	const { data, error } = await supabase
		.from('users')
		.select(
			`
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
    `
		)
		.eq('company_id', companyId)
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data || [];
}

/**
 * Update user role and status
 */
export async function updateUserRole(userId: string, role: 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user') {
	const { data, error } = await supabase.from('users').update({ role, updated_at: new Date().toISOString() }).eq('id', userId).select().single();

	if (error) throw error;
	return data;
}

/**
 * Update user status (active/inactive)
 */
export async function updateUserStatus(userId: string, status: 'active' | 'inactive') {
	const { data, error } = await supabase.from('users').update({ status, updated_at: new Date().toISOString() }).eq('id', userId).select().single();

	if (error) throw error;
	return data;
}

/**
 * Update user hourly rate
 */
export async function updateUserHourlyRate(userId: string, hourlyRate: number | null) {
	const { data, error } = await supabase.from('users').update({ hourly_rate: hourlyRate, updated_at: new Date().toISOString() }).eq('id', userId).select().single();

	if (error) throw error;
	return data;
}

/**
 * Remove user from company (set as inactive)
 */
export async function removeUserFromCompany(userId: string) {
	const { data, error } = await supabase
		.from('users')
		.update({
			status: 'inactive',
			updated_at: new Date().toISOString(),
		})
		.eq('id', userId)
		.select()
		.single();

	if (error) throw error;
	return data;
}

/**
 * Get users available for assignment (active users in company)
 */
export async function getAssignableUsers(companyId: string) {
	const { data, error } = await supabase
		.from('users')
		.select(
			`
      id,
      first_name,
      last_name,
      email,
      role,
      avatar_url
    `
		)
		.eq('company_id', companyId)
		.eq('status', 'active')
		.order('first_name', { ascending: true });

	if (error) throw error;
	return data || [];
}

/**
 * Invite user to company (creates user record with invited status)
 */
export async function inviteUserToCompany(data: { email: string; role: 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user'; companyId: string; invitedBy: string; firstName?: string; lastName?: string; hourlyRate?: number }) {
	try {
		const response = await fetch(getApiPath('invite-user'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		const result = await response.json();

		if (!response.ok) {
			throw new Error(result.error || 'Failed to invite user');
		}

		return result.data;
	} catch (error) {
		throw error;
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
		.single();

	if (error) throw error;
	return data;
}

// ==============================================
// ACTIVITY LOGGING OPERATIONS
// ==============================================

/**
 * Create a new activity log entry
 */
export async function createActivity(data: NewActivity) {
	const { data: result, error } = await supabase.from('activities').insert(data).select().single();

	if (error) throw error;
	return result;
}

/**
 * Get activities for a specific project with user details
 */
export async function getProjectActivities(projectId: string, limit: number = 50) {
	const { data, error } = await supabase
		.from('activities')
		.select(
			`
      id,
      type,
      title,
      description,
      metadata,
      created_at,
      updated_at,
      user_id,
      target_user_id,
      project_id,
      ticket_id,
      user:users!activities_user_id_users_id_fk (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      target_user:users!activities_target_user_id_users_id_fk (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      project:projects (
        id,
        name
      ),
      ticket:tickets (
        id,
        title
      )
    `
		)
		.eq('project_id', projectId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data || [];
}

/**
 * Get activities for a specific user
 */
export async function getUserActivities(userId: string, limit: number = 50) {
	const { data, error } = await supabase
		.from('activities')
		.select(
			`
      id,
      type,
      title,
      description,
      metadata,
      created_at,
      updated_at,
      user_id,
      target_user_id,
      project_id,
      ticket_id,
      user:users!activities_user_id_users_id_fk (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      target_user:users!activities_target_user_id_users_id_fk (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      project:projects (
        id,
        name
      ),
      ticket:tickets (
        id,
        title
      )
    `
		)
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data || [];
}

/**
 * Get recent activities across accessible projects for a user
 * This respects project visibility and membership
 */
export async function getRecentActivitiesForUser(userId: string, limit: number = 20) {
	// First get user's accessible projects
	const { data: userProjects, error: projectError } = await supabase.from('project_members').select('project_id').eq('user_id', userId);

	if (projectError) throw projectError;

	const projectIds = userProjects?.map((p) => p.project_id) || [];

	if (projectIds.length === 0) {
		return [];
	}

	const { data, error } = await supabase
		.from('activities')
		.select(
			`
      id,
      type,
      title,
      description,
      metadata,
      created_at,
      updated_at,
      user_id,
      target_user_id,
      project_id,
      ticket_id,
      user:users!activities_user_id_users_id_fk (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      target_user:users!activities_target_user_id_users_id_fk (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      project:projects (
        id,
        name
      ),
      ticket:tickets (
        id,
        title
      )
    `
		)
		.in('project_id', projectIds)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data || [];
}

/**
 * Get company-wide activities (only for admins)
 */
export async function getCompanyActivities(companyId: string, limit: number = 50) {
	const { data, error } = await supabase
		.from('activities')
		.select(
			`
      id,
      type,
      title,
      description,
      metadata,
      created_at,
      updated_at,
      user_id,
      target_user_id,
      project_id,
      ticket_id,
      user:users!activities_user_id_users_id_fk (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      target_user:users!activities_target_user_id_users_id_fk (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      project:projects!inner (
        id,
        name,
        company_id
      ),
      ticket:tickets (
        id,
        title
      )
    `
		)
		.eq('project.company_id', companyId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data || [];
}

// ==============================================
// ACTIVITY HELPER FUNCTIONS
// ==============================================

/**
 * Log project creation activity
 */
export async function logProjectCreated(projectId: string, userId: string, projectName: string) {
	return await createActivity({
		type: 'project_created',
		project_id: projectId,
		user_id: userId,
		title: `Created project "${projectName}"`,
		description: `Project "${projectName}" was created`,
		metadata: { projectName },
	});
}

/**
 * Log project update activity
 */
export async function logProjectUpdated(projectId: string, userId: string, projectName: string, changes: Record<string, any>) {
	return await createActivity({
		type: 'project_updated',
		project_id: projectId,
		user_id: userId,
		title: `Updated project "${projectName}"`,
		description: `Project "${projectName}" was updated`,
		metadata: { projectName, changes },
	});
}

/**
 * Log ticket creation activity
 */
export async function logTicketCreated(ticketId: string, projectId: string, userId: string, ticketTitle: string) {
	return await createActivity({
		type: 'ticket_created',
		project_id: projectId,
		ticket_id: ticketId,
		user_id: userId,
		title: `Created ticket "${ticketTitle}"`,
		description: `New ticket "${ticketTitle}" was created`,
		metadata: { ticketTitle },
	});
}

/**
 * Log ticket update activity
 */
export async function logTicketUpdated(ticketId: string, projectId: string, userId: string, ticketTitle: string, changes: Record<string, any>) {
	return await createActivity({
		type: 'ticket_updated',
		project_id: projectId,
		ticket_id: ticketId,
		user_id: userId,
		title: `Updated ticket "${ticketTitle}"`,
		description: `Ticket "${ticketTitle}" was updated`,
		metadata: { ticketTitle, changes },
	});
}

/**
 * Log ticket assignment activity
 */
export async function logTicketAssigned(ticketId: string, projectId: string, userId: string, assigneeId: string, ticketTitle: string) {
	return await createActivity({
		type: 'ticket_assigned',
		project_id: projectId,
		ticket_id: ticketId,
		user_id: userId,
		target_user_id: assigneeId,
		title: `Assigned ticket "${ticketTitle}"`,
		description: `Ticket "${ticketTitle}" was assigned`,
		metadata: { ticketTitle },
	});
}

/**
 * Log user added to project activity
 */
export async function logUserAddedToProject(projectId: string, userId: string, targetUserId: string, projectName: string, role: string) {
	return await createActivity({
		type: 'user_added_to_project',
		project_id: projectId,
		user_id: userId,
		target_user_id: targetUserId,
		title: `Added user to project "${projectName}"`,
		description: `User was added to project "${projectName}" as ${role}`,
		metadata: { projectName, role },
	});
}

/**
 * Log user removed from project activity
 */
export async function logUserRemovedFromProject(projectId: string, userId: string, targetUserId: string, projectName: string) {
	return await createActivity({
		type: 'user_removed_from_project',
		project_id: projectId,
		user_id: userId,
		target_user_id: targetUserId,
		title: `Removed user from project "${projectName}"`,
		description: `User was removed from project "${projectName}"`,
		metadata: { projectName },
	});
}

/**
 * Log time entry creation activity
 */
export async function logTimeEntryCreated(projectId: string, ticketId: string, userId: string, duration: number, ticketTitle: string) {
	const hours = Math.round((duration / 3600) * 100) / 100; // Convert seconds to hours with 2 decimal places
	return await createActivity({
		type: 'time_entry_created',
		project_id: projectId,
		ticket_id: ticketId,
		user_id: userId,
		title: `Logged ${hours}h on "${ticketTitle}"`,
		description: `${hours} hours logged on ticket "${ticketTitle}"`,
		metadata: { ticketTitle, duration, hours },
	});
}

// ==============================================
// TICKET HISTORY FUNCTIONS
// ==============================================

/**
 * Create a ticket history entry
 */
export async function createTicketHistory(data: NewTicketHistory) {
	const { data: result, error } = await supabase.from('ticket_history').insert(data).select().single();

	if (error) throw error;
	return result;
}

/**
 * Get ticket history for a specific ticket
 */
export async function getTicketHistory(ticketId: string) {
	const { data, error } = await supabase
		.from('ticket_history')
		.select(
			`
      *,
      users(first_name, last_name, email)
    `
		)
		.eq('ticket_id', ticketId)
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data || [];
}

/**
 * Log ticket field changes
 */
export async function logTicketFieldChange(ticketId: string, userId: string, fieldName: string, oldValue: string | null, newValue: string | null) {
	// Only log if values are actually different
	if (oldValue === newValue) return null;

	return await createTicketHistory({
		ticket_id: ticketId,
		user_id: userId,
		field_name: fieldName,
		old_value: oldValue,
		new_value: newValue,
	});
}

// ==============================================
// DATABASE HEALTH CHECK FUNCTIONS
// ==============================================

/**
 * Check for orphaned time entries and provide repair suggestions
 */
export async function checkTimeEntryIntegrity(companyId: string) {
	console.log('🔍 Running time entry integrity check for company:', companyId);

	const issues = {
		orphanedEntries: [],
		missingUsers: [],
		missingTickets: [],
		missingProjects: [],
		summary: {
			totalChecked: 0,
			totalIssues: 0,
			orphanedCount: 0,
		},
	};

	try {
		// Get all time entries for the company
		const { data: timeEntries, error: entriesError } = await supabase
			.from('time_entries')
			.select(
				`
        id,
        user_id,
        ticket_id,
        start_time,
        duration,
        tickets!left (
          id,
          title,
          deleted_at,
          projects!left (
            id,
            name,
            company_id
          )
        ),
        users!left (
          id,
          first_name,
          last_name
        )
      `
			)
			.eq('tickets.projects.company_id', companyId)
			.not('duration', 'is', null)
			.gt('duration', 0);

		if (entriesError) {
			throw new Error(`Failed to fetch time entries: ${entriesError.message}`);
		}

		issues.summary.totalChecked = timeEntries?.length || 0;

		if (!timeEntries || timeEntries.length === 0) {
			console.log('✅ No time entries found for this company');
			return issues;
		}

		timeEntries.forEach((entry, index) => {
			let hasIssues = false;

			// Check for missing user
			if (!entry.users) {
				issues.missingUsers.push({
					timeEntryId: entry.id,
					userId: entry.user_id,
					startTime: entry.start_time,
				});
				hasIssues = true;
			}

			// Check for missing ticket
			if (!entry.tickets) {
				issues.missingTickets.push({
					timeEntryId: entry.id,
					ticketId: entry.ticket_id,
					startTime: entry.start_time,
				});
				hasIssues = true;
			} else {
				// Check for missing project (if ticket exists)
				if (!entry.tickets.projects) {
					issues.missingProjects.push({
						timeEntryId: entry.id,
						ticketId: entry.ticket_id,
						ticketTitle: entry.tickets.title,
						startTime: entry.start_time,
					});
					hasIssues = true;
				}
			}

			// Check for completely orphaned entries
			if (!entry.users && !entry.tickets) {
				issues.orphanedEntries.push({
					timeEntryId: entry.id,
					userId: entry.user_id,
					ticketId: entry.ticket_id,
					startTime: entry.start_time,
					duration: entry.duration,
				});
				hasIssues = true;
			}

			if (hasIssues) {
				issues.summary.totalIssues++;
			}
		});

		issues.summary.orphanedCount = issues.orphanedEntries.length;

		console.log('📊 Time entry integrity check results:', {
			totalChecked: issues.summary.totalChecked,
			totalIssues: issues.summary.totalIssues,
			orphanedEntries: issues.orphanedEntries.length,
			missingUsers: issues.missingUsers.length,
			missingTickets: issues.missingTickets.length,
			missingProjects: issues.missingProjects.length,
		});

		return issues;
	} catch (error) {
		console.error('❌ Error during time entry integrity check:', error);
		throw error;
	}
}

/**
 * Clean up orphaned time entries (use with caution)
 */
export async function cleanupOrphanedTimeEntries(companyId: string, dryRun: boolean = true) {
	console.log('🧹 Starting orphaned time entries cleanup (dry run:', dryRun, ')');

	const integrityCheck = await checkTimeEntryIntegrity(companyId);
	const cleanupResults = {
		deletedEntries: [],
		errors: [],
		summary: {
			totalDeleted: 0,
			totalErrors: 0,
		},
	};

	if (integrityCheck.orphanedEntries.length === 0) {
		console.log('✅ No orphaned time entries found to clean up');
		return cleanupResults;
	}

	if (dryRun) {
		console.log(
			'🔍 DRY RUN - Would delete the following orphaned entries:',
			integrityCheck.orphanedEntries.map((e) => e.timeEntryId)
		);
		return {
			...cleanupResults,
			wouldDelete: integrityCheck.orphanedEntries,
		};
	}

	// Actual deletion (only if dryRun is false)
	for (const orphanedEntry of integrityCheck.orphanedEntries) {
		try {
			const { error } = await supabase.from('time_entries').delete().eq('id', orphanedEntry.timeEntryId);

			if (error) {
				cleanupResults.errors.push({
					timeEntryId: orphanedEntry.timeEntryId,
					error: error.message,
				});
				cleanupResults.summary.totalErrors++;
			} else {
				cleanupResults.deletedEntries.push(orphanedEntry.timeEntryId);
				cleanupResults.summary.totalDeleted++;
			}
		} catch (error) {
			cleanupResults.errors.push({
				timeEntryId: orphanedEntry.timeEntryId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			cleanupResults.summary.totalErrors++;
		}
	}

	console.log('✅ Cleanup completed:', cleanupResults.summary);
	return cleanupResults;
}
