import {supabase} from '@/lib/db';
import type {UserRole} from '@/lib/db/schema';

export interface ProjectHealth {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'on-hold' | 'at-risk';
  progress: number;
  health: 'excellent' | 'good' | 'warning' | 'critical';
  metrics: {
    tasksCompleted: number;
    totalTasks: number;
    teamMembers: number;
    daysRemaining?: number;
    velocity: number;
    blockers: number;
    totalHours: number;
    avgHoursPerTask: number;
  };
  trends: {
    progress: number;
    velocity: number;
    activity: number;
  };
  lastActivity: string;
  description?: string;
}

export async function getProjectHealthSimple(
  userId: string,
  companyId: string,
  userRole: UserRole,
): Promise<ProjectHealth[]> {
  try {
    // Get accessible projects based on user role
    let projectsQuery = supabase.from('projects').select('*').eq('company_id', companyId);

    // If not admin, filter by project membership
    if (!['super_admin', 'system_admin', 'company_admin'].includes(userRole)) {
      // Get user's project IDs first
      const {data: memberProjects} = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);

      if (!memberProjects || memberProjects.length === 0) {
        return [];
      }

      const projectIds = memberProjects.map((p) => p.project_id);
      projectsQuery = projectsQuery.in('id', projectIds);
    }

    const {data: projects, error: projectsError} = await projectsQuery.order('updated_at', {
      ascending: false,
    });

    if (projectsError) {
      console.error('🏥 Error fetching projects:', projectsError);
      return [];
    }

    if (!projects || projects.length === 0) {
      return [];
    }

    // For each project, get basic metrics
    const projectHealthData: ProjectHealth[] = [];

    for (const project of projects) {
      // Get tickets for this project
      const {data: tickets} = await supabase
        .from('tickets')
        .select('id, status')
        .eq('project_id', project.id)
        .eq('company_id', companyId);

      // Get project members count
      const {count: memberCount} = await supabase
        .from('project_members')
        .select('*', {count: 'exact', head: true})
        .eq('project_id', project.id);

      // Calculate basic metrics
      const totalTasks = tickets?.length || 0;
      const completedTasks = tickets?.filter((t) => t.status === 'done').length || 0;
      const blockedTasks = tickets?.filter((t) => t.status === 'blocked').length || 0;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calculate health based on progress and blockers
      let health: ProjectHealth['health'] = 'good';
      if (progress >= 80 && blockedTasks === 0) health = 'excellent';
      else if (progress >= 60 && blockedTasks <= 2) health = 'good';
      else if (progress >= 30 && blockedTasks <= 5) health = 'warning';
      else health = 'critical';

      // Determine status
      let status: ProjectHealth['status'] = 'active';
      if (project.status === 'completed') status = 'completed';
      else if (project.status === 'archived') status = 'on-hold';
      else if (health === 'critical') status = 'at-risk';

      // Calculate days remaining
      let daysRemaining: number | undefined;
      if (project.end_date) {
        const endDate = new Date(project.end_date);
        const now = new Date();
        const diffMs = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        daysRemaining = diffDays > 0 ? diffDays : undefined;
      }

      // Format last activity
      const lastActivityDate = new Date(project.updated_at);
      const now = new Date();
      const diffMs = now.getTime() - lastActivityDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      let lastActivity: string;
      if (diffHours < 1) lastActivity = 'Just now';
      else if (diffHours < 24) lastActivity = `${diffHours} hours ago`;
      else if (diffDays === 1) lastActivity = '1 day ago';
      else lastActivity = `${diffDays} days ago`;

      projectHealthData.push({
        id: project.id,
        name: project.name,
        description: project.description,
        status,
        progress,
        health,
        metrics: {
          tasksCompleted: completedTasks,
          totalTasks,
          teamMembers: memberCount || 0,
          daysRemaining,
          velocity: Math.round((completedTasks / 7) * 10) / 10, // Simplified velocity
          blockers: blockedTasks,
          totalHours: 0, // Would need time entries query
          avgHoursPerTask: 0, // Would need time entries query
        },
        trends: {
          progress: progress > 50 ? 15 : -5, // Simplified trend
          velocity: completedTasks > 5 ? 10 : -5, // Simplified trend
          activity: diffDays < 3 ? 20 : -10, // Simplified trend
        },
        lastActivity,
      });
    }

    return projectHealthData;
  } catch (error) {
    console.error('Error in getProjectHealthSimple:', error);
    return [];
  }
}
