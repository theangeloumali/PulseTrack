import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Company } from '@/lib/types/database'

interface CompanyState {
  company: Company | null
  isLoading: boolean
  setCompany: (company: Company | null) => void
  setIsLoading: (loading: boolean) => void
}

export const useCompanyStore = create<CompanyState>()(
  devtools(
    (set) => ({
      company: null,
      isLoading: true,
      setCompany: (company) => set({ company }),
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'company-store',
    }
  )
)
