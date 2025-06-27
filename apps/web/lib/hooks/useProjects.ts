import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getProjectsByCompany, 
  createProject, 
  updateProject, 
  deleteProject,
  getProjectById,
  getProjectsWithTicketCounts,
  addProjectMember,
  removeProjectMember,
  getProjectMembers,
  getUserProjects,
  updateProjectMemberRole
} from '@/lib/db/service';
import { NewProject, Project } from '@/lib/db/schema';
import { useAuthStore } from '@/lib/stores/auth';

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

// Projects list query
export function useProjectsQuery() {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: projectKeys.list(user?.company_id || ''),
    queryFn: async () => {
      const result = await getProjectsByCompany(user!.company_id);
      return result;
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Single project query
export function useProjectQuery(projectId: string) {
  const { user } = useAuthStore();
  
  return useQuery({
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
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: createProject,
    onSuccess: (newProject) => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.list(user!.company_id) });
      
      // Optimistically add to cache
      queryClient.setQueryData(
        projectKeys.list(user!.company_id),
        (old: Project[] = []) => [newProject, ...old]
      );
    },
  });
}

// Update project mutation
export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<NewProject> }) =>
      updateProject(id, updates),
    onSuccess: (updatedProject, { id }) => {
      // Update project in list cache
      queryClient.setQueryData(
        projectKeys.list(user!.company_id),
        (old: Project[] = []) =>
          old.map((project) => (project.id === id ? updatedProject : project))
      );
      
      // Update individual project cache
      queryClient.setQueryData(projectKeys.detail(id), updatedProject);
    },
  });
}

// Delete project mutation
export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: (_, deletedId) => {
      // Remove from projects list
      queryClient.setQueryData(
        projectKeys.list(user!.company_id),
        (old: Project[] = []) => old.filter((project) => project.id !== deletedId)
      );
      
      // Remove individual project cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(deletedId) });
    },
  });
}

// Projects list query with ticket counts
export function useProjectsWithTicketCountsQuery() {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: [...projectKeys.all, 'withTicketCounts', user?.company_id],
    queryFn: async () => {
      const result = await getProjectsWithTicketCounts(user!.company_id);
      return result;
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Project member hooks

// Get project members
export function useProjectMembersQuery(projectId: string) {
  return useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get user's projects
export function useUserProjectsQuery(userId?: string) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;
  
  return useQuery({
    queryKey: projectKeys.userProjects(targetUserId || ''),
    queryFn: () => getUserProjects(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Add project member
export function useAddProjectMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, userId, role = 'member' }: { 
      projectId: string; 
      userId: string; 
      role?: 'lead' | 'member' 
    }) => addProjectMember(projectId, userId, role),
    onSuccess: (_, { projectId, userId }) => {
      // Invalidate project members query
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      // Invalidate user projects query
      queryClient.invalidateQueries({ queryKey: projectKeys.userProjects(userId) });
    },
  });
}

// Remove project member
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) => 
      removeProjectMember(projectId, userId),
    onSuccess: (_, { projectId, userId }) => {
      // Invalidate project members query
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      // Invalidate user projects query
      queryClient.invalidateQueries({ queryKey: projectKeys.userProjects(userId) });
    },
  });
}

// Update project member role
export function useUpdateProjectMemberRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, userId, role }: { 
      projectId: string; 
      userId: string; 
      role: 'lead' | 'member' 
    }) => updateProjectMemberRole(projectId, userId, role),
    onSuccess: (_, { projectId, userId }) => {
      // Invalidate project members query
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      // Invalidate user projects query
      queryClient.invalidateQueries({ queryKey: projectKeys.userProjects(userId) });
    },
  });
}
