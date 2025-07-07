import { supabase } from "@/lib/db";
import type { UserRole } from "@/lib/db/schema";

export interface PriorityItem {
  id: string;
  title: string;
  description: string;
  type: "overdue" | "urgent" | "blocked" | "deadline";
  priority: "high" | "medium" | "low";
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

export async function getPriorityInsights(
  userId: string,
  companyId: string,
  userRole: UserRole,
): Promise<PriorityInsightsData> {
  // Get accessible project IDs based on user role
  let accessibleProjectIds: string[] = [];

  if (["super_admin", "system_admin", "company_admin"].includes(userRole)) {
    // Admins can see all company projects
    const { data: allProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("company_id", companyId);
    accessibleProjectIds = allProjects?.map((p) => p.id) || [];
  } else {
    // Regular users can only see projects they're members of
    const { data: userProjects } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);
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

  // Base query for tickets with project and assignee info
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
    projects!inner(name),
    assignee:users(id, full_name)
  `;

  const [overdueResult, urgentResult, blockedResult, upcomingResult] = await Promise.all([
    // Get overdue tickets (past due date and not completed)
    supabase
      .from("tickets")
      .select(baseSelect)
      .eq("company_id", companyId)
      .in("project_id", accessibleProjectIds)
      .not("due_date", "is", null)
      .lt("due_date", currentDate.toISOString())
      .neq("status", "done")
      .order("due_date", { ascending: true }),

    // Get urgent tickets (high priority, created recently, not done)
    supabase
      .from("tickets")
      .select(baseSelect)
      .eq("company_id", companyId)
      .in("project_id", accessibleProjectIds)
      .eq("priority", "high")
      .neq("status", "done")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10),

    // Get blocked tickets
    supabase
      .from("tickets")
      .select(baseSelect)
      .eq("company_id", companyId)
      .in("project_id", accessibleProjectIds)
      .eq("status", "blocked")
      .order("created_at", { ascending: false }),

    // Get upcoming deadline tickets (due within 3 days, not done)
    supabase
      .from("tickets")
      .select(baseSelect)
      .eq("company_id", companyId)
      .in("project_id", accessibleProjectIds)
      .not("due_date", "is", null)
      .gte("due_date", currentDate.toISOString())
      .lte("due_date", threeDaysFromNow.toISOString())
      .neq("status", "done")
      .order("due_date", { ascending: true }),
  ]);

  // Helper function to calculate days overdue
  const calculateDaysOverdue = (dueDate: string): number => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Transform to PriorityItem format
  const transformTicket = (ticket: any, type: PriorityItem["type"]): PriorityItem => ({
    id: ticket.id,
    title: ticket.title,
    description: ticket.description || "",
    type,
    priority: ticket.priority,
    daysOverdue: ticket.due_date && type === "overdue" 
      ? calculateDaysOverdue(ticket.due_date) 
      : undefined,
    assignee: ticket.assignee ? {
      id: ticket.assignee.id,
      name: ticket.assignee.full_name || "Unknown User",
    } : undefined,
    project: ticket.projects ? {
      id: ticket.project_id,
      name: ticket.projects.name || "Unknown Project",
    } : undefined,
    href: `/tickets/${ticket.id}`,
    dueDate: ticket.due_date,
    createdAt: ticket.created_at,
  });

  return {
    overdue: (overdueResult.data || []).map((ticket) => transformTicket(ticket, "overdue")),
    urgent: (urgentResult.data || []).map((ticket) => transformTicket(ticket, "urgent")),
    blocked: (blockedResult.data || []).map((ticket) => transformTicket(ticket, "blocked")),
    upcomingDeadlines: (upcomingResult.data || []).map((ticket) => 
      transformTicket(ticket, "deadline")
    ),
  };
}