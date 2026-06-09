import {supabase} from '@/lib/db';
import type {UserRole} from '@/lib/db/schema';

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

  if (['super_admin', 'system_admin', 'company_admin'].includes(userRole)) {
    // For admin dashboard, you might want to create a separate service
    // For now, we'll focus on their personal metrics
  }

  // Get user's project memberships for filtering
  const {data: userProjects} = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);
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

  // Time entries have no company_id/project_id of their own — reach both through
  // the ticket -> project join. A fresh builder is created per query because
  // Supabase query builders are mutated (filters accumulate) when reused.
  const buildTimeQuery = () => {
    let q = supabase
      .from('time_entries')
      .select('duration, start_time, tickets!inner(project_id, projects!inner(company_id))')
      .eq('user_id', userId)
      .eq('tickets.projects.company_id', companyId);

    if (accessibleProjectIds.length > 0) {
      q = q.in('tickets.project_id', accessibleProjectIds);
    }

    return q;
  };

  const sumDuration = (rows: ReadonlyArray<{duration?: number | null}> | null): number =>
    (rows || []).reduce((sum, entry) => sum + (entry.duration || 0), 0);

  // Time tracking queries (duration is decimal hours, filtered/sorted by start_time)
  const [todayTimeResult, thisWeekTimeResult, lastWeekTimeResult, thisMonthTimeResult] =
    await Promise.all([
      // Today's time
      buildTimeQuery()
        .gte('start_time', todayStart.toISOString())
        .then((result) => ({data: [{totalHours: sumDuration(result.data)}]})),

      // This week's time
      buildTimeQuery()
        .gte('start_time', weekStart.toISOString())
        .then((result) => ({data: [{totalHours: sumDuration(result.data)}]})),

      // Last week's time
      buildTimeQuery()
        .gte('start_time', lastWeekStart.toISOString())
        .lt('start_time', lastWeekEnd.toISOString())
        .then((result) => ({data: [{totalHours: sumDuration(result.data)}]})),

      // This month's time
      buildTimeQuery()
        .gte('start_time', monthStart.toISOString())
        .then((result) => ({data: [{totalHours: sumDuration(result.data)}]})),
    ]);

  // Tickets have no company_id — reach company through the project join.
  const buildTicketQuery = () => {
    let q = supabase
      .from('tickets')
      .select('id, status, created_at, updated_at, projects!inner(company_id)')
      .eq('projects.company_id', companyId);

    if (accessibleProjectIds.length > 0) {
      q = q.in('project_id', accessibleProjectIds);
    }

    // Filter for tasks assigned to or reported by the user
    return q.or(`assignee_id.eq.${userId},reporter_id.eq.${userId}`);
  };

  // Task completion queries
  const [
    thisWeekTasksResult,
    lastWeekTasksResult,
    thisWeekCompletedResult,
    lastWeekCompletedResult,
  ] = await Promise.all([
    // Tasks created this week
    buildTicketQuery()
      .gte('created_at', weekStart.toISOString())
      .then((result) => ({data: [{count: result.data?.length || 0}]})),

    // Tasks created last week
    buildTicketQuery()
      .gte('created_at', lastWeekStart.toISOString())
      .lt('created_at', lastWeekEnd.toISOString())
      .then((result) => ({data: [{count: result.data?.length || 0}]})),

    // Tasks completed this week
    buildTicketQuery()
      .eq('status', 'done')
      .gte('updated_at', weekStart.toISOString())
      .then((result) => ({data: [{count: result.data?.length || 0}]})),

    // Tasks completed last week
    buildTicketQuery()
      .eq('status', 'done')
      .gte('updated_at', lastWeekStart.toISOString())
      .lt('updated_at', lastWeekEnd.toISOString())
      .then((result) => ({data: [{count: result.data?.length || 0}]})),
  ]);

  // Daily time tracking for streak and consistency calculation
  const {data: dailyTimeTrackingData} = await buildTimeQuery()
    .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('start_time', {ascending: true});

  // Group by calendar day (derived from start_time) and sum durations
  const dailyTimeTracking = (dailyTimeTrackingData || []).reduce<
    Array<{date: string; totalHours: number}>
  >((acc, entry) => {
    const date = (entry.start_time as string).slice(0, 10);
    const existing = acc.find((d) => d.date === date);
    if (existing) {
      existing.totalHours += entry.duration || 0;
    } else {
      acc.push({date, totalHours: entry.duration || 0});
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
  const weeklyTrend =
    lastWeekHours > 0
      ? ((thisWeekHours - lastWeekHours) / lastWeekHours) * 100
      : thisWeekHours > 0
        ? 100
        : 0;

  const completionTrend =
    lastWeekCompleted > 0
      ? ((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100
      : thisWeekCompleted > 0
        ? 100
        : 0;

  const velocityTrend =
    lastWeekTasks > 0
      ? ((thisWeekTasks - lastWeekTasks) / lastWeekTasks) * 100
      : thisWeekTasks > 0
        ? 100
        : 0;

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

    if (hours >= 1) {
      // Consider 1+ hours as a working day
      if (streakDays === workingDays) {
        // Streak is still active
        streakDays++;
      }
      workingDays++;
    }
  }

  // Calculate consistency score (percentage of days with 1+ hours in last 30 days)
  const consistencyScore = Math.round(
    (workingDays / Math.min(30, dailyTimeTracking.length || 1)) * 100,
  );

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
