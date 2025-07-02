import { useSessionAwareQuery } from './useSessionAwareQuery'
import { useAuthStore } from '@/lib/stores/auth'
import { getApiPath } from '@/lib/utils'

export interface CompanyStats {
  users: {
    total: number
    active: number
    admins: number
  }
  projects: {
    total: number
    active: number
  }
  tickets: {
    total: number
    inProgress: number
    done: number
  }
}

export interface SuperAdminCompany {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
  stats: CompanyStats
}

// Query keys
export const superAdminCompanyKeys = {
  all: ['superAdminCompanies'] as const,
  list: () => [...superAdminCompanyKeys.all, 'list'] as const,
}

// Get all companies with statistics (super admin only)
export function useSuperAdminCompanies() {
  const { user } = useAuthStore()
  
  return useSessionAwareQuery({
    queryKey: superAdminCompanyKeys.list(),
    queryFn: async (): Promise<SuperAdminCompany[]> => {
      const response = await fetch(getApiPath('admin/companies'))
      if (!response.ok) {
        throw new Error('Failed to fetch companies')
      }
      return response.json()
    },
    enabled: !!user && user.role === 'super_admin',
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}