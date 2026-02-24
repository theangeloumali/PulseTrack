import {createServerClient} from '@supabase/ssr';
import {NextRequest, NextResponse} from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({name, value, options}) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  try {
    const {
      data: {user},
      error: userError,
    } = await supabase.auth.getUser();

    // If there's an error getting user, log it but don't immediately redirect
    // unless it's clearly an auth error
    if (userError) {
      console.warn('Middleware - Error getting user:', userError);
      // Only redirect for clear auth errors, not network issues
      const isAuthError =
        userError.message?.includes('JWT') ||
        userError.message?.includes('token') ||
        userError.message?.includes('expired');
      if (!isAuthError) {
        return supabaseResponse;
      }
    }

    // Special handling for root path — authenticated users go to dashboard,
    // unauthenticated users see the landing page (no redirect to /login)
    const isRootPath = request.nextUrl.pathname === '/';
    if (isRootPath && user) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    // For API routes, don't redirect to login - let them handle their own auth
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
    if (isApiRoute) {
      return supabaseResponse;
    }

    // Only redirect for specific protected routes to reduce flash effect
    // Let client-side AuthGate handle most route protection for smoother UX
    const specificProtectedRoutes = ['/admin', '/settings'];
    const needsProtection = specificProtectedRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route),
    );

    if (!user && needsProtection) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error('Middleware - Unexpected error:', error);

    // For API routes, don't redirect to login even on error
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
    if (isApiRoute) {
      return supabaseResponse;
    }

    // For auth routes, allow them through even on error
    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/');
    if (isAuthRoute) {
      return supabaseResponse;
    }

    // If there's an unexpected error on other routes, redirect to login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse;
}
