import { supabase } from '@/lib/supabase/client'
import type { NewCompany, NewUser } from '@/lib/db/schema'
import { generateSlug } from '@/lib/utils'

export async function ensureUserRecord(authUser: any) {
  // First check if user already exists in our users table
  const { data: existingUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (existingUser && !error) {
    return existingUser
  }

  // User doesn't exist in our table, need to create it
  // Check if they have metadata from our signup flow
  const metadata = authUser.user_metadata || {}
  
  if (metadata.companyName) {
    // User was created through our signup flow but trigger might have failed
    return await createUserFromMetadata(authUser, metadata)
  } else {
    // User was created outside our signup flow (e.g., directly in Supabase)
    throw new Error('User record incomplete. Please complete your profile setup.')
  }
}

async function createUserFromMetadata(authUser: any, metadata: any) {
  // Check if company exists
  let companyId: string
  const { data: existingCompany, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', metadata.companySlug)
    .single()

  if (existingCompany && !companyError) {
    companyId = existingCompany.id
  } else {
    // Create company
    const companyData: NewCompany = {
      name: metadata.companyName,
      slug: metadata.companySlug || generateSlug(metadata.companyName),
    }

    const { data: newCompany, error: createCompanyError } = await supabase
      .from('companies')
      .insert(companyData)
      .select()
      .single()

    if (createCompanyError || !newCompany) {
      throw new Error('Failed to create company: ' + createCompanyError?.message)
    }

    companyId = newCompany.id
  }

  // Create user record
  const userData: NewUser = {
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

export async function createUserFromSignup(authUser: any, userData: {
  firstName: string
  lastName: string
  companyName?: string
  companySlug?: string
  role?: 'admin' | 'manager' | 'user'
}) {
  if (!userData.companyName || !userData.companySlug) {
    throw new Error('Company information is required for signup')
  }

  // Check if company already exists
  let companyId: string
  const { data: existingCompany, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', userData.companySlug)
    .single()

  if (existingCompany && !companyError) {
    companyId = existingCompany.id
  } else {
    // Create company
    const companyData: NewCompany = {
      name: userData.companyName,
      slug: userData.companySlug,
    }

    const { data: newCompany, error: createCompanyError } = await supabase
      .from('companies')
      .insert(companyData)
      .select()
      .single()

    if (createCompanyError || !newCompany) {
      throw new Error('Database error creating company: ' + createCompanyError?.message)
    }

    companyId = newCompany.id
  }

  // Create user record
  const userRecord: NewUser = {
    id: authUser.id,
    email: authUser.email,
    first_name: userData.firstName || null,
    last_name: userData.lastName || null,
    role: userData.role || 'user',
    company_id: companyId,
  }

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert(userRecord)
    .select()
    .single()

  if (userError || !newUser) {
    throw new Error('Database error saving new user: ' + userError?.message)
  }

  return newUser
}
