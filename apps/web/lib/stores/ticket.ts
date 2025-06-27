import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Ticket } from '@/lib/types/database'

interface TicketState {
  tickets: Ticket[]
  selectedTicket: Ticket | null
  isLoading: boolean
  filters: {
    status?: string
    priority?: string
    assignedTo?: string
    projectId?: string
  }
  setTickets: (tickets: Ticket[]) => void
  setSelectedTicket: (ticket: Ticket | null) => void
  addTicket: (ticket: Ticket) => void
  updateTicket: (id: string, updates: Partial<Ticket>) => void
  removeTicket: (id: string) => void
  setIsLoading: (loading: boolean) => void
  setFilters: (filters: Partial<TicketState['filters']>) => void
  resetFilters: () => void
}

export const useTicketStore = create<TicketState>()(
  devtools(
    (set, get) => ({
      tickets: [],
      selectedTicket: null,
      isLoading: false,
      filters: {},
      setTickets: (tickets) => set({ tickets }),
      setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
      addTicket: (ticket) => set({ tickets: [...get().tickets, ticket] }),
      updateTicket: (id, updates) => 
        set({ 
          tickets: get().tickets.map(t => 
            t.id === id ? { ...t, ...updates } : t
          )
        }),
      removeTicket: (id) => 
        set({ 
          tickets: get().tickets.filter(t => t.id !== id),
          selectedTicket: get().selectedTicket?.id === id ? null : get().selectedTicket
        }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      resetFilters: () => set({ filters: {} }),
    }),
    {
      name: 'ticket-store',
    }
  )
)
