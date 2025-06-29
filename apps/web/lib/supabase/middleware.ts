import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
			},
		},
	});

	// IMPORTANT: Avoid writing any logic between createServerClient and
	// supabase.auth.getUser(). A simple mistake could make it very hard to debug
	// issues with users being randomly logged out.

	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		console.log('Middleware - Path:', request.nextUrl.pathname, 'User:', user?.id || 'No user');
		console.log('Middleware - Full URL:', request.url);
		console.log('Middleware - Query params:', request.nextUrl.searchParams.toString());
		
		// Check each path condition individually for debugging
		const isLogin = request.nextUrl.pathname.startsWith('/login')
		const isSignup = request.nextUrl.pathname.startsWith('/signup') 
		const isVerifyEmail = request.nextUrl.pathname.startsWith('/verify-email')
		const isAuthDiagnostic = request.nextUrl.pathname.startsWith('/auth-diagnostic')
		const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback')
		const isRecoveryCallback = request.nextUrl.pathname.startsWith('/auth/callback/recovery')
		const isAcceptInvitation = request.nextUrl.pathname.startsWith('/auth/accept-invitation')
		const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/')
		const isForgotPassword = request.nextUrl.pathname.startsWith('/forgot-password')
		const isResetPassword = request.nextUrl.pathname.startsWith('/reset-password')
		
		console.log('Middleware - Path checks:', {
			isLogin, isSignup, isVerifyEmail, isAuthDiagnostic, isAuthCallback, isRecoveryCallback, isAcceptInvitation, isAuthRoute, isForgotPassword, isResetPassword
		})
		
		// For API routes, don't redirect to login - let them handle their own auth
		const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
		
		if (isApiRoute) {
			console.log('Middleware - API route detected, skipping auth redirect')
			return supabaseResponse
		}

		if (!user && !isLogin && !isSignup && !isVerifyEmail && !isAuthDiagnostic && !isAuthRoute && !isForgotPassword && !isResetPassword) {
			console.log('Middleware - Redirecting to login, no user found for path:', request.nextUrl.pathname);
			// no user, redirect to login page
			const url = request.nextUrl.clone();
			url.pathname = '/login';
			return NextResponse.redirect(url);
		}
	} catch (error) {
		console.error('Middleware - Unexpected error:', error);
		
		// For API routes, don't redirect to login even on error
		const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
		if (isApiRoute) {
			console.log('Middleware - API route error, returning response without redirect')
			return supabaseResponse
		}
		
		// For auth routes, allow them through even on error
		const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/')
		if (isAuthRoute) {
			console.log('Middleware - Auth route error, allowing through')
			return supabaseResponse
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
