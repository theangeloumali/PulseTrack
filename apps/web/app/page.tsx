import {redirect} from 'next/navigation';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';

export default async function Page() {
  // Handles the root / path — always redirect based on auth status

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options));
          } catch {
            // Handle cookie errors gracefully
          }
        },
      },
    },
  );

  try {
    // Check if user is authenticated
    const {
      data: {user},
      error,
    } = await supabase.auth.getUser();

    // If there's an auth error or no user, redirect to login
    if (error || !user) {
      console.log('Root page: No authenticated user, redirecting to login');
      redirect('/login');
    }

    // User is authenticated, redirect to dashboard
    console.log('Root page: User authenticated, redirecting to dashboard');
    redirect('/dashboard');
  } catch (error) {
    // On any error, default to login
    console.error('Root page: Error checking auth status:', error);
    redirect('/login');
  }
}
