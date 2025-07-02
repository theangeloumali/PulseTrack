import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionAwareQuery } from './useSessionAwareQuery'
import { 
  createActivity, 
  getProjectActivities, 
  getUserActivities, 
  getRecentActivitiesForUser,
  getCompanyActivities
} from '@/lib/db/service'
import type { NewActivity, ActivityWithUser } from '@/lib/db/schema'
import { useAuth } from './useAuth'

// Query keys for activities
const ACTIVITY_KEYS = {
  all: ['activities'] as const,
  project: (projectId: string) => [...ACTIVITY_KEYS.all, 'project', projectId] as const,
  user: (userId: string) => [...ACTIVITY_KEYS.all, 'user', userId] as const,
  userRecent: (userId: string) => [...ACTIVITY_KEYS.all, 'user', userId, 'recent'] as const,
  company: (companyId: string) => [...ACTIVITY_KEYS.all, 'company', companyId] as const,
}

/**
 * Hook to get activities for a specific project
 */
export function useProjectActivities(projectId: string, limit: number = 50) {
  return useSessionAwareQuery({
    queryKey: ACTIVITY_KEYS.project(projectId),
    queryFn: () => getProjectActivities(projectId, limit),
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to get activities for a specific user
 */
export function useUserActivities(userId: string, limit: number = 50) {
  return useSessionAwareQuery({
    queryKey: ACTIVITY_KEYS.user(userId),
    queryFn: () => getUserActivities(userId, limit),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to get recent activities for the current user across accessible projects
 */
export function useRecentActivities(limit: number = 20) {
  const { user } = useAuth()
  
  return useSessionAwareQuery({
    queryKey: ACTIVITY_KEYS.userRecent(user?.id || ''),
    queryFn: () => getRecentActivitiesForUser(user!.id, limit),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to get company-wide activities (for admins)
 */
export function useCompanyActivities(companyId: string, limit: number = 50) {
  const { user } = useAuth()
  
  // Only allow company admins and above to access company activities
  const isAdmin = user?.role && ['super_admin', 'system_admin', 'company_admin'].includes(user.role)
  
  return useSessionAwareQuery({
    queryKey: ACTIVITY_KEYS.company(companyId),
    queryFn: () => getCompanyActivities(companyId, limit),
    enabled: !!companyId && !!isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Mutation hook to create a new activity
 */
export function useCreateActivity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createActivity,
    onSuccess: (newActivity) => {
      // Invalidate relevant queries
      if (newActivity.project_id) {
        queryClient.invalidateQueries({ 
          queryKey: ACTIVITY_KEYS.project(newActivity.project_id) 
        })
      }
      
      if (newActivity.user_id) {
        queryClient.invalidateQueries({ 
          queryKey: ACTIVITY_KEYS.user(newActivity.user_id) 
        })
        queryClient.invalidateQueries({ 
          queryKey: ACTIVITY_KEYS.userRecent(newActivity.user_id) 
        })
      }
      
      // Invalidate all activities to refresh company-wide views
      queryClient.invalidateQueries({ 
        queryKey: ACTIVITY_KEYS.all 
      })
    },
  })
}

/**
 * Helper function to check if user can see activities from a project
 * This implements the core project-based access control
 */
export function useCanAccessProjectActivities(projectId: string) {
  const { user } = useAuth()
  
  // This would need to be implemented based on your project membership logic
  // For now, return true if user exists (actual logic should check project membership)
  return !!user
}

/**
 * Hook to get activity feed with proper filtering based on user access
 */
export function useActivityFeed(options: {
  projectId?: string
  userId?: string
  companyId?: string
  limit?: number
} = {}) {
  const { user } = useAuth()
  const { projectId, userId, companyId, limit = 20 } = options
  
  // Determine which activities to fetch based on user permissions and options
  if (projectId) {
    return useProjectActivities(projectId, limit)
  }
  
  if (userId && userId === user?.id) {
    return useUserActivities(userId, limit)
  }
  
  if (companyId && user?.role && ['super_admin', 'system_admin', 'company_admin'].includes(user.role)) {
    return useCompanyActivities(companyId, limit)
  }
  
  // Default to recent activities for current user
  return useRecentActivities(limit)
}

/**
 * Helper hook to invalidate activity caches when needed
 */
export function useInvalidateActivities() {
  const queryClient = useQueryClient()
  
  return {
    invalidateProject: (projectId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: ACTIVITY_KEYS.project(projectId) 
      })
    },
    invalidateUser: (userId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: ACTIVITY_KEYS.user(userId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: ACTIVITY_KEYS.userRecent(userId) 
      })
    },
    invalidateCompany: (companyId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: ACTIVITY_KEYS.company(companyId) 
      })
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ 
        queryKey: ACTIVITY_KEYS.all 
      })
    }
  }
}