import { createClient } from '@/lib/supabase/client'
import type { CreateUser, CreateCompany } from '@/lib/types/database'
import { generateSlug } from '@/lib/utils'

export async function ensureUserRecord(authUser: any) {
  const supabase = createClient()
  
  // First check if user already exists in our users table
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (existingUser) {
    return existingUser
  }

  // User doesn't exist in our table, need to create it
  // For users not created through our signup flow, we'll need to handle this case
  
  // Check if they have metadata from our signup flow
  const metadata = authUser.user_metadata || {}
  
  if (metadata.companyName) {
    // User was created through our signup flow but trigger might have failed
    return await createUserFromMetadata(authUser, metadata)
  } else {
    // User was created outside our signup flow (e.g., directly in Supabase)
    // We need to handle this case - either create a default company or require them to complete setup
    throw new Error('User record incomplete. Please complete your profile setup.')
  }
}

async function createUserFromMetadata(authUser: any, metadata: any) {
  const supabase = createClient()
  
  // Check if company exists
  let companyId: string
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', metadata.companySlug)
    .single()

  if (existingCompany) {
    companyId = existingCompany.id
  } else {
    // Create company
    const companyData: CreateCompany = {
      name: metadata.companyName,
      slug: metadata.companySlug || generateSlug(metadata.companyName),
    }

    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert(companyData)
      .select()
      .single()

    if (companyError || !newCompany) {
      throw new Error('Failed to create company: ' + companyError?.message)
    }

    companyId = newCompany.id
  }

  // Create user record
  const userData: CreateUser = {
    id: authUser.id,
    email: authUser.email,
    first_name: metadata.firstName || null,
    last_name: metadata.lastName || null,
    role: metadata.role || 'user',
    company_id: companyId,
  }

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single()

  if (userError || !newUser) {
    throw new Error('Failed to create user record: ' + userError?.message)
  }

  return newUser
}
