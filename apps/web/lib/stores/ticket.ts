import {create} from 'zustand';
import {devtools} from 'zustand/middleware';

// Zustand store for CLIENT-SIDE ticket state only
// Server state is managed by TanStack React Query
interface TicketState {
  // UI State
  selectedTicketId: string | null;
  filters: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    projectId?: string;
  };
  sortBy: 'created_at' | 'updated_at' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';

  // Actions
  setSelectedTicketId: (ticketId: string | null) => void;
  setFilters: (filters: Partial<TicketState['filters']>) => void;
  resetFilters: () => void;
  setSortBy: (sortBy: TicketState['sortBy']) => void;
  setSortOrder: (sortOrder: TicketState['sortOrder']) => void;
  resetState: () => void;
}

const initialState = {
  selectedTicketId: null,
  filters: {},
  sortBy: 'created_at' as const,
  sortOrder: 'desc' as const,
};

export const useTicketStore = create<TicketState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setSelectedTicketId: (ticketId) => set({selectedTicketId: ticketId}),
      setFilters: (filters) => set({filters: {...get().filters, ...filters}}),
      resetFilters: () => set({filters: {}}),
      setSortBy: (sortBy) => set({sortBy}),
      setSortOrder: (sortOrder) => set({sortOrder}),
      resetState: () => set(initialState),
    }),
    {
      name: 'ticket-store',
    },
  ),
);
