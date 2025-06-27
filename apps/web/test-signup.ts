// Test signup functionality
import { supabase } from '@/lib/supabase/client'

async function testSignup() {
  console.log('Testing signup functionality...')
  
  try {
    // Test signup with email/password
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123',
      options: {
        data: {
          firstName: 'Test',
          lastName: 'User',
          companyName: 'Test Company',
          companySlug: 'test-company',
          role: 'admin'
        }
      }
    })
    
    if (error) {
      console.error('Signup error:', error.message)
      return
    }
    
    console.log('Signup successful:', data)
    
    // Test if we can list companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
    
    if (companiesError) {
      console.error('Companies error:', companiesError.message)
    } else {
      console.log('Companies:', companies)
    }
    
  } catch (err) {
    console.error('Test error:', err)
  }
}

// Run the test
testSignup().then(() => {
  console.log('Test completed')
})
