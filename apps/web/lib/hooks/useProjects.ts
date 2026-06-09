import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useSessionAwareQuery} from './useSessionAwareQuery';
import {
  getProjectsByCompany,
  createProject,
  updateProject,
  deleteProject,
  getProjectById,
  getProjectsWithTicketCounts,
  getAccessibleProjectsByCompany,
  getAccessibleProjectsWithTicketCounts,
  addProjectMember,
  removeProjectMember,
  getProjectMembers,
  getUserProjects,
  updateProjectMemberRole,
} from '@/lib/db/service';
import {NewProject, Project} from '@/lib/db/schema';
import {clientKeys} from './useClients';
import {useAuthStore} from '@/lib/stores/auth';

// Query keys for consistency and cache invalidation
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (companyId: string) => [...projectKeys.lists(), companyId] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  members: (projectId: string) => [...projectKeys.all, 'members', projectId] as const,
  userProjects: (userId: string) => [...projectKeys.all, 'userProjects', userId] as const,
};

// Projects list query with access control
export function useProjectsQuery() {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: projectKeys.list(user?.company_id || ''),
    queryFn: async () => {
      if (!user?.company_id || !user?.id || !user?.role) {
        throw new Error('User information not available');
      }
      const result = await getAccessibleProjectsByCompany(user.company_id, user.id, user.role);
      return result;
    },
    enabled: !!user?.company_id && !!user?.id && !!user?.role,
    staleTime: 1000 * 60 * 30, // 30 minutes (projects rarely change)
  });
}

// Single project query
export function useProjectQuery(projectId: string) {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () => {
      const result = await getProjectById(projectId);
      return result;
    },
    enabled: !!projectId, // Remove user dependency to allow immediate fetching
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error: any) => {
      return failureCount < 3;
    },
  });
}

// Create project mutation
export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: createProject,
    onSuccess: (newProject) => {
      // Invalidate all project-related queries
      queryClient.invalidateQueries({
        queryKey: projectKeys.list(user!.company_id),
      });

      // Invalidate projects with ticket counts (both admin and user queries)
      queryClient.invalidateQueries({
        queryKey: ['projects', 'withTicketCounts'],
      });

      // Invalidate user projects
      queryClient.invalidateQueries({
        queryKey: projectKeys.userProjects(user!.id),
      });

      // Refresh client caches so a client's Projects list reflects the new project
      queryClient.invalidateQueries({queryKey: clientKeys.lists()});
      if (newProject?.client_id) {
        queryClient.invalidateQueries({queryKey: clientKeys.detail(newProject.client_id)});
      }

      // Optimistically add to cache
      queryClient.setQueryData(projectKeys.list(user!.company_id), (old: Project[] = []) => [
        newProject,
        ...old,
      ]);
    },
  });
}

// Update project mutation
export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: ({id, updates}: {id: string; updates: Partial<NewProject>}) =>
      updateProject(id, updates),
    onSuccess: (updatedProject, {id}) => {
      // Invalidate all project-related queries
      queryClient.invalidateQueries({
        queryKey: projectKeys.list(user!.company_id),
      });

      // Invalidate projects with ticket counts (both admin and user queries)
      queryClient.invalidateQueries({
        queryKey: ['projects', 'withTicketCounts'],
      });

      // Update individual project cache
      queryClient.setQueryData(projectKeys.detail(id), updatedProject);

      // Invalidate user projects if owner changed
      queryClient.invalidateQueries({
        queryKey: projectKeys.userProjects(user!.id),
      });

      // Refresh client caches (covers both old and new client when reassigned)
      queryClient.invalidateQueries({queryKey: clientKeys.all});
    },
  });
}

// Delete project mutation
export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: (_, deletedId) => {
      // Invalidate all project-related queries
      queryClient.invalidateQueries({
        queryKey: projectKeys.list(user!.company_id),
      });

      // Invalidate projects with ticket counts (both admin and user queries)
      queryClient.invalidateQueries({
        queryKey: ['projects', 'withTicketCounts'],
      });

      // Remove individual project cache
      queryClient.removeQueries({queryKey: projectKeys.detail(deletedId)});

      // Invalidate user projects
      queryClient.invalidateQueries({
        queryKey: projectKeys.userProjects(user!.id),
      });

      // Invalidate all ticket queries for this project
      queryClient.invalidateQueries({
        queryKey: ['tickets', 'list', deletedId],
      });
    },
  });
}

