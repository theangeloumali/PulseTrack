export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          role: 'admin' | 'manager' | 'user'
          company_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'manager' | 'user'
          company_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'manager' | 'user'
          company_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: 'active' | 'archived' | 'completed'
          company_id: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: 'active' | 'archived' | 'completed'
          company_id: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: 'active' | 'archived' | 'completed'
          company_id?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'new' | 'in_progress' | 'review' | 'done'
          priority: 'low' | 'medium' | 'high' | 'critical'
          project_id: string
          assigned_to: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'new' | 'in_progress' | 'review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          project_id: string
          assigned_to?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: 'new' | 'in_progress' | 'review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          project_id?: string
          assigned_to?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          start_time: string
          end_time: string | null
          duration: number | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          start_time: string
          end_time?: string | null
          duration?: number | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          start_time?: string
          end_time?: string | null
          duration?: number | null
          description?: string | null
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'user'
      project_status: 'active' | 'archived' | 'completed'
      ticket_status: 'new' | 'in_progress' | 'review' | 'done'
      ticket_priority: 'low' | 'medium' | 'high' | 'critical'
    }
  }
}

export type Company = Database['public']['Tables']['companies']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Ticket = Database['public']['Tables']['tickets']['Row']
export type TimeEntry = Database['public']['Tables']['time_entries']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']

export type CreateCompany = Database['public']['Tables']['companies']['Insert']
export type CreateUser = Database['public']['Tables']['users']['Insert']
export type CreateProject = Database['public']['Tables']['projects']['Insert']
export type CreateTicket = Database['public']['Tables']['tickets']['Insert']
export type CreateTimeEntry = Database['public']['Tables']['time_entries']['Insert']
export type CreateComment = Database['public']['Tables']['comments']['Insert']

export type UpdateCompany = Database['public']['Tables']['companies']['Update']
export type UpdateUser = Database['public']['Tables']['users']['Update']
export type UpdateProject = Database['public']['Tables']['projects']['Update']
export type UpdateTicket = Database['public']['Tables']['tickets']['Update']
export type UpdateTimeEntry = Database['public']['Tables']['time_entries']['Update']
export type UpdateComment = Database['public']['Tables']['comments']['Update']
