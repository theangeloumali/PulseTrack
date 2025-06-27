import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { getUsersInCompany } from '@/lib/db/service'

// Query keys
export const userKeys = {
  all: ['users'] as const,
  byCompany: (companyId: string) => [...userKeys.all, 'company', companyId] as const,
}

// Get users in the current user's company (for assignment)
export function useUsersInCompany() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: userKeys.byCompany(user?.company_id || ''),
    queryFn: () => getUsersInCompany(user?.company_id || ''),
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 10, // 10 minutes (users don't change often)
  })
}