// Projects list query with ticket counts and access control
export function useProjectsWithTicketCountsQuery() {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: [...projectKeys.all, 'withTicketCounts', user?.company_id, user?.id, user?.role],
    queryFn: async () => {
      if (!user?.company_id || !user?.id || !user?.role) {
        throw new Error('User information not available');
      }
      const result = await getAccessibleProjectsWithTicketCounts(
        user.company_id,
        user.id,
        user.role,
      );
      return result;
    },
    enabled: !!user?.company_id && !!user?.id && !!user?.role,
    staleTime: 1000 * 60 * 30, // 30 minutes (projects rarely change)
  });
}

// Admin-only hook to get all projects in company (unrestricted)
export function useAllCompanyProjectsQuery() {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: [...projectKeys.all, 'allCompanyProjects', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) {
        throw new Error('Company ID not available');
      }
      const result = await getProjectsByCompany(user.company_id);
      return result;
    },
    enabled:
      !!user?.company_id &&
      !!user?.role &&
      ['super_admin', 'system_admin', 'company_admin'].includes(user.role),
    staleTime: 1000 * 60 * 30, // 30 minutes (projects rarely change)
  });
}

// Admin-only hook to get all projects with ticket counts (unrestricted)
export function useAllCompanyProjectsWithTicketCountsQuery() {
  const {user} = useAuthStore();

  return useSessionAwareQuery({
    queryKey: [...projectKeys.all, 'allWithTicketCounts', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) {
        throw new Error('Company ID not available');
      }
      const result = await getProjectsWithTicketCounts(user.company_id);
      return result;
    },
    enabled:
      !!user?.company_id &&
      !!user?.role &&
      ['super_admin', 'system_admin', 'company_admin'].includes(user.role),
    staleTime: 1000 * 60 * 30, // 30 minutes (projects rarely change)
  });
}

// Project member hooks

// Get project members
export function useProjectMembersQuery(projectId: string) {
  return useSessionAwareQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 30, // 30 minutes (projects rarely change)
  });
}

// Utility hook to check if user can manage project members
export function useCanManageProjectMembers(projectId?: string) {
  const {user} = useAuthStore();

  if (!user || !projectId) {
    return false;
  }

  // Admins can manage all project members in their company
  if (['super_admin', 'system_admin', 'company_admin'].includes(user.role)) {
    return true;
  }

  // Project owners can manage members (this would need project data to check)
  // For now, we'll let managers manage members of projects they have access to
  return user.role === 'manager';
}

// Get user's projects
export function useUserProjectsQuery(userId?: string) {
  const {user} = useAuthStore();
  const targetUserId = userId || user?.id;

  return useSessionAwareQuery({
    queryKey: projectKeys.userProjects(targetUserId || ''),
    queryFn: () => getUserProjects(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 1000 * 60 * 30, // 30 minutes (projects rarely change)
  });
}

// Add project member
export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      userId,
      role = 'member',
    }: {
      projectId: string;
      userId: string;
      role?: 'lead' | 'member';
    }) => addProjectMember(projectId, userId, role),
    onSuccess: (_, {projectId, userId}) => {
      // Invalidate project members query
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(projectId),
      });
      // Invalidate user projects query
      queryClient.invalidateQueries({
        queryKey: projectKeys.userProjects(userId),
      });
    },
  });
}

// Remove project member
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({projectId, userId}: {projectId: string; userId: string}) =>
      removeProjectMember(projectId, userId),
    onSuccess: (_, {projectId, userId}) => {
      // Invalidate project members query
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(projectId),
      });
      // Invalidate user projects query
      queryClient.invalidateQueries({
        queryKey: projectKeys.userProjects(userId),
      });
    },
  });
}

// Update project member role
export function useUpdateProjectMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      userId,
      role,
    }: {
      projectId: string;
      userId: string;
      role: 'lead' | 'member';
    }) => updateProjectMemberRole(projectId, userId, role),
    onSuccess: (_, {projectId, userId}) => {
      // Invalidate project members query
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(projectId),
      });
      // Invalidate user projects query
      queryClient.invalidateQueries({
        queryKey: projectKeys.userProjects(userId),
      });
    },
  });
}
