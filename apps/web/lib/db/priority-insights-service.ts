import {supabase} from '@/lib/db';
import type {UserRole} from '@/lib/db/schema';

export interface PriorityItem {
  id: string;
  title: string;
  description: string;
  type: 'overdue' | 'urgent' | 'blocked' | 'deadline';
  priority: 'high' | 'medium' | 'low';
  daysOverdue?: number;
  assignee?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  href: string;
  dueDate?: string;
  createdAt: string;
}

export interface PriorityInsightsData {
  overdue: PriorityItem[];
  urgent: PriorityItem[];
  blocked: PriorityItem[];
  upcomingDeadlines: PriorityItem[];
}

// Shape of a ticket row returned by the priority-insights select (with embeds)
interface RawPriorityTicket {
  id: string;
  title: string;
  description: string | null;
  priority: PriorityItem['priority'];
  status: string;
  due_date: string | null;
  created_at: string;
  project_id: string;
  assignee_id: string | null;
  projects: {name: string | null; company_id: string} | null;
  assignee: {id: string; first_name: string | null; last_name: string | null} | null;
}

export async function getPriorityInsights(
  userId: string,
  companyId: string,
  userRole: UserRole,
): Promise<PriorityInsightsData> {
  // Get accessible project IDs based on user role
  let accessibleProjectIds: string[] = [];

  if (['super_admin', 'system_admin', 'company_admin'].includes(userRole)) {
    // Admins can see all company projects
    const {data: allProjects} = await supabase
      .from('projects')
      .select('id')
      .eq('company_id', companyId);
    accessibleProjectIds = allProjects?.map((p) => p.id) || [];
  } else {
    // Regular users can only see projects they're members of
    const {data: userProjects} = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);
    accessibleProjectIds = userProjects?.map((p) => p.project_id) || [];
  }

  if (accessibleProjectIds.length === 0) {
    return {
      overdue: [],
      urgent: [],
      blocked: [],
      upcomingDeadlines: [],
    };
  }

  const currentDate = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(currentDate.getDate() + 3);

  // Base query for tickets with project and assignee info.
  // tickets has no company_id — company is reached through the project join.
  // assignee uses an explicit FK hint and the real first_name/last_name columns.
  const baseSelect = `
    id,
    title,
    description,
    priority,
    status,
    due_date,
    created_at,
    project_id,
    assignee_id,
    projects!inner(name, company_id),
    assignee:users!tickets_assignee_id_users_id_fk(id, first_name, last_name)
  `;

  const [overdueResult, urgentResult, upcomingResult] = await Promise.all([
    // Get overdue tickets (past due date and not completed)
    supabase
      .from('tickets')
      .select(baseSelect)
      .eq('projects.company_id', companyId)
      .in('project_id', accessibleProjectIds)
      .not('due_date', 'is', null)
      .lt('due_date', currentDate.toISOString())
      .neq('status', 'done')
      .order('due_date', {ascending: true}),

    // Get urgent tickets (high priority, created recently, not done)
    supabase
      .from('tickets')
      .select(baseSelect)
      .eq('projects.company_id', companyId)
      .in('project_id', accessibleProjectIds)
      .eq('priority', 'high')
      .neq('status', 'done')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', {ascending: false})
      .limit(10),

    // Get upcoming deadline tickets (due within 3 days, not done)
    supabase
      .from('tickets')
      .select(baseSelect)
      .eq('projects.company_id', companyId)
      .in('project_id', accessibleProjectIds)
      .not('due_date', 'is', null)
      .gte('due_date', currentDate.toISOString())
      .lte('due_date', threeDaysFromNow.toISOString())
      .neq('status', 'done')
      .order('due_date', {ascending: true}),
  ]);

  // Helper function to calculate days overdue
  const calculateDaysOverdue = (dueDate: string): number => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Transform to PriorityItem format
  const transformTicket = (ticket: RawPriorityTicket, type: PriorityItem['type']): PriorityItem => {
    const assigneeName = ticket.assignee
      ? [ticket.assignee.first_name, ticket.assignee.last_name].filter(Boolean).join(' ').trim()
      : '';

    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description || '',
      type,
      priority: ticket.priority,
      daysOverdue:
        ticket.due_date && type === 'overdue' ? calculateDaysOverdue(ticket.due_date) : undefined,
      assignee: ticket.assignee
        ? {
            id: ticket.assignee.id,
            name: assigneeName || 'Unknown User',
          }
        : undefined,
      project: ticket.projects
        ? {
            id: ticket.project_id,
            name: ticket.projects.name || 'Unknown Project',
          }
        : undefined,
      href: `/tickets/${ticket.id}`,
      dueDate: ticket.due_date || undefined,
      createdAt: ticket.created_at,
    };
  };

  // Supabase infers to-one embeds as arrays; at runtime PostgREST returns single
  // objects for these many-to-one joins, so normalize the result type here.
  const toRows = (data: unknown): RawPriorityTicket[] => (data as RawPriorityTicket[] | null) ?? [];

  return {
    overdue: toRows(overdueResult.data).map((ticket) => transformTicket(ticket, 'overdue')),
    urgent: toRows(urgentResult.data).map((ticket) => transformTicket(ticket, 'urgent')),
    // 'blocked' is not a valid ticket status in the live schema; no blocked signal exists yet.
    blocked: [],
    upcomingDeadlines: toRows(upcomingResult.data).map((ticket) =>
      transformTicket(ticket, 'deadline'),
    ),
  };
}
