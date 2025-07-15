import {supabase} from '@/lib/db';
import type {UserRole} from '@/lib/db/schema';

export interface ProjectHealthMetrics {
  tasksCompleted: number;
  totalTasks: number;
  teamMembers: number;
  daysRemaining?: number;
  velocity: number; // tasks completed per week
  blockers: number;
  totalHours: number;
  avgHoursPerTask: number;
}

export interface ProjectHealthTrends {
  progress: number; // percentage change in completion
  velocity: number; // percentage change in task completion rate
  activity: number; // percentage change in time tracking
}

export interface ProjectHealth {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'on-hold' | 'at-risk';
  progress: number;
  health: 'excellent' | 'good' | 'warning' | 'critical';
  metrics: ProjectHealthMetrics;
  trends: ProjectHealthTrends;
  lastActivity: string;
  description?: string;
}

export async function getProjectHealth(
  userId: string,
  companyId: string,
  userRole: UserRole,
): Promise<ProjectHealth[]> {
  console.log('🏥 Project Health Service - Getting data for:', {userId, companyId, userRole});

  // Get accessible projects based on user role
  let accessibleProjects;

  if (['super_admin', 'system_admin', 'company_admin'].includes(userRole)) {
    // Admins can see all company projects
    const {data} = await supabase
      .from('projects')
      .select(
        `
        id,
        name,
        description,
        status,
        start_date,
        end_date,
        created_at,
        updated_at
      `,
      )
      .eq('company_id', companyId)
      .order('updated_at', {ascending: false});
    accessibleProjects = data || [];
  } else {
    // Regular users can only see projects they're members of
    // First get user's project IDs
    const {data: userProjectIds} = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    if (!userProjectIds || userProjectIds.length === 0) {
      return [];
    }

    const projectIds = userProjectIds.map((p) => p.project_id);

    const {data} = await supabase
      .from('projects')
      .select(
        `
        id,
        name,
        description,
        status,
        start_date,
        end_date,
        created_at,
        updated_at
      `,
      )
      .eq('company_id', companyId)
      .in('id', projectIds)
      .order('updated_at', {ascending: false});
    accessibleProjects = data || [];
  }

  console.log('🏥 Found accessible projects:', accessibleProjects.length);

  if (accessibleProjects.length === 0) {
    console.log('🏥 No accessible projects found, returning empty array');
    return [];
  }

  const projectIds = accessibleProjects.map((p) => p.id);

  // Date calculations for trends
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Get project metrics in parallel
  const [taskMetricsResults, memberCountsResults, timeMetricsResults, lastActivitiesResults] =
    await Promise.all([
      // Current task metrics for all projects
      Promise.all(
        projectIds.map(async (projectId) => {
          const {data} = await supabase
            .from('tickets')
            .select('id, status')
            .eq('project_id', projectId)
            .eq('company_id', companyId);

          const tickets = data || [];
          return {
            projectId,
            totalTasks: tickets.length,
            completedTasks: tickets.filter((t) => t.status === 'done').length,
            blockedTasks: tickets.filter((t) => t.status === 'blocked').length,
          };
        }),
      ),

      // Member counts for all projects
      Promise.all(
        projectIds.map(async (projectId) => {
          const {count} = await supabase
            .from('project_members')
            .select('*', {count: 'exact', head: true})
            .eq('project_id', projectId);

          return {projectId, memberCount: count || 0};
        }),
      ),

      // Time tracking metrics for all projects
      Promise.all(
        projectIds.map(async (projectId) => {
          const [totalHoursResult, recentHoursResult] = await Promise.all([
            supabase
              .from('time_entries')
              .select('hours')
              .eq('project_id', projectId)
              .eq('company_id', companyId),

            supabase
              .from('time_entries')
              .select('hours')
              .eq('project_id', projectId)
              .eq('company_id', companyId)
              .gte('date', weekStart.toISOString().split('T')[0]),
          ]);

          const totalHours = (totalHoursResult.data || []).reduce(
            (sum, entry) => sum + (entry.hours || 0),
            0,
          );
          const recentHours = (recentHoursResult.data || []).reduce(
            (sum, entry) => sum + (entry.hours || 0),
            0,
          );

          return {projectId, totalHours, recentHours};
        }),
      ),

      // Last activity per project
      Promise.all(
        projectIds.map(async (projectId) => {
          const {data} = await supabase
            .from('tickets')
            .select('updated_at')
            .eq('project_id', projectId)
            .eq('company_id', companyId)
            .order('updated_at', {ascending: false})
            .limit(1);

          return {
            projectId,
            lastActivity:
              data?.[0]?.updated_at ||
              accessibleProjects.find((p) => p.id === projectId)?.updated_at,
          };
        }),
      ),
    ]);

  // Helper function to format last activity
  const formatLastActivity = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return '1 day ago';
    } else {
      return `${diffDays} days ago`;
    }
  };

  // Helper function to calculate days remaining
  const calculateDaysRemaining = (endDate: string | null): number | undefined => {
    if (!endDate) return undefined;
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : undefined;
  };

  // Helper function to determine project health
  const calculateHealth = (
    progress: number,
    velocity: number,
    blockers: number,
    daysRemaining?: number,
  ): ProjectHealth['health'] => {
    let score = 0;

    // Progress score (40% weight)
    if (progress >= 80) score += 40;
    else if (progress >= 60) score += 30;
    else if (progress >= 40) score += 20;
    else score += 10;

    // Velocity score (30% weight)
    if (velocity >= 5) score += 30;
    else if (velocity >= 3) score += 20;
    else if (velocity >= 1) score += 10;

    // Blockers penalty (20% weight)
    if (blockers === 0) score += 20;
    else if (blockers <= 2) score += 10;
    else score += 0;

    // Timeline score (10% weight)
    if (daysRemaining === undefined) score += 10;
    else if (daysRemaining > 30) score += 10;
    else if (daysRemaining > 7) score += 5;

    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'warning';
    return 'critical';
  };

  // Helper function to determine project status
  const determineStatus = (
    projectStatus: string,
    health: string,
    daysRemaining?: number,
  ): ProjectHealth['status'] => {
    if (projectStatus === 'completed') return 'completed';
    if (projectStatus === 'archived') return 'on-hold';

    if (health === 'critical' || (daysRemaining && daysRemaining < 7 && health !== 'excellent')) {
      return 'at-risk';
    }

    return 'active';
  };

  // Create lookup maps
  const taskMetricsMap = new Map(taskMetricsResults.map((m) => [m.projectId, m]));
  const memberCountsMap = new Map(memberCountsResults.map((m) => [m.projectId, m]));
  const timeMetricsMap = new Map(timeMetricsResults.map((m) => [m.projectId, m]));
  const lastActivitiesMap = new Map(lastActivitiesResults.map((m) => [m.projectId, m]));

  // Build project health data
  return accessibleProjects.map((project): ProjectHealth => {
    const taskData = taskMetricsMap.get(project.id);
    const memberData = memberCountsMap.get(project.id);
    const timeData = timeMetricsMap.get(project.id);
    const lastActivityData = lastActivitiesMap.get(project.id);

    const totalTasks = taskData?.totalTasks || 0;
    const completedTasks = taskData?.completedTasks || 0;
    const blockedTasks = taskData?.blockedTasks || 0;
    const teamMembers = memberData?.memberCount || 0;
    const totalHours = timeData?.totalHours || 0;
    const recentHours = timeData?.recentHours || 0;

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const velocity = Math.round((completedTasks / 7) * 10) / 10; // Tasks per week (simplified)
    const avgHoursPerTask =
      completedTasks > 0 ? Math.round((totalHours / completedTasks) * 10) / 10 : 0;
    const daysRemaining = calculateDaysRemaining(project.end_date);

    // Calculate trends (simplified - would need historical data for accurate trends)
    const progressTrend = progress > 50 ? 15 : progress > 25 ? 5 : -10;
    const velocityTrend = completedTasks > 5 ? 10 : completedTasks > 2 ? 5 : -5;
    const activityTrend = recentHours > 10 ? 20 : recentHours > 5 ? 10 : -5;

    const health = calculateHealth(progress, velocity, blockedTasks, daysRemaining);
    const status = determineStatus(project.status, health, daysRemaining);

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status,
      progress,
      health,
      metrics: {
        tasksCompleted: completedTasks,
        totalTasks,
        teamMembers,
        daysRemaining,
        velocity,
        blockers: blockedTasks,
        totalHours,
        avgHoursPerTask,
      },
      trends: {
        progress: progressTrend,
        velocity: velocityTrend,
        activity: activityTrend,
      },
      lastActivity: lastActivityData?.lastActivity
        ? formatLastActivity(lastActivityData.lastActivity)
        : 'No recent activity',
    };
  });
}
