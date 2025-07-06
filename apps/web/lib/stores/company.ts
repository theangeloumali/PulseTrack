import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Company, User } from "@/lib/db/schema";

export interface CompanyUser extends User {
  invited_by_user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

interface CompanyState {
  // Company data
  company: Company | null;
  isLoading: boolean;

  // User management
  users: CompanyUser[];
  selectedUser: CompanyUser | null;
  usersLoading: boolean;
  usersError: string | null;

  // Filters and UI state
  roleFilter:
    | "all"
    | "super_admin"
    | "system_admin"
    | "company_admin"
    | "manager"
    | "user";
  statusFilter: "all" | "active" | "inactive";
  searchQuery: string;

  // Company actions
  setCompany: (company: Company | null) => void;
  setIsLoading: (loading: boolean) => void;

  // User management actions
  setUsers: (users: CompanyUser[]) => void;
  setSelectedUser: (user: CompanyUser | null) => void;
  setUsersLoading: (loading: boolean) => void;
  setUsersError: (error: string | null) => void;
  setRoleFilter: (
    filter:
      | "all"
      | "super_admin"
      | "system_admin"
      | "company_admin"
      | "manager"
      | "user",
  ) => void;
  setStatusFilter: (filter: "all" | "active" | "inactive") => void;
  setSearchQuery: (query: string) => void;

  // Computed getters
  getFilteredUsers: () => CompanyUser[];
  getUserStats: () => {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    managers: number;
    users: number;
  };
}

export const useCompanyStore = create<CompanyState>()(
  devtools(
    (set, get) => ({
      // Company state
      company: null,
      isLoading: true,

      // User management state
      users: [],
      selectedUser: null,
      usersLoading: false,
      usersError: null,
      roleFilter: "all",
      statusFilter: "all",
      searchQuery: "",

      // Company actions
      setCompany: (company) => set({ company }),
      setIsLoading: (loading) => set({ isLoading: loading }),

      // User management actions
      setUsers: (users) => set({ users }),
      setSelectedUser: (user) => set({ selectedUser: user }),
      setUsersLoading: (loading) => set({ usersLoading: loading }),
      setUsersError: (error) => set({ usersError: error }),
      setRoleFilter: (filter) => set({ roleFilter: filter }),
      setStatusFilter: (filter) => set({ statusFilter: filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Computed getters
      getFilteredUsers: () => {
        const { users, roleFilter, statusFilter, searchQuery } = get();

        return users.filter((user) => {
          // Role filter
          if (roleFilter !== "all" && user.role !== roleFilter) {
            return false;
          }

          // Status filter
          if (statusFilter !== "all" && user.status !== statusFilter) {
            return false;
          }

          // Search query
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const fullName =
              `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
            const email = user.email.toLowerCase();

            if (!fullName.includes(query) && !email.includes(query)) {
              return false;
            }
          }

          return true;
        });
      },

      getUserStats: () => {
        const { users } = get();

        return {
          total: users.length,
          active: users.filter((u) => u.status === "active").length,
          inactive: users.filter((u) => u.status === "inactive").length,
          admins: users.filter((u) =>
            ["super_admin", "system_admin", "company_admin"].includes(u.role),
          ).length,
          managers: users.filter((u) => u.role === "manager").length,
          users: users.filter((u) => u.role === "user").length,
        };
      },
    }),
    {
      name: "company-store",
    },
  ),
);
