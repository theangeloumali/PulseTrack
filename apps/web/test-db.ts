// Test database connection and tables
import { supabase } from '@/lib/supabase/client'

async function testDatabase() {
  console.log('Testing database connection...')
  
  // Test companies table
  const { data: companiesData, error: companiesError } = await supabase
    .from('companies')
    .select('count', { count: 'exact', head: true })
  
  console.log('Companies table:', companiesError ? 'ERROR: ' + companiesError.message : 'SUCCESS')
  
  // Test users table  
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('count', { count: 'exact', head: true })
  
  console.log('Users table:', usersError ? 'ERROR: ' + usersError.message : 'SUCCESS')
  
  // Test auth user creation
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'testpassword123',
    options: {
      data: {
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company',
        companySlug: 'test-company'
      }
    }
  })
  
  console.log('Auth signup test:', authError ? 'ERROR: ' + authError.message : 'SUCCESS')
  
  if (authData.user && !authError) {
    // Clean up test user
    await supabase.auth.admin.deleteUser(authData.user.id)
  }
}

testDatabase().catch(console.error)
