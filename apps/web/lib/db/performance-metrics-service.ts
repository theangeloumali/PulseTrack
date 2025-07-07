import { supabase } from "@/lib/db";
import type { UserRole } from "@/lib/db/schema";

export interface PerformanceMetrics {
  productivity: {
    todayHours: number;
    weekHours: number;
    monthHours: number;
    weeklyTrend: number; // percentage change from last week
    dailyAverage: number;
  };
  taskCompletion: {
    completionRate: number;
    completedThisWeek: number;
    totalThisWeek: number;
    completionTrend: number; // percentage change from last week
  };
  velocity: {
    tasksPerWeek: number;
    velocityTrend: number; // percentage change from last week
    averageCompletionTime: number; // days
  };
  focus: {
    streakDays: number;
    bestDay: number; // hours
    consistencyScore: number; // 0-100
  };
}

export async function getPerformanceMetrics(
  userId: string,
  companyId: string,
  userRole: UserRole,
): Promise<PerformanceMetrics> {
  // Get accessible project IDs based on user role
  let accessibleProjectIds: string[] = [];

  if (["super_admin", "system_admin", "company_admin"].includes(userRole)) {
    // For admin dashboard, you might want to create a separate service
    // For now, we'll focus on their personal metrics
  }

  // Get user's project memberships for filtering
  const { data: userProjects } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);
  accessibleProjectIds = userProjects?.map((p) => p.project_id) || [];

  // Date calculations
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Build base query conditions
  let timeQueryBuilder = supabase
    .from("time_entries")
    .select("hours, date")
    .eq("user_id", userId)
    .eq("company_id", companyId);

  if (accessibleProjectIds.length > 0) {
    timeQueryBuilder = timeQueryBuilder.in("project_id", accessibleProjectIds);
  }

  // Time tracking queries
  const [
    todayTimeResult,
    thisWeekTimeResult,
    lastWeekTimeResult,
    thisMonthTimeResult,
  ] = await Promise.all([
    // Today's time
    timeQueryBuilder
      .gte("date", todayStart.toISOString().split('T')[0])
      .then(result => {
        const totalHours = (result.data || []).reduce((sum, entry) => sum + (entry.hours || 0), 0);
        return { data: [{ totalHours }] };
      }),

    // This week's time
    timeQueryBuilder
      .gte("date", weekStart.toISOString().split('T')[0])
      .then(result => {
        const totalHours = (result.data || []).reduce((sum, entry) => sum + (entry.hours || 0), 0);
        return { data: [{ totalHours }] };
      }),

    // Last week's time
    timeQueryBuilder
      .gte("date", lastWeekStart.toISOString().split('T')[0])
      .lt("date", lastWeekEnd.toISOString().split('T')[0])
      .then(result => {
        const totalHours = (result.data || []).reduce((sum, entry) => sum + (entry.hours || 0), 0);
        return { data: [{ totalHours }] };
      }),

    // This month's time
    timeQueryBuilder
      .gte("date", monthStart.toISOString().split('T')[0])
      .then(result => {
        const totalHours = (result.data || []).reduce((sum, entry) => sum + (entry.hours || 0), 0);
        return { data: [{ totalHours }] };
      }),
  ]);

  // Build base ticket query conditions
  let ticketQueryBuilder = supabase
    .from("tickets")
    .select("id, status, created_at, updated_at")
    .eq("company_id", companyId);

  if (accessibleProjectIds.length > 0) {
    ticketQueryBuilder = ticketQueryBuilder.in("project_id", accessibleProjectIds);
  }

  // Add user filter for assigned or created tasks
  ticketQueryBuilder = ticketQueryBuilder.or(`assignee_id.eq.${userId},creator_id.eq.${userId}`);

  // Task completion queries
  const [
    thisWeekTasksResult,
    lastWeekTasksResult,
    thisWeekCompletedResult,
    lastWeekCompletedResult,
  ] = await Promise.all([
    // Tasks created this week
    ticketQueryBuilder
      .gte("created_at", weekStart.toISOString())
      .then(result => ({ data: [{ count: result.data?.length || 0 }] })),

    // Tasks created last week
    ticketQueryBuilder
      .gte("created_at", lastWeekStart.toISOString())
      .lt("created_at", lastWeekEnd.toISOString())
      .then(result => ({ data: [{ count: result.data?.length || 0 }] })),

    // Tasks completed this week
    ticketQueryBuilder
      .eq("status", "done")
      .gte("updated_at", weekStart.toISOString())
      .then(result => ({ data: [{ count: result.data?.length || 0 }] })),

    // Tasks completed last week
    ticketQueryBuilder
      .eq("status", "done")
      .gte("updated_at", lastWeekStart.toISOString())
      .lt("updated_at", lastWeekEnd.toISOString())
      .then(result => ({ data: [{ count: result.data?.length || 0 }] })),
  ]);

  // Daily time tracking for streak and consistency calculation
  const { data: dailyTimeTrackingData } = await timeQueryBuilder
    .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order("date", { ascending: true });

  // Group by date and sum hours
  const dailyTimeTracking = (dailyTimeTrackingData || []).reduce((acc: any[], entry) => {
    const existing = acc.find(d => d.date === entry.date);
    if (existing) {
      existing.totalHours += entry.hours || 0;
    } else {
      acc.push({ date: entry.date, totalHours: entry.hours || 0 });
    }
    return acc;
  }, []);

  // Calculate metrics
  const todayHours = todayTimeResult.data[0]?.totalHours || 0;
  const thisWeekHours = thisWeekTimeResult.data[0]?.totalHours || 0;
  const lastWeekHours = lastWeekTimeResult.data[0]?.totalHours || 0;
  const thisMonthHours = thisMonthTimeResult.data[0]?.totalHours || 0;

  const thisWeekTasks = thisWeekTasksResult.data[0]?.count || 0;
  const lastWeekTasks = lastWeekTasksResult.data[0]?.count || 0;
  const thisWeekCompleted = thisWeekCompletedResult.data[0]?.count || 0;
  const lastWeekCompleted = lastWeekCompletedResult.data[0]?.count || 0;

  // Calculate trends
  const weeklyTrend = lastWeekHours > 0 
    ? ((thisWeekHours - lastWeekHours) / lastWeekHours) * 100 
    : thisWeekHours > 0 ? 100 : 0;

  const completionTrend = lastWeekCompleted > 0 
    ? ((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100 
    : thisWeekCompleted > 0 ? 100 : 0;

  const velocityTrend = lastWeekTasks > 0 
    ? ((thisWeekTasks - lastWeekTasks) / lastWeekTasks) * 100 
    : thisWeekTasks > 0 ? 100 : 0;

  // Calculate focus metrics
  let streakDays = 0;
  let bestDay = 0;
  let workingDays = 0;
  let totalHoursLast30Days = 0;

  // Sort daily tracking by date descending to calculate streak from today backwards
  const sortedDailyTracking = dailyTimeTracking.reverse();
  
  for (const day of sortedDailyTracking) {
    const hours = day.totalHours;
    totalHoursLast30Days += hours;
    
    if (hours > bestDay) {
      bestDay = hours;
    }
    
    if (hours >= 1) { // Consider 1+ hours as a working day
      if (streakDays === workingDays) { // Streak is still active
        streakDays++;
      }
      workingDays++;
    }
  }

  // Calculate consistency score (percentage of days with 1+ hours in last 30 days)
  const consistencyScore = Math.round((workingDays / Math.min(30, dailyTimeTracking.length || 1)) * 100);

  return {
    productivity: {
      todayHours,
      weekHours: thisWeekHours,
      monthHours: thisMonthHours,
      weeklyTrend: Math.round(weeklyTrend),
      dailyAverage: thisWeekHours / 7,
    },
    taskCompletion: {
      completionRate: thisWeekTasks > 0 ? Math.round((thisWeekCompleted / thisWeekTasks) * 100) : 0,
      completedThisWeek: thisWeekCompleted,
      totalThisWeek: thisWeekTasks,
      completionTrend: Math.round(completionTrend),
    },
    velocity: {
      tasksPerWeek: thisWeekCompleted,
      velocityTrend: Math.round(velocityTrend),
      averageCompletionTime: 0, // Would need completion date tracking for this
    },
    focus: {
      streakDays,
      bestDay: Math.round(bestDay * 10) / 10, // Round to 1 decimal
      consistencyScore,
    },
  };
}