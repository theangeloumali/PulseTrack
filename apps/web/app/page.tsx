import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export default async function Page() {
  // Check if this is a password reset flow
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handle cookie errors
          }
        },
      },
    }
  )

  // Check if user just came from a password reset link
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    // Check if this is a fresh session that might be from password reset
    // For now, redirect authenticated users from root to dashboard
    redirect('/dashboard')
  } else {
    // No user, redirect to login
    redirect('/login')
  }
}
