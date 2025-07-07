import { supabase } from "@/lib/db";
import {
  subDays,
  startOfDay,
  endOfDay,
  startOfToday,
  startOfWeek,
  startOfMonth,
} from "date-fns";
import type { UserRole } from "@/lib/db/schema";

export async function getMyWeeklySummary(userId: string) {
  const sevenDaysAgo = subDays(new Date(), 7);

  const { data, error } = await supabase
    .from("time_entries")
    .select(
      `
            id,
            duration,
            description,
            start_time,
            ticket:tickets!inner(title),
            user:users!inner(hourly_rate),
            time_entry_billing (
                hourly_rate,
                billable_amount,
                is_billable
            )
        `,
    )
    .eq("user_id", userId)
    .gte("start_time", startOfDay(sevenDaysAgo).toISOString())
    .lte("start_time", endOfDay(new Date()).toISOString())
    .order("start_time", { ascending: false });

  if (error) throw error;

  return data || [];
}

export interface DashboardStatistics {
  projects: {
    total: number;
    active: number;
    completed: number;
    archived: number;
  };
  tickets: {
    total: number;
    new: number;
    in_progress: number;
    review: number;
    done: number;
  };
  timeTracking: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  team: {
    totalMembers: number;
    activeMembers: number;
  };
  billing?: {
    monthlyEarnings: number;
    pendingPayments: number;
    paidAmount: number;
  };
}

export async function getDashboardStatistics(
  userId: string,
  companyId: string,
  userRole: UserRole,
): Promise<DashboardStatistics> {
  const isAdmin = ["super_admin", "system_admin", "company_admin"].includes(
    userRole,
  );
  const isManager = userRole === "manager" || isAdmin;

  // Get project statistics
  const projectStats = await getProjectStatistics(userId, companyId, userRole);

  // Get ticket statistics
  const ticketStats = await getTicketStatistics(userId, companyId, userRole);

  // Get time tracking statistics
  const timeStats = await getTimeTrackingStatistics(
    userId,
    companyId,
    userRole,
  );

  // Get team statistics
  const teamStats = await getTeamStatistics(companyId, userRole);

  // Get billing statistics (only for admins)
  const billingStats = isAdmin
    ? await getBillingStatistics(companyId)
    : undefined;

  return {
    projects: projectStats,
    tickets: ticketStats,
    timeTracking: timeStats,
    team: teamStats,
    billing: billingStats,
  };
}

async function getProjectStatistics(
  userId: string,
  companyId: string,
  userRole: UserRole,
) {
  const isAdmin = ["super_admin", "system_admin", "company_admin"].includes(
    userRole,
  );

  let query = supabase.from("projects").select("id, status, company_id");

  if (isAdmin) {
    // Admins see all company projects
    query = query.eq("company_id", companyId);
  } else {
    // Regular users see only projects they're members of
    query = query
      .eq("company_id", companyId)
      .in(
        "id",
        supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", userId),
      );
  }

  const { data: projects, error } = await query;

  if (error) throw error;

  const total = projects?.length || 0;
  const active = projects?.filter((p) => p.status === "active").length || 0;
  const completed =
    projects?.filter((p) => p.status === "completed").length || 0;
  const archived = projects?.filter((p) => p.status === "archived").length || 0;

  return { total, active, completed, archived };
}

