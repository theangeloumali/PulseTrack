import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { TimeEntry } from "@/lib/types/database";

interface TimeTrackingState {
  timeEntries: TimeEntry[];
  activeTimer: {
    ticketId: string;
    startTime: string;
    description?: string;
  } | null;
  isLoading: boolean;
  setTimeEntries: (entries: TimeEntry[]) => void;
  addTimeEntry: (entry: TimeEntry) => void;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void;
  removeTimeEntry: (id: string) => void;
  startTimer: (ticketId: string, description?: string) => void;
  stopTimer: () => void;
  setIsLoading: (loading: boolean) => void;
}

export const useTimeTrackingStore = create<TimeTrackingState>()(
  devtools(
    (set, get) => ({
      timeEntries: [],
      activeTimer: null,
      isLoading: false,
      setTimeEntries: (entries) => set({ timeEntries: entries }),
      addTimeEntry: (entry) =>
        set({ timeEntries: [...get().timeEntries, entry] }),
      updateTimeEntry: (id, updates) =>
        set({
          timeEntries: get().timeEntries.map((e) =>
            e.id === id ? { ...e, ...updates } : e,
          ),
        }),
      removeTimeEntry: (id) =>
        set({
          timeEntries: get().timeEntries.filter((e) => e.id !== id),
        }),
      startTimer: (ticketId, description) =>
        set({
          activeTimer: {
            ticketId,
            startTime: new Date().toISOString(),
            description,
          },
        }),
      stopTimer: () => set({ activeTimer: null }),
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "time-tracking-store",
    },
  ),
);
