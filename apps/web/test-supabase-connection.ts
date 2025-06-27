import { supabase } from './lib/supabase/client'

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...')
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('companies').select('count(*)')
    
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    
    console.log('✅ Supabase connection successful:', data)
    return true
  } catch (err) {
    console.error('❌ Supabase connection failed:', err)
    return false
  }
}

async function testSignup() {
  console.log('Testing signup...')
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123',
    })
    
    if (error) {
      console.error('❌ Signup error:', error)
      return false
    }
    
    console.log('✅ Signup successful:', data)
    return true
  } catch (err) {
    console.error('❌ Signup failed:', err)
    return false
  }
}

// Run tests
testSupabaseConnection().then(connectionOk => {
  if (connectionOk) {
    testSignup()
  }
})