async function getTicketStatistics(
  userId: string,
  companyId: string,
  userRole: UserRole,
) {
  const isAdmin = ["super_admin", "system_admin", "company_admin"].includes(
    userRole,
  );
  const isManager = userRole === "manager" || isAdmin;

  let query = supabase
    .from("tickets")
    .select("id, status, assignee_id, projects!inner(company_id)");

  if (isAdmin) {
    // Admins see all company tickets
    query = query.eq("projects.company_id", companyId);
  } else if (isManager) {
    // Managers see tickets in projects they're members of
    query = query
      .eq("projects.company_id", companyId)
      .in(
        "project_id",
        supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", userId),
      );
  } else {
    // Regular users see only tickets assigned to them or in their projects
    query = query
      .eq("projects.company_id", companyId)
      .or(
        `assignee_id.eq.${userId},project_id.in.(${supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", userId)})`,
      );
  }

  const { data: tickets, error } = await query;

  if (error) throw error;

  const total = tickets?.length || 0;
  const newTickets = tickets?.filter((t) => t.status === "new").length || 0;
  const inProgress =
    tickets?.filter((t) => t.status === "in_progress").length || 0;
  const review = tickets?.filter((t) => t.status === "review").length || 0;
  const done = tickets?.filter((t) => t.status === "done").length || 0;

  return {
    total,
    new: newTickets,
    in_progress: inProgress,
    review,
    done,
  };
}

async function getTimeTrackingStatistics(
  userId: string,
  companyId: string,
  userRole: UserRole,
) {
  const isAdmin = ["super_admin", "system_admin", "company_admin"].includes(
    userRole,
  );
  const today = startOfToday();
  const thisWeek = startOfWeek(new Date());
  const thisMonth = startOfMonth(new Date());

  let baseQuery = supabase
    .from("time_entries")
    .select("duration, user_id, tickets!inner(projects!inner(company_id))");

  if (isAdmin) {
    // Admins see all company time entries
    baseQuery = baseQuery.eq("tickets.projects.company_id", companyId);
  } else {
    // Regular users see only their own time entries
    baseQuery = baseQuery
      .eq("user_id", userId)
      .eq("tickets.projects.company_id", companyId);
  }

  // Get today's time
  const { data: todayData } = await baseQuery
    .gte("start_time", today.toISOString())
    .lte("start_time", endOfDay(new Date()).toISOString());

  // Get this week's time
  const { data: weekData } = await baseQuery
    .gte("start_time", thisWeek.toISOString())
    .lte("start_time", endOfDay(new Date()).toISOString());

  // Get this month's time
  const { data: monthData } = await baseQuery
    .gte("start_time", thisMonth.toISOString())
    .lte("start_time", endOfDay(new Date()).toISOString());

  const todayHours =
    todayData?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;
  const weekHours =
    weekData?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;
  const monthHours =
    monthData?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;

  return {
    today: todayHours,
    thisWeek: weekHours,
    thisMonth: monthHours,
  };
}

async function getTeamStatistics(companyId: string, userRole: UserRole) {
  const isAdmin = ["super_admin", "system_admin", "company_admin"].includes(
    userRole,
  );

  if (!isAdmin) {
    // Non-admins get limited team stats
    return { totalMembers: 1, activeMembers: 1 };
  }

  const { data: users, error } = await supabase
    .from("users")
    .select("id, status")
    .eq("company_id", companyId);

  if (error) throw error;

  const totalMembers = users?.length || 0;
  const activeMembers = users?.filter((u) => u.status === "active").length || 0;

  return { totalMembers, activeMembers };
}

async function getBillingStatistics(companyId: string) {
  const thisMonth = startOfMonth(new Date());

  // Get current month's billing periods
  const { data: billingPeriods, error } = await supabase
    .from("billing_periods")
    .select("payment_amount, payment_status")
    .eq("company_id", companyId)
    .gte("start_date", thisMonth.toISOString());

  if (error) throw error;

  const monthlyEarnings =
    billingPeriods
      ?.filter((bp) => bp.payment_status === "paid")
      .reduce((sum, bp) => sum + (bp.payment_amount || 0), 0) || 0;

  const pendingPayments =
    billingPeriods
      ?.filter((bp) =>
        ["pending", "sent", "overdue"].includes(bp.payment_status),
      )
      .reduce((sum, bp) => sum + (bp.payment_amount || 0), 0) || 0;

  const paidAmount = monthlyEarnings;

  return {
    monthlyEarnings,
    pendingPayments,
    paidAmount,
  };
}
