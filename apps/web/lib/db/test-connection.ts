import { supabase } from '@/lib/db'

export async function testConnection() {
  try {
    // Simple test query using Supabase client
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, slug, created_at')
      .limit(1)
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error
    }
    
    console.log('✅ Database connection successful')
    return { success: true, result: data }
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
