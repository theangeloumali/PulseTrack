import { createClient } from '@supabase/supabase-js'

// Create Supabase client - works in both browser and server environments
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and key are required')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

// Export Supabase client instance
export const supabase = createSupabaseClient()

// Re-export all types from schema for convenience
export * from './schema'

// Type for the Supabase client
export type SupabaseClient = ReturnType<typeof createSupabaseClient>
