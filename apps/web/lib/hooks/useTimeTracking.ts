import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionAwareQuery } from './useSessionAwareQuery'
import { useAuth } from './useAuth'
import { 
  getTimeEntriesByTicket, 
  getTimeEntriesByUser, 
  createTimeEntry, 
  updateTimeEntry, 
  deleteTimeEntry, 
  getActiveTimeEntry,
  getTotalTimeByTicket,
  getTotalTimeByUser
} from '@/lib/db/service'
import type { NewTimeEntry } from '@/lib/db/schema'

// Query keys
export const timeEntryKeys = {
  all: ['timeEntries'] as const,
  byTicket: (ticketId: string) => [...timeEntryKeys.all, 'ticket', ticketId] as const,
  byUser: (userId: string) => [...timeEntryKeys.all, 'user', userId] as const,
  active: (userId: string) => [...timeEntryKeys.all, 'active', userId] as const,
  totalByTicket: (ticketId: string) => [...timeEntryKeys.all, 'total', 'ticket', ticketId] as const,
  totalByUser: (userId: string, dateFrom?: string, dateTo?: string) => [
    ...timeEntryKeys.all, 'total', 'user', userId, dateFrom, dateTo
  ] as const,
}

// Get time entries for a specific ticket
export function useTimeEntriesByTicket(ticketId: string) {
  return useSessionAwareQuery({
    queryKey: timeEntryKeys.byTicket(ticketId),
    queryFn: () => getTimeEntriesByTicket(ticketId),
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Get time entries for current user
export function useTimeEntriesByUser(limit?: number) {
  const { user } = useAuth()
  
  return useSessionAwareQuery({
    queryKey: timeEntryKeys.byUser(user?.id || ''),
    queryFn: () => getTimeEntriesByUser(user?.id || '', limit),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Get active time entry for current user
export function useActiveTimeEntry() {
  const { user } = useAuth()
  
  return useSessionAwareQuery({
    queryKey: timeEntryKeys.active(user?.id || ''),
    queryFn: () => getActiveTimeEntry(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 10, // 10 seconds (active timer changes frequently)
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  })
}

// Get total time for a ticket
export function useTotalTimeByTicket(ticketId: string) {
  return useSessionAwareQuery({
    queryKey: timeEntryKeys.totalByTicket(ticketId),
    queryFn: () => getTotalTimeByTicket(ticketId),
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Get total time for current user
export function useTotalTimeByUser(dateFrom?: string, dateTo?: string) {
  const { user } = useAuth()
  
  return useSessionAwareQuery({
    queryKey: timeEntryKeys.totalByUser(user?.id || '', dateFrom, dateTo),
    queryFn: () => getTotalTimeByUser(user?.id || '', dateFrom, dateTo),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Create time entry mutation
export function useCreateTimeEntry() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: (data: NewTimeEntry) => createTimeEntry(data),
    onSuccess: (data) => {
      // Invalidate and refetch time entries
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.byTicket(data.ticket_id) })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.byUser(user?.id || '') })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.active(user?.id || '') })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.totalByTicket(data.ticket_id) })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.totalByUser(user?.id || '') })
      
      // Invalidate billing reports to update dashboard stats
      queryClient.invalidateQueries({ queryKey: ['billing-report'] })
    },
  })
}

// Update time entry mutation
export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewTimeEntry> }) => 
      updateTimeEntry(id, data),
    onSuccess: (data) => {
      // Invalidate and refetch time entries
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.byTicket(data.ticket_id) })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.byUser(user?.id || '') })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.active(user?.id || '') })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.totalByTicket(data.ticket_id) })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.totalByUser(user?.id || '') })
      
      // Invalidate billing reports to update dashboard stats
      queryClient.invalidateQueries({ queryKey: ['billing-report'] })
    },
  })
}

// Delete time entry mutation
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: (id: string) => deleteTimeEntry(id),
    onSuccess: () => {
      // Invalidate all time entry queries
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all })
      
      // Invalidate billing reports to update dashboard stats
      queryClient.invalidateQueries({ queryKey: ['billing-report'] })
    },
  })
}
