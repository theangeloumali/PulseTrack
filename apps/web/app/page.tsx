import {redirect} from 'next/navigation';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {LandingScreen} from '@/screens/landing';

export default async function Page() {
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
            // Handle cookie errors gracefully in Server Components
          }
        },
      },
    },
  );

  try {
    const {
      data: {user},
    } = await supabase.auth.getUser();

    // Authenticated users go straight to dashboard
    if (user) {
      redirect('/dashboard');
    }
  } catch {
    // On error, fall through and show the landing page
  }

  return <LandingScreen />;
}
